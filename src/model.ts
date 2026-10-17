/**
 * SourceDeck data model: the six domain tables and their record fields.
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

/** One candidate set. */
export interface SetRecord {
  readonly sessionId: string
  readonly origin: Origin
  readonly createdAt: string
  status: 'open' | 'submitted'
}

/** One candidate inside a set. */
export interface CandidateRecord {
  readonly setId: string
  readonly sourceId: string
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
}

/** Session-to-active-set pointer. */
export interface SessionActiveRecord {
  readonly setId: string
  readonly policyId?: string
}

/** Tables owned by the `source_deck` domain. */
export const TABLES = ['sets', 'sources', 'candidates', 'selections', 'scope_policies', 'session_active'] as const

/** The storage surface the operations need; the domain handle and tests both provide it. */
export interface DeckStore {
  get(table: string, key: string): unknown
  entries(table: string): Iterable<[string, unknown]>
  put(table: string, key: string, value: unknown): void | Promise<void>
  delete(table: string, key: string): void | boolean | Promise<void> | Promise<boolean>
}

/** Generate one record identity with its table prefix. */
export function newId(prefix: 'set' | 'src' | 'cand' | 'sel'): string {
  return `${prefix}-${crypto.randomUUID()}`
}
