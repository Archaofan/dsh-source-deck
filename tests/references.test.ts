import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryStore } from './memory-store.ts'
import { addSource, decide, getSet, commitSelection } from '../src/ops.ts'

test('selection retries create one record, preserve text and report pending delivery', async () => {
  const store = memoryStore()
  const a = await addSource(store, { sessionId: 's', origin: 'user', title: 'Original' })
  await decide(store, { candidateId: a.candidateId, verdict: 'kept' })
  const [first, retry] = await Promise.all([commitSelection(store, { sessionId: 's', setId: a.setId, requestId: 'r' }), commitSelection(store, { sessionId: 's', setId: a.setId, requestId: 'r' })])
  assert.equal(first.selectionId, retry.selectionId)
  assert.equal([...store.entries('selections')].length, 1)
  assert.equal(first.deliveryStatus, 'pending')
})

test('reference snapshots stay immutable, do not submit, and reject another owner', async () => {
  const { createReference, getReference, serializeReference } = await import('../src/references.ts')
  const store = memoryStore()
  const a = await addSource(store, { sessionId: 's', origin: 'user', title: 'Library', url: 'https://github.com/a/b', note: 'Why', meta: { stars: 12 } })
  await decide(store, { candidateId: a.candidateId, verdict: 'kept', reason: 'Useful' })
  const input = { sessionId: 's', setId: a.setId, requestId: 'r' }
  const [snapshot, retry] = await Promise.all([createReference(store, input), createReference(store, input)])
  assert.equal(snapshot.selectionId, retry.selectionId)
  assert.equal([...store.entries('selections')].length, 1)
  await decide(store, { candidateId: a.candidateId, verdict: 'excluded' })
  const source: any = store.get('sources', a.sourceId); source.title = 'Changed'
  const saved = await getReference(store, { sessionId: 's', selectionId: snapshot.selectionId })
  assert.equal(saved.items[0]?.source.title, 'Library')
  assert.equal((await getSet(store, a.setId)).set.status, 'open')
  assert.match(serializeReference(saved), /https:\/\/github.com\/a\/b/)
  assert.match(serializeReference(saved), /Why/); assert.match(serializeReference(saved), /12/)
  await assert.rejects(getReference(store, { sessionId: 'other', selectionId: saved.selectionId }), /belong/)
})

test('empty and cleared references fail explicitly; failed delivery never becomes sent', async () => {
  const { createReference, getReference } = await import('../src/references.ts')
  const { acknowledgeSelection } = await import('../src/ops.ts')
  const store = memoryStore()
  const a = await addSource(store, { sessionId: 's', origin: 'user', title: 'A' })
  await assert.rejects(createReference(store, { sessionId: 's', setId: a.setId, requestId: 'r' }), /kept/)
  await decide(store, { candidateId: a.candidateId, verdict: 'kept' })
  const ref = await createReference(store, { sessionId: 's', setId: a.setId, requestId: 'r' })
  await store.delete('selections', ref.selectionId)
  await assert.rejects(getReference(store, { sessionId: 's', selectionId: ref.selectionId }), /unavailable/)
  const submitted = await commitSelection(store, { sessionId: 's', setId: a.setId, requestId: 'send' })
  await acknowledgeSelection(store, { sessionId: 's', selectionId: submitted.selectionId, status: 'failed' })
  assert.equal((await commitSelection(store, { sessionId: 's', setId: a.setId, requestId: 'send' })).deliveryStatus, 'failed')
})
