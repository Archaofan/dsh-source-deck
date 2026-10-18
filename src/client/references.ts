import type { Context } from '@deepseek-ai/cordis'
import type { ReferenceSnapshot } from '../model.ts'
import type { DeckFace } from './deck-face.ts'
import type { DeckLocation } from './activity.ts'
import { REFERENCE_SOURCE, referenceInsert } from './input-bridge.ts'

function parseRef(raw: string): { sessionId: string; selectionId: string } {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('sessionId' in value) || !('selectionId' in value)
    || typeof value.sessionId !== 'string' || typeof value.selectionId !== 'string') throw new Error('SourceDeck reference is invalid')
  return { sessionId: value.sessionId, selectionId: value.selectionId }
}
export async function currentReference(deck: DeckFace, sessionId: string, setId: string): Promise<ReferenceSnapshot> {
  const view = await deck.loadSet(sessionId, setId)
  const kept = view.candidates.filter(entry => entry.candidate.verdict === 'kept')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(kept)))
  const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  return deck.createReference(sessionId, setId, `reference:${setId}:${digest}`)
}

export function registerReferenceSource(ctx: Context, deck: DeckFace, open: (location: DeckLocation) => void): void {
  ctx.inject(['inputTriggers'], scope => {
    const registry = scope.get('inputTriggers') as unknown as { registerSource(source: object): () => void }
    scope.effect(() => registry.registerSource({
      trigger: '@', name: REFERENCE_SOURCE, order: 15,
      async candidates(session: { sessionId: string }, req: { query: string; signal: AbortSignal }) {
        if (req.query && !'deck sourcedeck 资料台'.includes(req.query.toLowerCase()) && !req.query.toLowerCase().startsWith('deck')) return []
        const active = await deck.load(session.sessionId)
        const current = active?.candidates.some(entry => entry.candidate.verdict === 'kept') ? await currentReference(deck, session.sessionId, active.setId) : undefined
        const history = await deck.listReferences(session.sessionId)
        req.signal.throwIfAborted()
        const snapshots = [ ...(current ? [current] : []), ...history.filter(item => item.selectionId !== current?.selectionId) ].slice(0, 20)
        return snapshots.map((snapshot, index) => ({ name: index === 0 ? 'deck' : `deck-${index + 1}`, label: `SourceDeck · ${snapshot.items.length}`, icon: 'folder',
          description: snapshot.items.map(item => item.source.title).join(' · '), value: referenceInsert(snapshot).ref }))
      },
      onPick(pick: { session: { sessionId: string }; candidate: { value?: string; label?: string } }) {
        const raw = pick.candidate.value
        if (!raw) return undefined
        const ref = parseRef(raw)
        if (ref.sessionId !== pick.session.sessionId) return undefined
        return { insert: { source: REFERENCE_SOURCE, ref: raw, label: pick.candidate.label ?? 'SourceDeck', appearance: 'folder', clipboardText: `@deck[${ref.selectionId}]` } }
      },
      codec: {
        clipboardText: (raw: string) => `@deck[${parseRef(raw).selectionId}]`,
        async serialize(raw: string, signal: AbortSignal) {
          signal.throwIfAborted()
          const ref = parseRef(raw)
          const text = await deck.serializeReference(ref.sessionId, ref.selectionId)
          signal.throwIfAborted()
          return text
        },
      },
      openReference(session: { sessionId: string }, reference: { ref: string }) {
        const ref = parseRef(reference.ref)
        if (ref.sessionId !== session.sessionId) return false
        void deck.getReference(ref.sessionId, ref.selectionId).then(snapshot => open({ sessionId: ref.sessionId, setId: snapshot.setId })).catch(() => {})
        return true
      },
    }), 'dsh-source-deck: @deck references')
  })
}
