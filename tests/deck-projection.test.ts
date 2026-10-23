import assert from 'node:assert/strict'
import test from 'node:test'
import type { SetView, CandidateView } from '../src/ops.ts'
import { projectDeck, favoriteIdentity } from '../src/client/deck-projection.ts'

const entry = (id: string, roundId: string | undefined, verdict: 'pending' | 'kept' | 'excluded', extra = {}): CandidateView => ({
  candidateId: id,
  candidate: { setId: 'A', sourceId: id, roundId, verdict, createdAt: '2026-10-18', reason: '键盘友好' },
  source: { title: id, origin: 'user', dedupeKey: id, createdAt: '2026-10-18', url: `https://example.invalid/${id}`, ...extra },
})
const view: SetView = {
  setId: 'A', set: { sessionId: 's', origin: 'user', status: 'open', createdAt: '2026-10-18' },
  rounds: [{ roundId: 'r1', round: { setId: 'A', sessionId: 's', index: 1, request: 'tables', status: 'completed', createdAt: '2026-10-18' } },
    { roundId: 'r2', round: { setId: 'A', sessionId: 's', index: 2, request: 'refine', status: 'running', createdAt: '2026-10-18' } }],
  candidates: [entry('alpha', 'r1', 'kept'), entry('beta', 'r1', 'excluded'), entry('manual', undefined, 'pending'), entry('legacy', 'missing', 'pending')],
}

test('projection counts all verdicts and groups once without losing manual or orphan legacy sources', () => {
  const result = projectDeck(view, 'all', '')
  assert.deepEqual(result.counts, { all: 4, pending: 2, kept: 1, excluded: 1 })
  assert.deepEqual(result.groups.map(group => [group.id, group.entries.map(item => item.candidateId)]), [
    ['r1', ['alpha', 'beta']], ['r2', []], ['manual', ['manual', 'legacy']],
  ])
  assert.equal(result.filtered, false)
})

test('local search includes URL and reason, trims case, and distinguishes hidden matches from no arrivals', () => {
  const found = projectDeck(view, 'kept', ' EXAMPLE.INVALID/ALPHA ')
  assert.deepEqual(found.shown.map(item => item.candidateId), ['alpha'])
  assert.equal(found.filtered, true)
  assert.deepEqual(projectDeck(view, 'excluded', '键盘').shown.map(item => item.candidateId), ['beta'])
  const empty = projectDeck(view, 'pending', 'not-a-match')
  assert.equal(empty.shown.length, 0)
  assert.equal(empty.groups[0].total, 2)
  assert.equal(empty.groups[1].total, 0)
  assert.equal(empty.groups[1].status, 'running')
  assert.deepEqual(projectDeck(null, 'all', '').counts, { all: 0, pending: 0, kept: 0, excluded: 0 })
})

test('favorite identity distinguishes a title from a URL and preserves the stored source identity', () => {
  assert.equal(favoriteIdentity({ title: 'A', url: 'https://example.invalid/A' }), 'url:https://example.invalid/A')
  assert.equal(favoriteIdentity({ title: 'https://example.invalid/A' }), 'title:https://example.invalid/A')
})

test('local search finds metadata with multiple terms in both candidates and saved sources', async () => {
  const { sourceMatches } = await import('../src/client/deck-projection.ts')
  const source = { title: 'Editor', meta: { language: 'TypeScript', license: 'MIT', topics: ['offline-first'] } }
  const fixture = { ...view, candidates: [entry('editor', 'r1', 'pending', source)] }
  assert.equal(projectDeck(fixture, 'all', ' MIT TypeScript ').shown.length, 1)
  assert.equal(projectDeck(fixture, 'all', 'offline-first').shown.length, 1)
  assert.equal(typeof sourceMatches, 'function')
  assert.equal(sourceMatches(source, 'typescript MIT'), true)
  assert.equal(sourceMatches(source, 'typescript GPL'), false)
})

test('explicit fact sorting is stable, keeps zero above unknown and retains round ownership', () => {
  const fixture = { ...view, candidates: [
    entry('unknown', 'r1', 'pending'), entry('zero', 'r1', 'kept', { meta: { stars: 0 } }),
    entry('popular', 'r1', 'pending', { meta: { stars: 20 } }), entry('tie', 'r1', 'excluded', { meta: { stars: 20 } }),
    entry('other-round', 'r2', 'pending', { meta: { stars: 100 } }),
  ] }
  const sorted = projectDeck(fixture, 'all', '', 'stars')
  assert.deepEqual(sorted.groups[0].entries.map(item => item.candidateId), ['popular', 'tie', 'zero', 'unknown'])
  assert.deepEqual(sorted.groups[1].entries.map(item => item.candidateId), ['other-round'])
  assert.deepEqual(fixture.candidates.map(item => item.candidateId), ['unknown', 'zero', 'popular', 'tie', 'other-round'])
})

test('code push sorting puts invalid dates last and title sorting is case insensitive', () => {
  const fixture = { ...view, candidates: [
    entry('zebra', 'r1', 'pending', { meta: { pushedAt: 'invalid' } }),
    entry('Beta', 'r1', 'pending', { meta: { pushedAt: '2026-10-01' } }),
    entry('alpha', 'r1', 'pending', { meta: { pushedAt: '2026-10-22' } }),
  ] }
  assert.deepEqual(projectDeck(fixture, 'all', '', 'updated').groups[0].entries.map(item => item.candidateId), ['alpha', 'Beta', 'zebra'])
  assert.deepEqual(projectDeck(fixture, 'all', '', 'title').groups[0].entries.map(item => item.candidateId), ['alpha', 'Beta', 'zebra'])
})

test('comparison follows unique selection order rather than source arrival order and drops unavailable sources', async () => {
  const { comparisonEntries } = await import('../src/client/deck-projection.ts')
  assert.equal(typeof comparisonEntries, 'function')
  assert.deepEqual(comparisonEntries(view.candidates, ['beta', 'missing', 'alpha', 'beta']).map(item => item.candidateId), ['beta', 'alpha'])
})
