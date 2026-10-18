/**
 * SourceDeck domain operations. Pure over a `DeckStore` surface so the same
 * logic runs against the storage domain and against an in-memory test store.
 */
import { dedupeKey } from './dedupe.ts'
import { buildPrompt } from './prompt.ts'
import { buildSearchPrompt } from './search-prompt.ts'
import { withStoreLock } from './store-lock.ts'
import {
  computeFlags, DEFAULT_POLICY, normalizePolicy, policySummary,
  type ScopePolicy,
} from './scope-policy.ts'
import {
  newId,
  type CandidateRecord, type DeckStore, type FavoriteRecord, type Origin, type RoundRecord,
  type SelectionRecord, type SessionActiveRecord, type SetRecord, type SourceRecord, type Verdict,
} from './model.ts'

/** One policy record as stored. */
export interface StoredPolicy extends ScopePolicy {
  readonly createdAt: string
  readonly updatedAt: string
}

/** The policy key every session reads until per-session overrides exist. */
const POLICY_KEY = 'default'

/** Input for adding one manual or agent-provided source. */
export interface AddSourceInput {
  readonly sessionId: string
  readonly origin: Origin
  readonly title?: string
  readonly url?: string
  readonly note?: string
  readonly snippet?: string
  readonly contentRef?: unknown
  readonly meta?: SourceRecord['meta']
  readonly target?: { readonly setId: string; readonly roundId?: string }
}

/** Result of adding a source. */
export interface AddSourceResult {
  readonly setId: string
  readonly sourceId: string
  readonly candidateId: string
  readonly duplicate: boolean
  readonly policyFlags: readonly string[]
}

/** One candidate with its source, as rendered by the deck. */
export interface CandidateView {
  readonly candidateId: string
  readonly candidate: CandidateRecord
  readonly source: SourceRecord
}

/** One round with its record identity. */
export interface RoundView {
  readonly roundId: string
  readonly round: RoundRecord
}

/** One set with its rounds and candidates. */
export interface SetView {
  readonly setId: string
  readonly set: SetRecord
  readonly rounds: readonly RoundView[]
  readonly candidates: readonly CandidateView[]
}

/** Input for starting one search round. */
export interface StartRoundInput {
  readonly sessionId: string
  readonly request: string
  readonly note?: string
  /** Compact recap of the current conversation. */
  readonly conversation?: string
  readonly setId?: string
}

/** Result of starting one search round. */
export interface StartRoundResult {
  readonly roundId: string
  readonly round: RoundRecord
  readonly view: SetView
  readonly promptText: string
}

/** One favorite as rendered by the library. */
export interface FavoriteView {
  readonly favoriteId: string
  readonly favorite: FavoriteRecord
}

/** Result of a submission. */
export interface CommitResult {
  readonly selectionId: string
  readonly promptText: string
  readonly kept: readonly string[]
  readonly excluded: readonly { readonly candidateId: string; readonly reason?: string }[]
  readonly requestId: string
  readonly deliveryStatus: 'pending' | 'sent' | 'failed'
}

const now = (): string => new Date().toISOString()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function findEntry<T>(store: DeckStore, table: string, predicate: (value: T) => boolean): [string, T] | undefined {
  for (const [key, value] of store.entries(table)) {
    if (isRecord(value) && predicate(value as T)) return [key, value as T]
  }
  return undefined
}

function requiredSet(store: DeckStore, setId: string): SetRecord {
  const value = store.get('sets', setId)
  if (!isRecord(value)) throw new Error(`deck set ${setId} was not found`)
  return value as unknown as SetRecord
}

function activeSetId(store: DeckStore, sessionId: string): string | undefined {
  const value = store.get('session_active', sessionId)
  if (!isRecord(value)) return undefined
  return (value as unknown as SessionActiveRecord).setId
}

/**
 * Read the active source-scope policy, falling back to the first-run default.
 * @param store - deck store.
 * @returns the stored policy or the default.
 */
