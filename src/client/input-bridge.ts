import type { ReferenceInsert, TokenSpan } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ReferenceSnapshot } from '../model.ts'

export const REFERENCE_SOURCE = 'SourceDeck'
export function referenceInsert(snapshot: ReferenceSnapshot): ReferenceInsert {
  return { source: REFERENCE_SOURCE, ref: JSON.stringify({ sessionId: snapshot.sessionId, selectionId: snapshot.selectionId }),
    label: `SourceDeck · ${snapshot.items.length}`, appearance: 'folder', clipboardText: `@deck[${snapshot.selectionId}]` }
}
interface InputHandle {
  captureInsertion(): TokenSpan
  insert(reference: ReferenceInsert, span: TokenSpan): boolean
  persistDraft(): void
  focus(): void
}
export class ReferenceBridge {
  private readonly inputs = new Map<string, InputHandle>()
  register(sessionId: string, handle: InputHandle): () => void {
    this.inputs.set(sessionId, handle)
    return () => { if (this.inputs.get(sessionId) === handle) this.inputs.delete(sessionId) }
  }
  async insert(sessionId: string, prepare: () => Promise<ReferenceSnapshot>): Promise<'inserted' | 'draft-changed' | 'unavailable'> {
    const handle = this.inputs.get(sessionId)
    if (!handle) return 'unavailable'
    const span = handle.captureInsertion()
    const snapshot = await prepare()
    if (this.inputs.get(sessionId) !== handle || snapshot.sessionId !== sessionId) return 'unavailable'
    if (!handle.insert(referenceInsert(snapshot), span)) return 'draft-changed'
    handle.persistDraft(); handle.focus()
    return 'inserted'
  }
}
