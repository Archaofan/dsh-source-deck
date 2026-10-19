import type { CandidateView, SetView } from '../ops.ts'
import type { RoundRecord, Verdict } from '../model.ts'

export interface DeckGroup {
  id: string; index: number; request: string; status?: RoundRecord['status']; diagnostic?: string; note?: string
  entries: CandidateView[]; total: number
}
export function favoriteIdentity(source: { url?: string; title: string }): string {
  return source.url ? `url:${source.url}` : `title:${source.title}`
}
export function projectDeck(view: SetView | null, filter: 'all' | Verdict, query: string) {
  const counts = { all: 0, pending: 0, kept: 0, excluded: 0 }
  const groups = new Map<string, DeckGroup>()
  for (const { roundId, round } of view?.rounds ?? []) groups.set(roundId, {
    id: roundId, index: round.index, request: round.request, status: round.status, diagnostic: round.diagnostic, note: round.note, entries: [], total: 0,
  })
  const needle = query.trim().toLocaleLowerCase()
  const shown: CandidateView[] = []
  for (const entry of view?.candidates ?? []) {
    counts.all++; counts[entry.candidate.verdict]++
    const id = entry.candidate.roundId && groups.has(entry.candidate.roundId) ? entry.candidate.roundId : 'manual'
    let group = groups.get(id)
    if (!group) { group = { id, index: 0, request: '', entries: [], total: 0 }; groups.set(id, group) }
    group.total++
    const text = [entry.source.title, entry.source.url, entry.source.note, entry.source.snippet, entry.source.meta?.description, entry.candidate.reason].filter(Boolean).join(' ').toLocaleLowerCase()
    if ((filter === 'all' || entry.candidate.verdict === filter) && (!needle || text.includes(needle))) {
      shown.push(entry); group.entries.push(entry)
    }
  }
  return { counts, shown, groups: [...groups.values()], filtered: filter !== 'all' || Boolean(needle) }
}