export async function getPolicy(store: DeckStore): Promise<StoredPolicy> {
  const value = store.get('scope_policies', POLICY_KEY)
  if (isRecord(value)) return value as unknown as StoredPolicy
  const created = now()
  return { ...DEFAULT_POLICY, createdAt: created, updatedAt: created }
}

/**
 * Validate and persist the active policy.
 * @param store - deck store.
 * @param input - policy payload from settings.
 * @returns the stored policy.
 */
export async function setPolicy(store: DeckStore, input: unknown): Promise<StoredPolicy> {
  const normalized = normalizePolicy(input)
  const existing = store.get('scope_policies', POLICY_KEY)
  const createdAt = isRecord(existing) && typeof existing.createdAt === 'string' ? existing.createdAt : now()
  const stored: StoredPolicy = { ...normalized, createdAt, updatedAt: now() }
  await store.put('scope_policies', POLICY_KEY, stored)
  return stored
}

/**
 * Ensure the session has an open set. A submitted set is complete; adding a
 * source after submission starts a fresh set instead of mutating history.
 * @param store - deck store.
 * @param sessionId - owning session.
 * @param origin - who opened the set when one is created.
 * @returns the active set id.
 */
export async function ensureActiveSet(store: DeckStore, sessionId: string, origin: Origin): Promise<string> {
  const existing = activeSetId(store, sessionId)
  if (existing !== undefined) {
    const current = store.get('sets', existing)
    if (isRecord(current) && (current as unknown as SetRecord).status !== 'submitted') return existing
  }
  return startNewSet(store, sessionId, origin)
}

/**
 * Open a fresh set for one session, replacing the session's active pointer.
 * @param store - deck store.
 * @param sessionId - owning session.
 * @param origin - who opened the set.
 * @returns the new set id.
 */
export async function startNewSet(store: DeckStore, sessionId: string, origin: Origin): Promise<string> {
  const setId = newId('set')
  const set: SetRecord = { sessionId, origin, createdAt: now(), status: 'open' }
  await store.put('sets', setId, set)
  const active: SessionActiveRecord = { setId }
  await store.put('session_active', sessionId, active)
  return setId
}

function roundsOf(store: DeckStore, setId: string): RoundView[] {
  const rounds: RoundView[] = []
  for (const [roundId, value] of store.entries('rounds')) {
    if (!isRecord(value)) continue
    const round = value as unknown as RoundRecord
    if (round.setId === setId) rounds.push({ roundId, round })
  }
  return rounds.sort((left, right) => left.round.index - right.round.index)
}

/**
 * Start one search round for the session's open set and build the prompt that
 * asks the current conversation to search and submit candidates.
 * @param store - deck store.
 * @param input - user request and optional follow-up note.
 * @returns the round, the current view, and the model-facing prompt.
 */
export async function startRound(store: DeckStore, input: StartRoundInput): Promise<StartRoundResult> {
  const request = input.request.trim()
  if (request === '') throw new Error('search request must not be empty')
  const setId = input.setId ?? await ensureActiveSet(store, input.sessionId, 'agent')
  const set = requiredSet(store, setId)
  if (set.sessionId !== input.sessionId) throw new Error('deck set does not belong to this session')
  if (set.status === 'submitted') throw new Error('deck set is submitted')
  const previous = roundsOf(store, setId)
  const round: RoundRecord = {
    setId,
    sessionId: input.sessionId,
    index: previous.length === 0 ? 1 : previous[previous.length - 1]!.round.index + 1,
    request,
    ...(input.note === undefined || input.note.trim() === '' ? {} : { note: input.note.trim() }),
    createdAt: now(),
  }
  const roundId = newId('round')
  await store.put('rounds', roundId, round)
  await store.put('session_active', input.sessionId, { setId, roundId })
  const view = await getSet(store, setId)
  return { roundId, round, view, promptText: buildSearchPrompt({ round, view, ...(input.conversation === undefined ? {} : { conversation: input.conversation }) }) }
}

