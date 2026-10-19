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
