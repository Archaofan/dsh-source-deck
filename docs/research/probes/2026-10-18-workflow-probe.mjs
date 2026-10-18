/** Read-only baseline probe: all data is in memory; true means an existing defect was observed. */
import assert from 'node:assert/strict'
import { addSource, commitSelection, decide, getSet, startNewSet, startRound } from '../../../src/ops.ts'

const tables = new Map()
function table(name) {
  if (!tables.has(name)) tables.set(name, new Map())
  return tables.get(name)
}
const store = {
  get: (name, key) => table(name).get(key),
  entries: name => table(name).entries(),
  put: (name, key, value) => { table(name).set(key, value) },
  delete: (name, key) => table(name).delete(key),
}
await startRound(store, { sessionId: 'in-memory-probe', request: 'First request' })
const second = await startRound(store, { sessionId: 'in-memory-probe', request: 'Second request' })
const late = await addSource(store, {
  sessionId: 'in-memory-probe', origin: 'agent', title: 'Late first result', url: 'https://example.com/probe',
})
const view = await getSet(store, late.setId)
await decide(store, { candidateId: late.candidateId, verdict: 'kept' })
const input = { sessionId: 'in-memory-probe', setId: late.setId, requestId: 'same-request' }
const firstCommit = await commitSelection(store, input)
const secondCommit = await commitSelection(store, input)
const nextSet = await startNewSet(store, 'in-memory-probe', 'user')
const lateAfterNew = await addSource(store, {
  sessionId: 'in-memory-probe', origin: 'agent', title: 'Old search after new topic', url: 'https://example.com/probe2',
})
const observations = {
  lateFirstResultLandsInSecondRound: view.candidates[0].candidate.roundId === second.roundId,
  duplicateCommitCreatesTwoSelections: firstCommit.selectionId !== secondCommit.selectionId,
  selectionRecords: [...store.entries('selections')].length,
  oldSearchResultLandsInNewSet: lateAfterNew.setId === nextSet,
}
assert.equal(observations.lateFirstResultLandsInSecondRound, true)
assert.equal(observations.duplicateCommitCreatesTwoSelections, true)
assert.equal(observations.selectionRecords, 2)
assert.equal(observations.oldSearchResultLandsInNewSet, true)
console.log('Baseline defects observed (not a passing fix verification):')
console.log(JSON.stringify(observations, null, 2))
