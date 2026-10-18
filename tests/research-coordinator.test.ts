import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryStore } from './memory-store.ts'
import { getSet, addSource } from '../src/ops.ts'

// Dynamic loading keeps missing feature failures in the individual tests.
const coordinatorModule = () => import('../src/research-coordinator.ts')
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
async function fixture(timeoutMs = 300000) {
  const { ResearchCoordinator } = await coordinatorModule()
  const store = memoryStore()
  const runs: { done: ReturnType<typeof deferred<{ stopReason: string }>>; disposed: number; target: any }[] = []
  const runtime = {
    resolveParent: async (id: string) => ({ session: { id } }),
    start: async (input: any) => {
      const run = { done: deferred<{ stopReason: string }>(), disposed: 0, target: input.target }
      runs.push(run)
      return { result: run.done.promise, dispose: async () => { run.disposed++; run.done.resolve({ stopReason: 'aborted' }) } }
    },
  }
  const coordinator = new ResearchCoordinator(() => Promise.resolve(store), runtime, () => {}, timeoutMs)
  const start = (requestId = 'r', extra = {}) => coordinator.start({ sessionId: 's', request: 'Find libraries', requestId, mode: 'new', ...extra })
  const flush = () => new Promise(resolve => setTimeout(resolve, 10))
  return { coordinator, runs, store, start, flush }
}

test('concurrent request retries launch once and empty results finish', async () => {
  const f = await fixture()
  const [a, b] = await Promise.all([f.start(), f.start()])
  assert.equal(a.roundId, b.roundId)
  assert.equal(f.runs.length, 1)
  assert.equal((await getSet(f.store, a.target.setId)).rounds[0]?.round.status, 'running')
  f.runs[0]!.done.resolve({ stopReason: 'completed' }); await f.flush()
  assert.equal((await getSet(f.store, a.target.setId)).rounds[0]?.round.status, 'completed')
  await f.coordinator.dispose()
})

test('partial and all duplicate arrivals do not determine lifecycle', async () => {
  const f = await fixture()
  const a = await f.start()
  await addSource(f.store, { sessionId: 's', origin: 'agent', title: 'A', target: a.target })
  await addSource(f.store, { sessionId: 's', origin: 'agent', title: 'A', target: a.target })
  assert.equal((await getSet(f.store, a.target.setId)).rounds[0]?.round.status, 'running')
  await assert.rejects(f.start('r2', { mode: 'continue', setId: a.target.setId }), /running/)
  f.runs[0]!.done.resolve({ stopReason: 'completed' }); await f.flush()
  assert.equal((await getSet(f.store, a.target.setId)).rounds[0]?.round.status, 'completed')
  await f.coordinator.dispose()
})

test('cancel affects only the addressed worker and late completion stays cancelled', async () => {
  const f = await fixture()
  const a = await f.start(); const b = await f.start('b')
  await assert.rejects(f.coordinator.cancel('other', a.roundId), /belong/)
  await f.coordinator.cancel('s', a.roundId)
  f.runs[0]!.done.resolve({ stopReason: 'completed' }); await f.flush()
  assert.equal(f.runs[0]!.disposed, 1)
  assert.equal(f.runs[1]!.disposed, 0)
  assert.equal((await getSet(f.store, a.target.setId)).rounds[0]?.round.status, 'cancelled')
  assert.equal((await getSet(f.store, b.target.setId)).rounds[0]?.round.status, 'running')
  await f.coordinator.dispose()
})

test('timeout settles and disposes the research worker', async () => {
  const f = await fixture(10)
  const a = await f.start(); await new Promise(r => setTimeout(r, 35))
  const round = (await getSet(f.store, a.target.setId)).rounds[0]!.round
  assert.equal(round.status, 'failed'); assert.match(round.diagnostic ?? '', /timed out/)
  assert.equal(f.runs[0]!.disposed, 1)
  await f.coordinator.dispose()
})

test('clearing data stops active research before deleting its binding and permits a fresh request', async () => {
  const f = await fixture()
  await f.start()
  await f.coordinator.clearData()
  assert.equal(f.runs[0]!.disposed, 1)
  for (const table of ['rounds', 'sets', 'sources', 'candidates', 'session_active']) assert.equal([...f.store.entries(table)].length, 0)
  const fresh = await f.start('fresh')
  assert.equal((await getSet(f.store, fresh.target.setId)).rounds[0]?.round.status, 'running')
  await f.coordinator.dispose()
})

