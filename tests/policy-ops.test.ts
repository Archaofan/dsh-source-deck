import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addSource, clearData, commitSelection, decide, getSet, getPolicy, setPolicy,
} from '../src/ops.ts'
import type { DeckStore } from '../src/model.ts'

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

test('default policy flags a low-star candidate but keeps it pending', async () => {
  const store = memoryStore()
  const added = await addSource(store, {
    sessionId: 's', origin: 'agent', title: 'Low star repo', url: 'https://github.com/a/low',
    meta: { stars: 12, pushedAt: '2026-09-01T00:00:00Z' },
  })
  assert.deepEqual(added.policyFlags, ['stars-below'])
  const view = await getSet(store, added.setId)
  assert.equal(view.candidates[0]?.candidate.verdict, 'pending')
  assert.deepEqual(view.candidates[0]?.candidate.policyFlags, ['stars-below'])
})

test('a changed policy applies only to later candidates', async () => {
  const store = memoryStore()
  const before = await addSource(store, { sessionId: 's', origin: 'agent', title: 'A', meta: { stars: 900 } })
  await setPolicy(store, { kind: 'github', params: { minStars: 1000 } })
  const after = await addSource(store, { sessionId: 's', origin: 'agent', title: 'B', meta: { stars: 900 } })
  assert.deepEqual(before.policyFlags, [])
  assert.deepEqual(after.policyFlags, ['stars-below'])
  const view = await getSet(store, before.setId)
  const a = view.candidates.find(entry => entry.candidateId === before.candidateId)
  const b = view.candidates.find(entry => entry.candidateId === after.candidateId)
  assert.deepEqual(a?.candidate.policyFlags ?? [], [])
  assert.deepEqual(b?.candidate.policyFlags, ['stars-below'])
})

test('setPolicy persists and getPolicy reads it back', async () => {
  const store = memoryStore()
  await setPolicy(store, { kind: 'web', params: { domainsBlock: ['spam.test'] } })
  const policy = await getPolicy(store)
  assert.equal(policy.kind, 'web')
  assert.deepEqual(policy.params.domainsBlock, ['spam.test'])
})

test('the submission prompt carries the active policy summary', async () => {
  const store = memoryStore()
  await setPolicy(store, { kind: 'github', params: { minStars: 500 } })
  const added = await addSource(store, { sessionId: 's', origin: 'agent', title: 'A', meta: { stars: 900 } })
  await decide(store, { candidateId: added.candidateId, verdict: 'kept' })
  const result = await commitSelection(store, { sessionId: 's', setId: added.setId, requestId: 'r1' })
  assert.match(result.promptText, /当前来源策略/)
  assert.match(result.promptText, /500/)
})

test('clearData also removes stored policies', async () => {
  const store = memoryStore()
  await setPolicy(store, { kind: 'llm-freeform', params: { guidance: '官方文档' } })
  await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  await clearData(store)
  for (const name of ['sets', 'sources', 'candidates', 'selections', 'scope_policies', 'session_active']) {
    assert.equal([...(store.tables.get(name)?.keys() ?? [])].length, 0)
  }
})