/**
 * Add one source and its pending candidate, deduplicating on the normalized key.
 * @param store - deck store.
 * @param input - source facts.
 * @returns the set/source/candidate identities and whether the candidate already existed.
 */
export async function addSource(store: DeckStore, input: AddSourceInput): Promise<AddSourceResult> {
  const key = dedupeKey({ url: input.url, title: input.title })
  const policy = await getPolicy(store)
  const policyFlags = computeFlags(policy, input.meta ?? {}, input.url)
  const setId = input.target?.setId ?? await ensureActiveSet(store, input.sessionId, input.origin)
  const set = requiredSet(store, setId)
  if (set.sessionId !== input.sessionId) throw new Error('deck set does not belong to this session')
  if (set.status === 'submitted') throw new Error('deck set is submitted')
  if (input.target?.roundId !== undefined) {
    const round = store.get('rounds', input.target.roundId) as RoundRecord | undefined
    if (!round || round.setId !== setId || round.sessionId !== input.sessionId) throw new Error('round does not belong to this set')
    if (round.status !== undefined && round.status !== 'starting' && round.status !== 'running') throw new Error('research round is closed')
  }
  const existingSource = findEntry<SourceRecord>(store, 'sources', source => source.dedupeKey === key)
  let sourceId: string
  if (existingSource === undefined) {
    sourceId = newId('src')
    const source: SourceRecord = {
      ...(input.url === undefined ? {} : { url: input.url }),
      title: (input.title ?? input.url ?? '').trim(),
      ...(input.note === undefined ? {} : { note: input.note }),
      ...(input.snippet === undefined ? {} : { snippet: input.snippet }),
      ...(input.contentRef === undefined ? {} : { contentRef: input.contentRef }),
      origin: input.origin,
      dedupeKey: key,
      createdAt: now(),
      ...(input.meta === undefined ? {} : { meta: input.meta }),
    }
    await store.put('sources', sourceId, source)
  } else {
    sourceId = existingSource[0]
  }
  const existingCandidate = findEntry<CandidateRecord>(store, 'candidates', candidate =>
    candidate.setId === setId && candidate.sourceId === sourceId)
  if (existingCandidate !== undefined) {
    return {
      setId,
      sourceId,
      candidateId: existingCandidate[0],
      duplicate: true,
      policyFlags: existingCandidate[1].policyFlags ?? [],
    }
  }
  const candidateId = newId('cand')
  const active = store.get('session_active', input.sessionId)
  const legacyRoundId = isRecord(active) && typeof active.roundId === 'string' ? active.roundId : undefined
  const legacyRound = legacyRoundId === undefined ? undefined : store.get('rounds', legacyRoundId) as RoundRecord | undefined
  const roundId = input.target?.roundId ?? (input.target === undefined && legacyRound?.workerSessionId === undefined ? legacyRoundId : undefined)
  const candidate: CandidateRecord = {
    setId,
    sourceId,
    verdict: 'pending',
    createdAt: now(),
    ...(roundId === undefined ? {} : { roundId }),
    ...(policyFlags.length === 0 ? {} : { policyFlags }),
  }
  await store.put('candidates', candidateId, candidate)
  return { setId, sourceId, candidateId, duplicate: false, policyFlags }
}

/**
 * Read one set with its candidates and sources.
 * @param store - deck store.
 * @param setId - set identity.
 * @returns the set view.
 */
export async function getSet(store: DeckStore, setId: string): Promise<SetView> {
  const set = requiredSet(store, setId)
  const candidates: CandidateView[] = []
  for (const [key, value] of store.entries('candidates')) {
    if (!isRecord(value)) continue
    const candidate = value as unknown as CandidateRecord
    if (candidate.setId !== setId) continue
    const sourceValue = store.get('sources', candidate.sourceId)
    if (!isRecord(sourceValue)) continue
    candidates.push({
      candidateId: key,
      candidate,
      source: sourceValue as unknown as SourceRecord,
    })
  }
  candidates.sort((left, right) => left.candidate.createdAt.localeCompare(right.candidate.createdAt))
  return { setId, set, rounds: roundsOf(store, setId), candidates }
}

