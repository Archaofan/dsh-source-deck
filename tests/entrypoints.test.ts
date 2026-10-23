import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryStore } from './memory-store.ts'
import { prepareResearchRound } from '../src/research-ops.ts'

test('resolving an active topic preserves legacy drafts without overwriting a named topic draft', async () => {
  const { retainLoadedDeckTarget } = await import('../src/client/activity.ts')
  assert.equal(typeof retainLoadedDeckTarget, 'function')
  const values = new Map<string, string>([['source-deck:s:active', JSON.stringify({ owner: 's:active', request: 'draft', note: '', reasons: {}, compare: ['a'], sort: 'stars' })]])
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  retainLoadedDeckTarget(storage, 's', 'topic')
  assert.deepEqual(JSON.parse(values.get('source-deck:s:topic')!).compare, ['a'])
  assert.equal(JSON.parse(values.get('source-deck:s:topic')!).owner, 's:topic')
  assert.equal(values.get('source-deck:target:s'), 'topic')
  values.set('source-deck:s:topic', 'existing named draft')
  retainLoadedDeckTarget(storage, 's', 'topic')
  assert.equal(values.get('source-deck:s:topic'), 'existing named draft')
  assert.ok(values.has('source-deck:s:active'), 'Retain the original legacy record')
})

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

test('refresh does not replay an already opened research intent over historical navigation', async () => {
  const { consumeActivity } = await import('../src/client/activity.ts')
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  const activity = { sessionId: 's', setId: 'active', revision: 'r1', openRequested: true }
  assert.ok(consumeActivity(activity, 's', new Set(), storage))
  assert.equal(consumeActivity(activity, 's', new Set(), storage), undefined)
  assert.ok(consumeActivity({ ...activity, revision: 'r2' }, 's', new Set(), storage))
})

test('history topic survives missing Host tab parameters on refresh without crossing sessions', async () => {
  const { retainedDeckTarget } = await import('../src/client/activity.ts')
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  assert.equal(retainedDeckTarget(storage, 'a', 'history'), 'history')
  assert.equal(retainedDeckTarget(storage, 'a'), 'history')
  assert.equal(retainedDeckTarget(storage, 'b'), undefined)
  assert.equal(retainedDeckTarget(storage, 'a', 'new-request'), 'new-request')
  assert.equal(retainedDeckTarget(storage, 'a'), 'new-request')
})
