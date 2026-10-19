import assert from 'node:assert/strict'
import test from 'node:test'

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