/**
 * Read the current session's active set, creating nothing.
 * @param store - deck store.
 * @param sessionId - owning session.
 * @returns the set view, or undefined when the session has no active set.
 */
export async function getActiveSet(store: DeckStore, sessionId: string): Promise<SetView | undefined> {
  const setId = activeSetId(store, sessionId)
  if (setId === undefined) return undefined
  if (store.get('sets', setId) === undefined) return undefined
  return getSet(store, setId)
}

/**
 * Record one candidate verdict.
 * @param store - deck store.
 * @param input - candidate, verdict, optional reason.
 */
export async function decide(
  store: DeckStore,
  input: { candidateId: string; verdict: Verdict; reason?: string },
): Promise<CandidateRecord> {
  const value = store.get('candidates', input.candidateId)
  if (!isRecord(value)) throw new Error(`deck candidate ${input.candidateId} was not found`)
  const candidate = value as unknown as CandidateRecord
  if (requiredSet(store, candidate.setId).status === 'submitted') throw new Error('deck set is submitted')
  const next: CandidateRecord = {
    ...candidate,
    verdict: input.verdict,
    decidedAt: now(),
    ...(input.reason === undefined ? { reason: undefined } : { reason: input.reason }),
  }
  await store.put('candidates', input.candidateId, next)
  return next
}

/**
 * Persist the selection and return the model-facing summary.
 * @param store - deck store.
 * @param input - session, set, and idempotency request id.
 * @returns the selection and prompt text.
 */
export async function commitSelection(
  store: DeckStore,
  input: { sessionId: string; setId: string; requestId: string },
): Promise<CommitResult> {
  return withStoreLock(store, `selection:${input.sessionId}:${input.setId}`, () => commitSelectionLocked(store, input))
}

async function commitSelectionLocked(store: DeckStore, input: { sessionId: string; setId: string; requestId: string }): Promise<CommitResult> {
  const set = requiredSet(store, input.setId)
  if (set.sessionId !== input.sessionId) throw new Error('deck set does not belong to this session')
  const previous = findEntry<SelectionRecord>(store, 'selections', record => record.sessionId === input.sessionId && record.setId === input.setId
    && record.kind !== 'reference' && (record.requestId === input.requestId || set.status === 'submitted'))
  if (previous) {
    const record = previous[1]
    return { selectionId: previous[0], kept: record.kept, excluded: record.excluded, requestId: record.requestId,
      promptText: record.promptText ?? buildPrompt({ total: record.kept.length + record.excluded.length, kept: (await getSet(store, input.setId)).candidates.filter(c => record.kept.includes(c.candidateId)).map(c => ({ title: c.source.title, url: c.source.url })), excluded: [], policy: policySummary(await getPolicy(store)) }),
      deliveryStatus: record.deliveryStatus ?? 'sent' }
  }
  if (set.status === 'submitted') throw new Error('deck set is submitted')
  const view = await getSet(store, input.setId)
  const kept: string[] = []
  const excluded: { candidateId: string; reason?: string }[] = []
  const promptKept: { title: string; url?: string }[] = []
  const promptExcluded: { title: string; reason?: string }[] = []
  for (const entry of view.candidates) {
    if (entry.candidate.verdict === 'kept') {
      kept.push(entry.candidateId)
      promptKept.push({ title: entry.source.title, ...(entry.source.url === undefined ? {} : { url: entry.source.url }) })
    } else if (entry.candidate.verdict === 'excluded') {
      excluded.push({ ...(entry.candidate.reason === undefined ? {} : { reason: entry.candidate.reason }), candidateId: entry.candidateId })
      promptExcluded.push({ title: entry.source.title, ...(entry.candidate.reason === undefined ? {} : { reason: entry.candidate.reason }) })
    }
  }
  const selectionId = newId('sel')
  const promptText = buildPrompt({ total: view.candidates.length, kept: promptKept, excluded: promptExcluded, policy: policySummary(await getPolicy(store)) })
  const selection: SelectionRecord = {
    setId: input.setId,
    sessionId: input.sessionId,
    kept,
    excluded,
    submittedAt: now(),
    requestId: input.requestId,
    kind: 'submitted', promptText, deliveryStatus: 'pending',
  }
  await store.put('selections', selectionId, selection)
  await store.put('sets', input.setId, { ...set, status: 'submitted' } satisfies SetRecord)
  return {
    selectionId,
    promptText,
    kept,
    excluded,
    requestId: input.requestId,
    deliveryStatus: 'pending',
  }
}

