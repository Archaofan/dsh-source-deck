/** Preserve blur saves and explicit choices across asynchronous Remote writes. */
export class CandidateMutations {
  private readonly pending = new Map<string, Promise<unknown>>()
  run<T>(candidateId: string, operation: () => Promise<T>): Promise<T> {
    const next = (this.pending.get(candidateId) ?? Promise.resolve()).catch(() => {}).then(operation)
    this.pending.set(candidateId, next)
    void next.finally(() => { if (this.pending.get(candidateId) === next) this.pending.delete(candidateId) }).catch(() => {})
    return next
  }
}
