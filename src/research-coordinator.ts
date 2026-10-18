import type { DeckStore, ResearchTarget } from './model.ts'
import { clearData as clearDeckData, getSet, type StartRoundResult } from './ops.ts'
import { prepareResearchRound, finishResearchRound, interruptResearchRounds, resolveResearchTarget, setResearchRunning } from './research-ops.ts'

/** Structural public service contracts; the original Agent object is retained. */
export interface ResearchParent { readonly session: { readonly id: string }; readonly conversation?: string }
export interface ResearchActivation {
  readonly result: Promise<{ readonly stopReason: string; readonly diagnostic?: string }>
  dispose(): Promise<void>
}
export interface ResearchRuntime {
  resolveParent(sessionId: string): Promise<ResearchParent>
  start(input: { parent: ResearchParent; target: ResearchTarget; promptText: string; signal: AbortSignal }): Promise<ResearchActivation>
}
export interface ResearchStartInput {
  readonly sessionId: string
  readonly request: string
  readonly note?: string
  readonly requestId: string
  readonly mode: 'new' | 'continue'
  readonly setId?: string
}
interface ActiveResearch {
  readonly target: ResearchTarget
  readonly controller: AbortController
  handle?: ResearchActivation
  timer?: ReturnType<typeof setTimeout>
}

export class ResearchCoordinator {
  private readonly runtime: ResearchRuntime
  private readonly changed: (sessionId: string, setId: string) => void
  private readonly timeoutMs: number
  private readonly store: Promise<DeckStore>
  private readonly active = new Map<string, ActiveResearch>()
  private readonly queues = new Map<string, Promise<unknown>>()
  private closed = false
  private clearing?: Promise<void>

  constructor(getStore: () => Promise<DeckStore>, runtime: ResearchRuntime, changed: (sessionId: string, setId: string) => void, timeoutMs = 300000) {
    this.runtime = runtime; this.changed = changed; this.timeoutMs = timeoutMs
    this.store = getStore().then(async store => { await interruptResearchRounds(store); return store })
    // Store initialization failure is surfaced on the first user operation.
    void this.store.catch(() => {})
  }

  async targetForWorker(workerSessionId: string): Promise<ResearchTarget | undefined> {
    return resolveResearchTarget(await this.store, workerSessionId)
  }

  start(input: ResearchStartInput): Promise<StartRoundResult & { target: ResearchTarget }> {
    const previous = this.queues.get(input.sessionId) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(() => this.startLocked(input))
    this.queues.set(input.sessionId, next)
    void next.finally(() => { if (this.queues.get(input.sessionId) === next) this.queues.delete(input.sessionId) }).catch(() => {})
    return next
  }

  private async startLocked(input: ResearchStartInput): Promise<StartRoundResult & { target: ResearchTarget }> {
    if (this.closed || this.clearing) throw new Error('research service is closed or clearing data')
    const store = await this.store
    const parent = await this.runtime.resolveParent(input.sessionId)
    if (this.closed || this.clearing) throw new Error('research service is closed or clearing data')
    if (parent.session.id !== input.sessionId) throw new Error('resolved parent does not belong to this session')
    const workerSessionId = crypto.randomUUID()
    const result = await prepareResearchRound(store, { ...input, workerSessionId, ...(parent.conversation ? { conversation: parent.conversation } : {}) })
    if (this.closed || this.clearing) throw new Error('research service is closed or clearing data')
    if (result.target.workerSessionId !== workerSessionId) return result
    const task: ActiveResearch = { target: result.target, controller: new AbortController() }
    this.active.set(result.roundId, task)
    task.timer = setTimeout(() => { void this.stop(task, 'failed', 'Research timed out after five minutes.').catch(() => {}) }, this.timeoutMs)
    // Node timers must not keep the Host alive after its context is disposed.
    ;(task.timer as unknown as { unref?(): void }).unref?.()
    try {
      const handle = await this.runtime.start({ parent, target: result.target, promptText: result.promptText, signal: task.controller.signal })
      task.handle = handle
      if (task.controller.signal.aborted || this.closed) { await handle.dispose(); throw new Error('research cancelled during startup') }
      await setResearchRunning(store, result.target)
      this.changed(input.sessionId, result.target.setId)
      void handle.result.then(async outcome => {
        await finishResearchRound(store, { target: task.target,
          status: outcome.stopReason === 'completed' ? 'completed' : outcome.stopReason === 'aborted' ? 'cancelled' : 'failed',
          ...(outcome.diagnostic ? { diagnostic: outcome.diagnostic } : outcome.stopReason === 'completed' ? {} : { diagnostic: `Research ended: ${outcome.stopReason}` }),
        })
      }, async () => {
        await finishResearchRound(store, { target: task.target, status: 'failed', diagnostic: 'Research execution failed; retry this round.' })
      }).finally(() => this.release(task)).catch(() => {})
      return { ...result, view: await getSet(store, result.target.setId) }
    } catch (error) {
      await finishResearchRound(store, { target: task.target, status: 'failed', diagnostic: error instanceof Error ? error.message : 'Could not start research.' })
      this.release(task)
      throw error
    }
  }

  private release(task: ActiveResearch): void {
    clearTimeout(task.timer)
    if (this.active.get(task.target.roundId) === task) this.active.delete(task.target.roundId)
    this.changed(task.target.parentSessionId, task.target.setId)
  }

  private async stop(task: ActiveResearch, status: 'cancelled' | 'failed', diagnostic?: string): Promise<void> {
    await finishResearchRound(await this.store, { target: task.target, status, ...(diagnostic ? { diagnostic } : {}) })
    task.controller.abort()
    try { await task.handle?.dispose() } finally { this.release(task) }
  }

  async cancel(sessionId: string, roundId: string): Promise<void> {
    const store = await this.store
    const round = store.get('rounds', roundId) as { sessionId?: string } | undefined
    if (!round || round.sessionId !== sessionId) throw new Error('research round does not belong to this session')
    const task = this.active.get(roundId)
    if (task) await this.stop(task, 'cancelled')
  }

  async dispose(): Promise<void> {
    this.closed = true
    await Promise.allSettled([...this.active.values()].map(task => this.stop(task, 'cancelled')))
  }

  clearData(): Promise<void> {
    if (this.clearing) return this.clearing
    this.clearing = Promise.resolve().then(async () => {
      await Promise.all([...this.active.values()].map(task => this.stop(task, 'cancelled')))
      // Admissions that already passed their first check must settle before deletion.
      await Promise.allSettled([...this.queues.values()])
      await Promise.all([...this.active.values()].map(task => this.stop(task, 'cancelled')))
      await clearDeckData(await this.store)
    })
    void this.clearing.finally(() => { this.clearing = undefined }).catch(() => {})
    return this.clearing
  }
}
