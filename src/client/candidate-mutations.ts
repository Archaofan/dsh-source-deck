import type { CandidateView } from '../ops.ts'
import type { CandidateRecord } from '../model.ts'

type UndoView = { set: { status: string }; candidates: readonly CandidateView[] } | null
export interface UndoDecision {
  candidateId: string; title: string; before: CandidateRecord; after: CandidateRecord
}
const sameDecision = (a: CandidateRecord, b: CandidateRecord) => a.verdict === b.verdict && a.reason === b.reason && a.decidedAt === b.decidedAt

/** One confirmed local action; observation of another write permanently expires it. */
export class DecisionUndo {
  private revision = 0
  private action?: UndoDecision
  private pendingCandidate?: string
  begin(candidateId?: string): number { this.action = undefined; this.pendingCandidate = candidateId; return ++this.revision }
  confirm(revision: number, before: CandidateView, after: CandidateView): void {
    if (revision !== this.revision || before.candidateId !== after.candidateId || (before.candidate.verdict === after.candidate.verdict && before.candidate.reason === after.candidate.reason)) return
    this.action = { candidateId: before.candidateId, title: before.source.title, before: { ...before.candidate }, after: { ...after.candidate } }
  }
  available(view: UndoView): UndoDecision | undefined {
    const current = view?.candidates.find(entry => entry.candidateId === this.action?.candidateId)
    return this.action && view?.set.status === 'open' && current && sameDecision(current.candidate, this.action.after) ? this.action : undefined
  }
  observe(view: UndoView): void { if (this.action && !this.available(view)) this.begin() }
  invalidate(candidateId?: string): void { if (!candidateId || this.action?.candidateId === candidateId || this.pendingCandidate === candidateId) this.begin() }
}

/** Preserve blur saves and explicit choices across asynchronous Remote writes. */
export class CandidateMutations {
  private handoff = false
  private readonly pending = new Map<string, Promise<unknown>>()
  private readonly latest = new Map<string, { operation: () => Promise<unknown>; promise: Promise<unknown> }>()
  /** At most one waiting explicit choice; reason writes still use the ordered queue. */
  runLatest<T>(candidateId: string, operation: () => Promise<T>): Promise<T> {
    if (this.handoff) return Promise.reject(new Error('Candidate handoff is in progress'))
    const waiting = this.latest.get(candidateId)
    if (waiting) { waiting.operation = operation; return waiting.promise as Promise<T> }
    const entry = { operation: operation as () => Promise<unknown>, promise: undefined as unknown as Promise<unknown> }
    entry.promise = this.run(candidateId, () => { this.latest.delete(candidateId); return entry.operation() })
    this.latest.set(candidateId, entry)
    return entry.promise as Promise<T>
  }
  run<T>(candidateId: string, operation: () => Promise<T>): Promise<T> {
    if (this.handoff) return Promise.reject(new Error('Candidate handoff is in progress'))
    const next = (this.pending.get(candidateId) ?? Promise.resolve()).catch(() => {}).then(operation)
    this.pending.set(candidateId, next)
    void next.finally(() => { if (this.pending.get(candidateId) === next) this.pending.delete(candidateId) }).catch(() => {})
    return next
  }
  async withSettledWrites<T>(operation: () => Promise<T>): Promise<T> {
    if (this.handoff) throw new Error('Candidate handoff is in progress')
    this.handoff = true
    try {
      while (this.pending.size) await Promise.all(this.pending.values())
      return await operation()
    } finally { this.handoff = false }
  }
}
