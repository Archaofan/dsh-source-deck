import type { CandidateView, SetView } from '../ops.ts'
import type { RoundRecord, Verdict } from '../model.ts'
import type { SourceMeta } from '../scope-policy.ts'

export type DeckSort = 'original' | 'stars' | 'updated' | 'title'
export const deckSorts: readonly DeckSort[] = ['original', 'stars', 'updated', 'title']
type SearchableSource = { title: string; url?: string; note?: string; snippet?: string; meta?: SourceMeta }
export function sourceMatches(source: SearchableSource, query: string, reason?: string): boolean {
  const text = [source.title, source.url, source.note, source.snippet, source.meta?.description, source.meta?.language,
    source.meta?.license, ...(source.meta?.topics ?? []), reason].filter(Boolean).join(' ').toLocaleLowerCase()
  return query.trim().toLocaleLowerCase().split(/\s+/u).every(term => text.includes(term))
}
export function compareSources(a: SearchableSource, b: SearchableSource, sort: DeckSort): number {
  if (sort === 'title') return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
  if (sort === 'original') return 0
  const value = (source: SearchableSource) => {
    if (sort === 'updated') { const date = Date.parse(source.meta?.pushedAt ?? ''); return Number.isFinite(date) ? date : -Infinity }
    const stars = source.meta?.stars
    return typeof stars === 'number' && Number.isFinite(stars) && stars >= 0 ? stars : -Infinity
  }
  const first = value(a); const second = value(b)
  return first === second ? 0 : first > second ? -1 : 1
}
export function comparisonEntries(candidates: readonly CandidateView[], selected: readonly string[]): CandidateView[] {
  const bySource = new Map(candidates.map(entry => [entry.candidate.sourceId, entry]))
  return [...new Set(selected)].flatMap(id => { const entry = bySource.get(id); return entry ? [entry] : [] }).slice(0, 4)
}

export interface DeckGroup {
  id: string; index: number; request: string; status?: RoundRecord['status']; diagnostic?: string; note?: string
  entries: CandidateView[]; total: number
}
export function favoriteIdentity(source: { url?: string; title: string }): string {
  return source.url ? `url:${source.url}` : `title:${source.title}`
}
export function projectDeck(view: SetView | null, filter: 'all' | Verdict, query: string, sort: DeckSort = 'original') {
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
    if ((filter === 'all' || entry.candidate.verdict === filter) && sourceMatches(entry.source, needle, entry.candidate.reason)) {
      shown.push(entry); group.entries.push(entry)
    }
  }
  for (const group of groups.values()) if (sort !== 'original') group.entries.sort((a, b) => compareSources(a.source, b.source, sort))
  return { counts, shown, groups: [...groups.values()], filtered: filter !== 'all' || Boolean(needle) }
}
