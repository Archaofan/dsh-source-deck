import type { DeckActivity } from '../activity.ts'

export interface DeckLocation { readonly sessionId: string; readonly setId?: string; readonly roundId?: string }
export function consumeActivity(activity: DeckActivity, sessionId: string, seen: Set<string>, storage?: Pick<Storage, 'getItem' | 'setItem'>): DeckLocation | undefined {
  if (activity.sessionId !== sessionId || !activity.openRequested || !activity.revision) return undefined
  const key = `${sessionId}:${activity.revision}`
  if (seen.has(key)) return undefined
  const storageKey = `source-deck:opened:${sessionId}`
  try { if (storage?.getItem(storageKey) === activity.revision) { seen.add(key); return undefined } } catch { /* Memory deduplication remains available. */ }
  seen.add(key)
  try { storage?.setItem(storageKey, activity.revision) } catch { /* Private/full storage must not block opening. */ }
  return { sessionId, ...(activity.setId ? { setId: activity.setId } : {}), ...(activity.roundId ? { roundId: activity.roundId } : {}) }
}
