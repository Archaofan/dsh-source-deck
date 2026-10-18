import { useEffect } from 'react'
import type { DeckActivity } from '../activity.ts'
import { consumeActivity, type DeckLocation } from './activity.ts'

export function DeckActivityObserver({ sessionId, load, open, seen }: {
  sessionId: string; load(sessionId: string): Promise<DeckActivity>; open(location: DeckLocation): void; seen: Set<string>
}) {
  useEffect(() => {
    let cancelled = false; let reading = false
    const tick = async () => {
      if (reading) return
      reading = true
      try {
        const activity = await load(sessionId)
        if (cancelled) return
        const location = consumeActivity(activity, sessionId, seen)
        if (location) open(location)
      } catch { /* Transient reads retry; no model requests or draft writes. */ }
      finally { reading = false }
    }
    void tick()
    const timer = window.setInterval(() => void tick(), 2000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [sessionId, load, open, seen])
  return null
}
