/** The deck UI's injected face: plain data and callbacks, no ctx in components. */
import type { AddSourceResult, CommitResult, FavoriteView, SetView, StartRoundResult } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { ScopePolicy } from '../scope-policy.ts'
import type { DeckActivity } from '../activity.ts'
import type { ReferenceSnapshot } from '../model.ts'

/** The Remote envelope for one policy read or write. */
export interface PolicyView {
  readonly policy: ScopePolicy
  readonly summary: string
}

/** Operations the deck panel and settings section call through the Remote namespace. */
export interface DeckFace {
  load(sessionId: string): Promise<SetView | null>
  loadSet(sessionId: string, setId: string): Promise<SetView>
  add(sessionId: string, input: { title?: string; url?: string; note?: string }): Promise<AddSourceResult>
  decide(candidateId: string, verdict: Verdict, reason?: string): Promise<void>
  commit(sessionId: string, setId: string): Promise<CommitResult>
  prompt(sessionId: string, text: string): Promise<boolean>
  startRound(sessionId: string, request: string, note?: string, options?: { mode: 'new' | 'continue'; setId?: string; requestId?: string }): Promise<StartRoundResult>
  activity(sessionId: string): Promise<DeckActivity>
  createReference(sessionId: string, setId: string, requestId: string): Promise<ReferenceSnapshot>
  getReference(sessionId: string, selectionId: string): Promise<ReferenceSnapshot>
  listReferences(sessionId: string): Promise<readonly ReferenceSnapshot[]>
  serializeReference(sessionId: string, selectionId: string): Promise<string>
  reference(sessionId: string, setId: string): Promise<'inserted' | 'draft-changed' | 'unavailable'>
  deliverSelection(sessionId: string, setId: string): Promise<void>
  loadPolicy(): Promise<PolicyView>
  savePolicy(policy: ScopePolicy): Promise<PolicyView>
  newSet(sessionId: string): Promise<{ setId: string }>
  listFavorites(): Promise<FavoriteView[]>
  addFavorite(input: { title: string; url?: string; note?: string; snippet?: string }): Promise<FavoriteView>
  removeFavorite(favoriteId: string): Promise<void>
  clearData(): Promise<void>
}
