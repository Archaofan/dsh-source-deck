/** Preserve blur saves and explicit choices across asynchronous Remote writes. */
export class CandidateMutations {
  private readonly pending = new Map<string, Promise<unknown>>()
  private readonly latest = new Map<string, { operation: () => Promise<unknown>; promise: Promise<unknown> }>()
  /** At most one waiting explicit choice; reason writes still use the ordered queue. */
  runLatest<T>(candidateId: string, operation: () => Promise<T>): Promise<T> {
    const waiting = this.latest.get(candidateId)
    if (waiting) { waiting.operation = operation; return waiting.promise as Promise<T> }
    const entry = { operation: operation as () => Promise<unknown>, promise: undefined as unknown as Promise<unknown> }
    entry.promise = this.run(candidateId, () => { this.latest.delete(candidateId); return entry.operation() })
    this.latest.set(candidateId, entry)
    return entry.promise as Promise<T>
  }
  run<T>(candidateId: string, operation: () => Promise<T>): Promise<T> {
    const next = (this.pending.get(candidateId) ?? Promise.resolve()).catch(() => {}).then(operation)
    this.pending.set(candidateId, next)
    void next.finally(() => { if (this.pending.get(candidateId) === next) this.pending.delete(candidateId) }).catch(() => {})
    return next
  }
}