test('research tool guard rejects write, shell, cordis and delegation', async () => {
  const { researchToolGuard } = await import('../src/research-runtime.ts')
  for (const name of ['shell', 'write_file', 'cordis', 'spawn', 'run_code']) assert.ok(researchToolGuard({ name }))
  for (const name of ['web_search', 'web_fetch', 'deck_submit_sources']) assert.equal(researchToolGuard({ name }), undefined)
})

test('startup failure has a durable terminal state', async () => {
  const { ResearchCoordinator } = await coordinatorModule()
  const store = memoryStore()
  const coordinator = new ResearchCoordinator(async () => store, {
    resolveParent: async id => ({ session: { id } }),
    start: async () => { throw new Error('spawn unavailable') },
  }, () => {})
  await assert.rejects(coordinator.start({ sessionId: 's', request: 'Find', requestId: 'r', mode: 'new' }), /spawn unavailable/)
  assert.equal([...store.entries('rounds')].map(([, r]: any) => r.status)[0], 'failed')
  await coordinator.dispose()
})

test('cancelling during activation admission disposes the eventual handle', async () => {
  const { ResearchCoordinator } = await coordinatorModule()
  const store = memoryStore()
  const gate = deferred<any>(); let target: any; let disposed = 0
  const coordinator = new ResearchCoordinator(async () => store, {
    resolveParent: async id => ({ session: { id } }),
    start: async input => { target = input.target; return gate.promise },
  }, () => {})
  const pending = coordinator.start({ sessionId: 's', request: 'Find', requestId: 'r', mode: 'new' })
  while (!target) await new Promise(r => setTimeout(r, 1))
  await coordinator.cancel('s', target.roundId)
  gate.resolve({ result: Promise.resolve({ stopReason: 'completed' }), dispose: async () => { disposed++ } })
  await assert.rejects(pending, /cancelled/)
  assert.equal(disposed, 1)
  assert.equal((await getSet(store, target.setId)).rounds[0]?.round.status, 'cancelled')
  await coordinator.dispose()
})

test('runtime creation hook scopes restrictions to assigned workers', async () => {
  const { createResearchRuntime } = await import('../src/research-runtime.ts')
  let listener: any; let guards = 0; let mask: string[] = []; let guard: any
  const ctx = { effect: (f: any) => f(), on: (_name: string, f: any) => { listener = f; return () => {} } }
  const tools = { get: () => ({}), restrict: (f: any) => { mask = f.allow; return () => {} },
    guard: (f: any) => { guards++; guard = f; return () => {} }, presentAs: () => () => {} }
  createResearchRuntime(ctx as any, async id => id === 'worker' ? { parentSessionId: 'main', setId: 'set', roundId: 'r', workerSessionId: id, requestId: 'req' } : undefined)
  await listener({ agent: { session: { id: 'main' }, ctx: { tools } } })
  assert.equal(guards, 0)
  await listener({ agent: { session: { id: 'worker' }, ctx: { tools } } })
  assert.equal(guards, 1)
  assert.deepEqual(mask, ['web_search', 'web_fetch', 'deck_submit_sources'])
  assert.ok(guard({ name: 'write_file' }))
})

test('runtime looks up inherited preset tools through the worker scope', async () => {
  const { createResearchRuntime } = await import('../src/research-runtime.ts')
  let listener: any; let mask: string[] = []
  const ctx = { effect: (f: any) => f(), on: (_name: string, f: any) => { listener = f; return () => {} } }
  const worker: any = { session: { id: 'worker' }, ctx: {} }
  worker.ctx.tools = {
    get: (name: string, scope: any) => name === 'deck_submit_sources' || scope === worker ? {} : undefined,
    restrict: (filter: any) => { mask = filter.allow; return () => {} }, guard: () => () => {}, presentAs: () => () => {},
  }
  createResearchRuntime(ctx as any, async () => ({ parentSessionId: 'main', setId: 'set', roundId: 'r', workerSessionId: 'worker', requestId: 'req' }))
  await listener({ agent: worker })
  assert.deepEqual(mask, ['web_search', 'web_fetch', 'deck_submit_sources'])
})
