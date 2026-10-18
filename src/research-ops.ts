/** Durable research identity. No Agent/runtime objects enter storage. */
import type { DeckStore, ResearchStatus, ResearchTarget, RoundRecord } from './model.ts'
import { getActiveSet, getSet, startNewSet, startRound, type StartRoundInput, type StartRoundResult } from './ops.ts'

export interface PrepareResearchInput extends StartRoundInput {
  readonly requestId: string
  readonly workerSessionId: string
  readonly mode: 'new' | 'continue'
}

export function resolveResearchTarget(store: DeckStore, workerSessionId: string): ResearchTarget | undefined {
  for (const [roundId, raw] of store.entries('rounds')) {
    const round = raw as RoundRecord
    if (round.workerSessionId === workerSessionId && round.requestId) {
      return { parentSessionId: round.sessionId, setId: round.setId, roundId, workerSessionId, requestId: round.requestId }
    }
  }
  return undefined
}

export function requireResearchRound(store: DeckStore, target: ResearchTarget): RoundRecord {
  const round = store.get('rounds', target.roundId) as RoundRecord | undefined
  if (!round || round.setId !== target.setId || round.sessionId !== target.parentSessionId
    || round.workerSessionId !== target.workerSessionId || round.requestId !== target.requestId) {
    throw new Error('research worker does not belong to this round')
  }
  return round
}

export async function prepareResearchRound(store: DeckStore, input: PrepareResearchInput): Promise<StartRoundResult & { target: ResearchTarget }> {
  if (!input.request.trim() || !input.requestId.trim() || !input.workerSessionId.trim()) throw new Error('research request and identities are required')
  for (const [roundId, raw] of store.entries('rounds')) {
    const round = raw as RoundRecord
    if (round.sessionId === input.sessionId && round.requestId === input.requestId && round.workerSessionId) {
      return { roundId, round, view: await getSet(store, round.setId), promptText: '', target: {
        parentSessionId: round.sessionId, setId: round.setId, roundId, workerSessionId: round.workerSessionId, requestId: input.requestId,
      } }
    }
  }
  const setId = input.mode === 'new' ? await startNewSet(store, input.sessionId, 'agent')
    : input.setId ?? (await getActiveSet(store, input.sessionId))?.setId
  if (!setId) throw new Error('no research topic to continue')
  for (const [, raw] of store.entries('rounds')) {
    const round = raw as RoundRecord
    if (round.setId === setId && (round.status === 'starting' || round.status === 'running')) throw new Error('research is already running for this set')
  }
  const result = await startRound(store, { ...input, setId })
  const round: RoundRecord = { ...result.round, workerSessionId: input.workerSessionId, requestId: input.requestId, status: 'starting' }
  await store.put('rounds', result.roundId, round)
  return { ...result, round, view: await getSet(store, setId), target: {
    parentSessionId: input.sessionId, setId, roundId: result.roundId, workerSessionId: input.workerSessionId, requestId: input.requestId,
  } }
}

export async function setResearchRunning(store: DeckStore, target: ResearchTarget): Promise<void> {
  const round = requireResearchRound(store, target)
  if (round.status === 'starting') await store.put('rounds', target.roundId, { ...round, status: 'running' })
}

export async function finishResearchRound(store: DeckStore, input: {
  target: ResearchTarget; status: Exclude<ResearchStatus, 'starting' | 'running'>; diagnostic?: string
}): Promise<RoundRecord> {
  const round = requireResearchRound(store, input.target)
  if (round.status !== 'starting' && round.status !== 'running') return round
  const next = { ...round, status: input.status, endedAt: new Date().toISOString(), ...(input.diagnostic ? { diagnostic: input.diagnostic.slice(0, 1000) } : {}) }
  await store.put('rounds', input.target.roundId, next)
  return next
}

export async function interruptResearchRounds(store: DeckStore): Promise<void> {
  for (const [roundId, raw] of store.entries('rounds')) {
    const round = raw as RoundRecord
    if (round.status === 'starting' || round.status === 'running') {
      await store.put('rounds', roundId, { ...round, status: 'interrupted', endedAt: new Date().toISOString(), diagnostic: 'Host restarted; retry this research.' })
    }
  }
}
