import assert from 'node:assert/strict'
import test from 'node:test'
import { addSource, commitSelection, decide } from '../src/ops.ts'
import { createReference } from '../src/references.ts'
import { memoryStore } from './memory-store.ts'

test('reason blur and immediate explicit verdict are both persisted in user order', async () => {
  const { CandidateMutations } = await import('../src/client/candidate-mutations.ts')
  const queue = new CandidateMutations()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const persisted: string[] = []
  const reason = queue.run('candidate', async () => { await gate; persisted.push('pending:preferred UI') })
  const verdict = queue.run('candidate', async () => { persisted.push('kept:preferred UI') })
  release()
  await Promise.all([reason, verdict])
  assert.deepEqual(persisted, ['pending:preferred UI', 'kept:preferred UI'])
  await assert.rejects(queue.run('candidate', async () => { throw new Error('offline') }), /offline/)
  await queue.run('candidate', async () => { persisted.push('excluded:preferred UI') })
  assert.equal(persisted.at(-1), 'excluded:preferred UI')
})

test('pending explicit choices coalesce to the last choice behind a reason save', async () => {
  const { CandidateMutations } = await import('../src/client/candidate-mutations.ts')
  const queue = new CandidateMutations()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const persisted: string[] = []
  const reason = queue.run('candidate', async () => { await gate; persisted.push('reason') })
  const keep = queue.runLatest('candidate', async () => { persisted.push('kept') })
  const exclude = queue.runLatest('candidate', async () => { persisted.push('excluded') })
  release(); await Promise.all([reason, keep, exclude])
  assert.deepEqual(persisted, ['reason', 'excluded'])
})

test('one active choice and the last pending choice persist even when an earlier write fails', async () => {
  const { CandidateMutations } = await import('../src/client/candidate-mutations.ts')
  const queue = new CandidateMutations()
  let release!: () => void; let began!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { began = resolve })
  const persisted: string[] = []
  const first = queue.runLatest('candidate', async () => { began(); await gate; throw new Error('offline') })
  await started
  const second = queue.runLatest('candidate', async () => { persisted.push('excluded') })
  const third = queue.runLatest('candidate', async () => { persisted.push('kept') })
  release(); await assert.rejects(first, /offline/); await Promise.all([second, third])
  assert.deepEqual(persisted, ['kept'])
})

test('reference waits for queued reasons and last choice while blocking new writes only in its own scope', async () => {
  const { CandidateMutations } = await import('../src/client/candidate-mutations.ts')
  const queue = new CandidateMutations(); const otherScope = new CandidateMutations(); const store = memoryStore()
  const a = await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  const b = await addSource(store, { sessionId: 's', origin: 'user', title: 'B' })
  await decide(store, { candidateId: a.candidateId, verdict: 'kept' })
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve })
  const reason = queue.run(b.candidateId, async () => { await gate; await decide(store, { candidateId: b.candidateId, verdict: 'pending', reason: 'keyboard' }) })
  const choice = queue.runLatest(b.candidateId, () => decide(store, { candidateId: b.candidateId, verdict: 'kept', reason: 'keyboard' }))
  const reference = queue.withSettledWrites(() => createReference(store, { sessionId: 's', setId: a.setId, requestId: 'ref' }))
  await assert.rejects(queue.runLatest(b.candidateId, async () => {}), /handoff/)
  assert.equal(await otherScope.run('other', async () => 'independent'), 'independent')
  assert.equal([...store.entries('selections')].length, 0)
  release(); const [, , snapshot] = await Promise.all([reason, choice, reference])
  assert.deepEqual(snapshot.items.map(item => [item.source.title, item.reason]), [['A', undefined], ['B', 'keyboard']])
})

test('direct summary commits after the final choice and a failed save blocks delivery but permits retry', async () => {
  const { CandidateMutations } = await import('../src/client/candidate-mutations.ts')
  const queue = new CandidateMutations(); const store = memoryStore()
  const a = await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  await decide(store, { candidateId: a.candidateId, verdict: 'kept' })
  const failed = queue.run(a.candidateId, async () => { throw new Error('save offline') })
  const blocked = queue.withSettledWrites(() => commitSelection(store, { sessionId: 's', setId: a.setId, requestId: 'send' }))
  await assert.rejects(failed, /save offline/); await assert.rejects(blocked, /save offline/)
  assert.equal([...store.entries('selections')].length, 0)
  const b = await addSource(store, { sessionId: 's', origin: 'user', title: 'B' })
  const choice = queue.runLatest(b.candidateId, () => decide(store, { candidateId: b.candidateId, verdict: 'kept' }))
  const delivery = queue.withSettledWrites(() => commitSelection(store, { sessionId: 's', setId: a.setId, requestId: 'send' }))
  const [, summary] = await Promise.all([choice, delivery])
  assert.equal(summary.kept.length, 2)
})
