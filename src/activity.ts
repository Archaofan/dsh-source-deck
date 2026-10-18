import type { DeckStore, RoundRecord, SessionActiveRecord } from './model.ts'
import { ensureActiveSet, getSet } from './ops.ts'
import { withStoreLock } from './store-lock.ts'

export interface DeckActivity {
  readonly sessionId: string
  readonly setId?: string
  readonly roundId?: string
  readonly revision: string
  readonly openRequested: boolean
  readonly status?: RoundRecord['status']
}
export async function requestDeckOpen(store: DeckStore, sessionId: string, setId?: string, roundId?: string): Promise<void> {
  const target = setId ?? await ensureActiveSet(store, sessionId, 'user')
  const view = await getSet(store, target)
  if (view.set.sessionId !== sessionId) throw new Error('deck does not belong to this session')
  await withStoreLock(store, `active:${sessionId}`, async () => {
    const previous = store.get('session_active', sessionId) as SessionActiveRecord | undefined
    if (previous?.setId !== target || (roundId && previous.roundId !== roundId)) return
    await store.put('session_active', sessionId, { ...previous, openRevision: crypto.randomUUID() })
  })
}
export async function getDeckActivity(store: DeckStore, sessionId: string): Promise<DeckActivity> {
  const pointer = store.get('session_active', sessionId) as SessionActiveRecord | undefined
  if (!pointer) return { sessionId, revision: '', openRequested: false }
  const round = pointer.roundId ? store.get('rounds', pointer.roundId) as RoundRecord | undefined : undefined
  return { sessionId, setId: pointer.setId, ...(pointer.roundId ? { roundId: pointer.roundId } : {}),
    revision: pointer.openRevision ?? '', openRequested: Boolean(pointer.openRevision), ...(round?.status ? { status: round.status } : {}) }
}