export async function acknowledgeSelection(store: DeckStore, input: { sessionId: string; selectionId: string; status: 'sent' | 'failed' }): Promise<void> {
  const record = store.get('selections', input.selectionId) as SelectionRecord | undefined
  if (!record || record.sessionId !== input.sessionId || record.kind === 'reference') throw new Error('selection does not belong to this session')
  if (record.deliveryStatus === 'sent') return
  await store.put('selections', input.selectionId, { ...record, deliveryStatus: input.status })
}

/**
 * Save one source to the session-independent favorites library.
 * @param store - deck store.
 * @param input - source facts.
 * @returns the favorite identity.
 */
export async function addFavorite(store: DeckStore, input: {
  title: string
  url?: string
  note?: string
  snippet?: string
  meta?: SourceRecord['meta']
}): Promise<FavoriteView> {
  const title = input.title.trim()
  if (title === '' && (input.url === undefined || input.url.trim() === '')) {
    throw new Error('favorite needs a title or url')
  }
  const key = dedupeKey({ url: input.url, title })
  for (const [favoriteId, value] of store.entries('favorites')) {
    if (!isRecord(value)) continue
    const favorite = value as unknown as FavoriteRecord
    if (dedupeKey({ url: favorite.url, title: favorite.title }) === key) return { favoriteId, favorite }
  }
  const favoriteId = newId('fav')
  const favorite: FavoriteRecord = {
    title: title === '' ? (input.url ?? '').trim() : title,
    ...(input.url === undefined ? {} : { url: input.url }),
    ...(input.note === undefined ? {} : { note: input.note }),
    ...(input.snippet === undefined ? {} : { snippet: input.snippet }),
    ...(input.meta === undefined ? {} : { meta: input.meta }),
    addedAt: now(),
  }
  await store.put('favorites', favoriteId, favorite)
  return { favoriteId, favorite }
}

/**
 * List saved sources, newest first.
 * @param store - deck store.
 * @returns the favorites.
 */
export function listFavorites(store: DeckStore): FavoriteView[] {
  const favorites: FavoriteView[] = []
  for (const [favoriteId, value] of store.entries('favorites')) {
    if (!isRecord(value)) continue
    favorites.push({ favoriteId, favorite: value as unknown as FavoriteRecord })
  }
  return favorites.sort((left, right) => right.favorite.addedAt.localeCompare(left.favorite.addedAt))
}

/**
 * Remove one favorite.
 * @param store - deck store.
 * @param favoriteId - favorite identity.
 */
export async function removeFavorite(store: DeckStore, favoriteId: string): Promise<void> {
  await store.delete('favorites', favoriteId)
}

/**
 * Delete every record owned by the deck domain.
 * @param store - deck store.
 */
export async function clearData(store: DeckStore): Promise<void> {
  for (const table of [
    'sets', 'sources', 'candidates', 'selections', 'scope_policies', 'session_active', 'rounds', 'favorites',
  ]) {
    const keys = [...store.entries(table)].map(([key]) => key)
    for (const key of keys) await store.delete(table, key)
  }
}
