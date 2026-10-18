/**
 * SourceDeck data model: the domain tables and their record fields.
 * Records are plain JSON; the Host validates them before storage.
 */
import type { SourceMeta } from './scope-policy.ts'

/** Candidate decision. */
export type Verdict = 'pending' | 'kept' | 'excluded'

/** Where a source entered the deck. */
export type Origin = 'agent' | 'user'

/** One materialized source. */
export interface SourceRecord {
  readonly url?: string
  readonly title: string
  readonly note?: string
  readonly snippet?: string
  readonly contentRef?: unknown
  readonly origin: Origin
  readonly dedupeKey: string
  readonly createdAt: string
  readonly meta?: SourceMeta
}

/** One candidate set (one screening thread). */
export interface SetRecord {
  readonly sessionId: string
  readonly origin: Origin
  readonly createdAt: string
  status: 'open' | 'submitted'
}

/** One search round inside a set. */
export interface RoundRecord {
  readonly setId: string
  readonly sessionId: string
  readonly index: number
  readonly request: string
  readonly note?: string
  readonly keptCount?: number
  readonly excludedCount?: number
  readonly createdAt: string
  readonly workerSessionId?: string
  readonly requestId?: string
  readonly status?: ResearchStatus
  readonly endedAt?: string
  readonly diagnostic?: string
}

export type ResearchStatus = 'starting' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'

export interface ResearchTarget {
  readonly parentSessionId: string
  readonly setId: string
  readonly roundId: string
  readonly workerSessionId: string
  readonly requestId: string
}

/** One candidate inside a set. */
export interface CandidateRecord {
  readonly setId: string
  readonly sourceId: string
  readonly roundId?: string
  verdict: Verdict
  reason?: string
  decidedAt?: string
  readonly createdAt: string
  readonly policyFlags?: readonly string[]
}

/** One submitted selection. */
export interface SelectionRecord {
  readonly setId: string
  readonly sessionId: string
  readonly kept: readonly string[]
  readonly excluded: readonly { readonly candidateId: string; readonly reason?: string }[]
  readonly submittedAt: string
  readonly requestId: string
  readonly kind?: 'submitted' | 'reference'
  readonly snapshot?: ReferenceSnapshot
  readonly promptText?: string
  readonly deliveryStatus?: 'pending' | 'sent' | 'failed'
}

export interface ReferenceSnapshot {
  readonly selectionId: string
  readonly sessionId: string
  readonly setId: string
  readonly createdAt: string
  readonly items: readonly { readonly candidateId: string; readonly source: SourceRecord; readonly reason?: string }[]
}

/** Session-to-active-set pointer. */
export interface SessionActiveRecord {
  readonly setId: string
  readonly policyId?: string
  readonly roundId?: string
  readonly openRevision?: string
}

/** One saved source, independent of any screening thread. */
export interface FavoriteRecord {
  readonly title: string
  readonly url?: string
  readonly note?: string
  readonly snippet?: string
  readonly meta?: SourceMeta
  readonly addedAt: string
}

/** Tables owned by the `source_deck` domain. */
export const TABLES = [
  'sets', 'sources', 'candidates', 'selections', 'scope_policies', 'session_active', 'rounds', 'favorites',
] as const

/** The storage surface the operations need; the domain handle and tests both provide it. */
export interface DeckStore {
  get(table: string, key: string): unknown
  entries(table: string): Iterable<[string, unknown]>
  put(table: string, key: string, value: unknown): void | Promise<void>
  delete(table: string, key: string): void | boolean | Promise<void> | Promise<boolean>
}

/** Generate one record identity with its table prefix. */
export function newId(prefix: 'set' | 'src' | 'cand' | 'sel' | 'round' | 'fav'): string {
  return `${prefix}-${crypto.randomUUID()}`
}
