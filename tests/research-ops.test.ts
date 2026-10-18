import assert from 'node:assert/strict'
import test from 'node:test'
import { addSource, commitSelection, decide, getSet, startNewSet } from '../src/ops.ts'
import { memoryStore } from './memory-store.ts'
import { prepareResearchRound, finishResearchRound, requireResearchRound, interruptResearchRounds, resolveResearchTarget, setResearchRunning } from '../src/research-ops.ts'

test('async persistence preserves the first terminal state during concurrent startup and completion', async () => {
  for (const race of ['startup', 'completion']) {
    const store = memoryStore(true)
    const { target } = await prepareResearchRound(store, { sessionId: 's', request: 'Find', workerSessionId: 'w', requestId: race, mode: 'new' })
    await Promise.all([
      finishResearchRound(store, { target, status: 'cancelled' }),
      race === 'startup' ? setResearchRunning(store, target) : finishResearchRound(store, { target, status: 'completed' }),
    ])
    assert.equal(requireResearchRound(store, target).status, 'cancelled')
    await assert.rejects(addSource(store, { sessionId: 's', origin: 'agent', title: 'Late', target }), /closed/)
  }
})

test('late_result_keeps_original_target', async () => {
  const store = memoryStore()
  const a = await startNewSet(store, 's', 'agent')
  const b = await startNewSet(store, 's', 'agent')
  const result = await addSource(store, { sessionId: 's', origin: 'agent', title: 'A', target: { setId: a } })
  assert.equal(result.setId, a)
  assert.equal((await getSet(store, b)).candidates.length, 0)
})

test('concurrent worker and manual additions deduplicate through async persistence', async () => {
  const store = memoryStore(true)
  const { target } = await prepareResearchRound(store, { sessionId: 's', request: 'Find', workerSessionId: 'w', requestId: 'r', mode: 'new' })
  const [worker, manual] = await Promise.all([
    addSource(store, { sessionId: 's', origin: 'agent', url: 'https://github.com/a/b', target }),
    addSource(store, { sessionId: 's', origin: 'user', url: 'https://github.com/a/b', target: { setId: target.setId } }),
  ])
  assert.equal(worker.sourceId, manual.sourceId)
  assert.equal(worker.candidateId, manual.candidateId)
  assert.equal([...store.entries('sources')].length, 1)
  assert.equal((await getSet(store, target.setId)).candidates.length, 1)
})

test('submitted_set_is_immutable', async () => {
  const store = memoryStore()
  const source = await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  await commitSelection(store, { sessionId: 's', setId: source.setId, requestId: 'submit' })
  await assert.rejects(decide(store, { candidateId: source.candidateId, verdict: 'kept' }), /submitted/)
  await assert.rejects(addSource(store, { sessionId: 's', origin: 'agent', title: 'B', target: { setId: source.setId } }), /submitted/)
})

test('explicit target cannot cross session ownership', async () => {
  const store = memoryStore()
  const a = await startNewSet(store, 'a', 'agent')
  await assert.rejects(addSource(store, { sessionId: 'b', origin: 'agent', title: 'Bad', target: { setId: a } }), /belong/)
})

test('repeated_request_reuses_round', async () => {
  const store = memoryStore()
  const input = { sessionId: 's', request: 'Find libraries', workerSessionId: 'w', requestId: 'r', mode: 'new' as const }
  const first = await prepareResearchRound(store, input)
  const retry = await prepareResearchRound(store, { ...input, workerSessionId: 'other' })
  assert.equal(first.roundId, retry.roundId)
  assert.equal([...store.entries('rounds')].length, 1)
  assert.equal(retry.target.workerSessionId, 'w')
})

test('wrong_worker_is_rejected', async () => {
  const store = memoryStore()
  const first = await prepareResearchRound(store, { sessionId: 's', request: 'Find', workerSessionId: 'w', requestId: 'r', mode: 'new' })
  assert.throws(() => requireResearchRound(store, { ...first.target, workerSessionId: 'wrong' }), /worker/)
  assert.equal(resolveResearchTarget(store, 'wrong'), undefined)
  assert.deepEqual(resolveResearchTarget(store, 'w'), first.target)
})

test('interrupt_preserves_candidates and terminal state rejects late writes', async () => {
  const store = memoryStore()
  const first = await prepareResearchRound(store, { sessionId: 's', request: 'Find', workerSessionId: 'w', requestId: 'r', mode: 'new' })
  await addSource(store, { sessionId: 's', origin: 'agent', title: 'A', target: first.target })
  await interruptResearchRounds(store)
  assert.equal((await getSet(store, first.target.setId)).rounds[0]?.round.status, 'interrupted')
  assert.equal((await getSet(store, first.target.setId)).candidates.length, 1)
  await finishResearchRound(store, { target: first.target, status: 'completed' })
  assert.equal((await getSet(store, first.target.setId)).rounds[0]?.round.status, 'interrupted')
  await assert.rejects(addSource(store, { sessionId: 's', origin: 'agent', title: 'Late', target: first.target }), /closed/)
})
