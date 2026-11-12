import assert from 'node:assert/strict'
import test from 'node:test'
import { createResearchRuntime } from '../src/research-runtime.ts'

/** Minimal session read surface used by recentConversation. */
function session(id: string) {
  return { id, seq: 0, eventAt: () => undefined }
}

test('startActivation receives the flattened 0.2.2-rc.2 spec', async () => {
  let captured: Record<string, unknown> | undefined
  const subagents = {
    getProvider: () => ({ inheritsParentContext: false, prepareContinuable: () => Promise.resolve({}) }),
    startActivation: async (spec: Record<string, unknown>) => {
      captured = spec
      return { childId: spec.childId, result: Promise.resolve({ stopReason: 'completed' }), dispose: async () => {} }
    },
  }
  const ctx = {
    effect: (register: () => unknown) => { register(); return () => {} },
    on: () => () => {},
    get: (name: string) => (name === 'subagents' ? subagents : undefined),
  }
  const runtime = createResearchRuntime(ctx as never, async () => undefined)
  const parent = { session: session('parent-session') }
  const signal = new AbortController().signal
  await runtime.start({ parent: parent as never, target: { workerSessionId: 'worker-session' } as never, promptText: 'find sources', signal })

  assert.ok(captured, 'startActivation must be called')
  assert.equal(captured.provider, 'spawn')
  assert.equal(captured.childId, 'worker-session')
  assert.equal(captured.delivery, 'caller')
  assert.equal(captured.parent, parent, 'parent must be top-level')
  assert.equal(captured.request, undefined, 'rc.1 nested request wrapper must be gone')
  assert.deepEqual(captured.prompt, [{ type: 'text', text: 'find sources' }])
  assert.equal(captured.signal, signal)
})
