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
