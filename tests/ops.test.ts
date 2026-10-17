import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addSource, clearData, commitSelection, decide, getSet,
} from '../src/ops.ts'
import type { DeckStore } from '../src/model.ts'
import { buildPrompt } from '../src/prompt.ts'

/** Minimal in-memory store with the same async surface as the domain handle. */
function memoryStore(): DeckStore & { tables: Map<string, Map<string, unknown>> } {
  const tables = new Map<string, Map<string, unknown>>()
  const table = (name: string) => {
    let current = tables.get(name)
    if (current === undefined) {
      current = new Map()
      tables.set(name, current)
    }
    return current
  }
  return {
    tables,
    entries: name => table(name).entries(),
    get: (name, key) => table(name).get(key),
    put: (name, key, value) => { table(name).set(key, value) },
    delete: (name, key) => { table(name).delete(key) },
  }
}

test('addSource creates one open set, one source and one pending candidate', async () => {
  const store = memoryStore()
  const result = await addSource(store, {
    sessionId: 'session-1', origin: 'user', title: 'Example', url: 'https://example.com/a',
  })
  assert.equal(result.duplicate, false)
  const view = await getSet(store, result.setId)
  assert.equal(view.candidates.length, 1)
  assert.equal(view.set.sessionId, 'session-1')
  assert.equal(view.set.status, 'open')
  assert.equal(view.candidates[0]?.candidate.verdict, 'pending')
  assert.equal(view.candidates[0]?.source.title, 'Example')
  assert.equal(store.get('session_active', 'session-1')?.setId, result.setId)
})

test('addSource reuses a source whose tracking-parameter URL normalizes the same', async () => {
  const store = memoryStore()
  const first = await addSource(store, { sessionId: 's', origin: 'user', url: 'https://example.com/x?utm_source=a' })
  const second = await addSource(store, { sessionId: 's', origin: 'user', url: 'https://EXAMPLE.com/x' })
  assert.equal(second.duplicate, true)
  assert.equal(second.sourceId, first.sourceId)
  assert.equal(second.candidateId, first.candidateId)
  const view = await getSet(store, first.setId)
  assert.equal(view.candidates.length, 1)
})

test('addSource keeps distinct URLs as distinct candidates', async () => {
  const store = memoryStore()
  const first = await addSource(store, { sessionId: 's', origin: 'user', title: 'A', url: 'https://example.com/a' })
  const second = await addSource(store, { sessionId: 's', origin: 'user', title: 'B', url: 'https://example.com/b' })
  assert.notEqual(second.candidateId, first.candidateId)
  assert.equal((await getSet(store, first.setId)).candidates.length, 2)
})

test('addSource rejects a source with neither title nor URL', async () => {
  const store = memoryStore()
  await assert.rejects(() => addSource(store, { sessionId: 's', origin: 'user', title: '   ' }), /title or url/i)
})

test('decide records a verdict and reason', async () => {
  const store = memoryStore()
  const added = await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  await decide(store, { candidateId: added.candidateId, verdict: 'excluded', reason: 'advertisement' })
  const view = await getSet(store, added.setId)
  const candidate = view.candidates[0]?.candidate
  assert.equal(candidate?.verdict, 'excluded')
  assert.equal(candidate?.reason, 'advertisement')
})

test('decide rejects an unknown candidate', async () => {
  const store = memoryStore()
  await assert.rejects(() => decide(store, { candidateId: 'cand-missing', verdict: 'kept' }), /candidate/i)
})

test('commitSelection stores the selection, marks the set submitted and builds the prompt', async () => {
  const store = memoryStore()
  const kept = await addSource(store, { sessionId: 's', origin: 'user', title: 'Keep me', url: 'https://example.com/keep' })
  const dropped = await addSource(store, { sessionId: 's', origin: 'user', title: 'Drop me', url: 'https://example.com/drop' })
  await decide(store, { candidateId: kept.candidateId, verdict: 'kept' })
  await decide(store, { candidateId: dropped.candidateId, verdict: 'excluded', reason: 'duplicate' })
  const result = await commitSelection(store, { sessionId: 's', setId: kept.setId, requestId: 'sel-request-1' })
  assert.equal(result.kept.length, 1)
  assert.equal(result.excluded.length, 1)
  assert.match(result.promptText, /Keep me/)
  assert.match(result.promptText, /duplicate/)
  const view = await getSet(store, kept.setId)
  assert.equal(view.set.status, 'submitted')
  const selection = store.get('selections', result.selectionId)
  assert.equal(selection?.requestId, 'sel-request-1')
})

test('adding a source after submission starts a fresh set', async () => {
  const store = memoryStore()
  const first = await addSource(store, { sessionId: 's', origin: 'user', title: 'First' })
  await decide(store, { candidateId: first.candidateId, verdict: 'kept' })
  await commitSelection(store, { sessionId: 's', setId: first.setId, requestId: 'r1' })
  const second = await addSource(store, { sessionId: 's', origin: 'user', title: 'Second' })
  assert.notEqual(second.setId, first.setId)
  const firstView = await getSet(store, first.setId)
  const secondView = await getSet(store, second.setId)
  assert.equal(firstView.set.status, 'submitted')
  assert.equal(firstView.candidates[0]?.candidate.verdict, 'kept')
  assert.equal(secondView.set.status, 'open')
  assert.equal(secondView.candidates.length, 1)
  assert.equal(secondView.candidates[0]?.candidate.verdict, 'pending')
})

test('clearData removes every record in the six tables', async () => {
  const store = memoryStore()
  await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  await clearData(store)
  for (const name of ['sets', 'sources', 'candidates', 'selections', 'scope_policies', 'session_active']) {
    assert.equal([...(store.tables.get(name)?.keys() ?? [])].length, 0)
  }
})

test('buildPrompt lists kept sources and exclusion reasons', () => {
  const text = buildPrompt({
    total: 3,
    kept: [{ title: 'One', url: 'https://example.com/1' }],
    excluded: [{ title: 'Two', reason: 'spam' }, { title: 'Three' }],
  })
  assert.match(text, /共 3 条候选/)
  assert.match(text, /保留 1 条/)
  assert.match(text, /https:\/\/example\.com\/1/)
  assert.match(text, /spam/)
})
