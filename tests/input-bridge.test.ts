import assert from 'node:assert/strict'
import test from 'node:test'

const snapshot = { selectionId: 'sel', sessionId: 's', setId: 'set', createdAt: '2026-10-18', items: [{ candidateId: 'c', source: { title: 'A', origin: 'user', dedupeKey: 'a', createdAt: 'now' } }] }
test('async reference insertion respects revision, existing draft and attachments', async () => {
  const { ReferenceBridge } = await import('../src/client/input-bridge.ts')
  const bridge = new ReferenceBridge(); let rev = 1; let draft = 'existing'; const attachments = ['file']; let focused = 0
  bridge.register('s', { captureInsertion: () => ({ start: 8, end: 8, draftRev: rev }),
    insert: (_ref: any, span: any) => { if (span.draftRev !== rev) return false; draft += '[reference]'; return true }, persistDraft: () => {}, focus: () => { focused++ } })
  let ready!: (value: any) => void
  const pending = bridge.insert('s', () => new Promise(resolve => { ready = resolve }))
  draft += ' edits'; rev++
  ready(snapshot)
  assert.equal(await pending, 'draft-changed'); assert.equal(draft, 'existing edits'); assert.deepEqual(attachments, ['file']); assert.equal(focused, 0)
  assert.equal(await bridge.insert('s', async () => snapshot as any), 'inserted')
  assert.equal(focused, 1)
})

test('disposed or mismatched input handles cannot receive a late reference', async () => {
  const { ReferenceBridge } = await import('../src/client/input-bridge.ts')
  const bridge = new ReferenceBridge(); let inserts = 0
  const off = bridge.register('s', { captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }), insert: () => { inserts++; return true }, persistDraft: () => {}, focus: () => {} })
  assert.equal(await bridge.insert('other', async () => snapshot as any), 'unavailable')
  let ready!: (value: any) => void
  const pending = bridge.insert('s', () => new Promise(resolve => { ready = resolve }))
  off(); ready(snapshot)
  assert.equal(await pending, 'unavailable'); assert.equal(inserts, 0)
})
