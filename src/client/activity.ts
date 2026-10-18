import type { DeckActivity } from '../activity.ts'

export interface DeckLocation { readonly sessionId: string; readonly setId?: string; readonly roundId?: string }
export function consumeActivity(activity: DeckActivity, sessionId: string, seen: Set<string>): DeckLocation | undefined {
  if (activity.sessionId !== sessionId || !activity.openRequested || !activity.revision) return undefined
  const key = `${sessionId}:${activity.revision}`
  if (seen.has(key)) return undefined
  seen.add(key)
  return { sessionId, ...(activity.setId ? { setId: activity.setId } : {}), ...(activity.roundId ? { roundId: activity.roundId } : {}) }
}
