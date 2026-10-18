import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryStore } from './memory-store.ts'
import { prepareResearchRound } from '../src/research-ops.ts'

test('late research opening cannot replace a newer topic or its open intent', async () => {
  const { requestDeckOpen, getDeckActivity } = await import('../src/activity.ts')
  const { startNewSet } = await import('../src/ops.ts')
  const store = memoryStore(true)
  const old = await prepareResearchRound(store, { sessionId: 's', request: 'Old', workerSessionId: 'w', requestId: 'r', mode: 'new' })
  const current = await startNewSet(store, 's', 'user')
  await requestDeckOpen(store, 's')
  const before = await getDeckActivity(store, 's')
  await requestDeckOpen(store, 's', old.target.setId, old.roundId)
  assert.equal((await getDeckActivity(store, 's')).setId, current)
  assert.deepEqual(await getDeckActivity(store, 's'), before)
})

test('Host deck command opens bare invocation and forwards Chinese arguments once', async () => {
  const { registerDeckCommands } = await import('../src/commands.ts')
  const { getDeckActivity } = await import('../src/activity.ts')
  const store = memoryStore(); let command: any; const starts: any[] = []
  const scope = { get: () => ({ register: (definition: any) => { command = definition; return () => {} } }), effect: (f: any) => f() }
  const ctx = { inject: (_names: any, f: any) => f(scope) }
  const research = { start: async (input: any) => { starts.push(input); return prepareResearchRound(store, { ...input, workerSessionId: 'worker' }) } }
  registerDeckCommands(ctx as any, research as any, async () => store)
  assert.equal(command.name, 'deck'); assert.ok(command.input)
  await command.handler({ agent: { session: { id: 's' } }, rawInput: '', commandId: 'c1' })
  assert.equal(starts.length, 0)
  assert.equal((await getDeckActivity(store, 's')).openRequested, true)
  await command.handler({ agent: { session: { id: 's' } }, rawInput: ' 找 Markdown 编辑器', commandId: 'c2' })
  assert.equal(starts.length, 1); assert.equal(starts[0].request, '找 Markdown 编辑器')
  assert.equal(starts[0].requestId, 'deck-command:c2')
})

test('activity consumption cannot open another session or consume the same request twice', async () => {
  const { consumeActivity } = await import('../src/client/activity.ts')
  const seen = new Set<string>()
  const activity = { sessionId: 'a', setId: 'set-a', roundId: 'round-a', revision: 'r1', openRequested: true }
  assert.equal(consumeActivity(activity, 'b', seen), undefined)
  assert.deepEqual(consumeActivity(activity, 'a', seen), { sessionId: 'a', setId: 'set-a', roundId: 'round-a' })
  assert.equal(consumeActivity(activity, 'a', seen), undefined)
})
