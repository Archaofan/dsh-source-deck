/** The deck UI's injected face: plain data and callbacks, no ctx in components. */
import type { AddSourceResult, CommitResult, SetView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { ScopePolicy } from '../scope-policy.ts'

/** The Remote envelope for one policy read or write. */
export interface PolicyView {
  readonly policy: ScopePolicy
  readonly summary: string
}

/** Operations the deck panel and settings section call through the Remote namespace. */
export interface DeckFace {
  load(sessionId: string): Promise<SetView | null>
  add(sessionId: string, input: { title?: string; url?: string; note?: string }): Promise<AddSourceResult>
  decide(candidateId: string, verdict: Verdict, reason?: string): Promise<void>
  commit(sessionId: string, setId: string): Promise<CommitResult>
  prompt(sessionId: string, text: string): Promise<boolean>
  loadPolicy(): Promise<PolicyView>
  savePolicy(policy: ScopePolicy): Promise<PolicyView>
  newSet(sessionId: string): Promise<{ setId: string }>
  clearData(): Promise<void>
}
