/** Serial full reads. Navigation intent polling remains a separate responsibility. */
export class DeckRefresh<T> {
  private enabled = false
  private disposed = false
  private dirty = false
  private running = false
  private current: Promise<void> | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly read: () => Promise<T>
  private readonly accept: (value: T) => void
  private readonly failed: (error: unknown) => void
  private readonly isRunning: (value: T) => boolean

  constructor(read: () => Promise<T>, accept: (value: T) => void, failed: (error: unknown) => void, isRunning: (value: T) => boolean) {
    this.read = read; this.accept = accept; this.failed = failed; this.isRunning = isRunning
  }

  setEnabled(enabled: boolean): void {
    if (this.disposed || enabled === this.enabled) return
    this.enabled = enabled; this.clearTimer()
    if (enabled) void this.refresh().catch(() => {})
  }

  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve()
    this.dirty = true; this.clearTimer()
    if (this.current) return this.current
    this.current = Promise.resolve().then(async () => {
      do {
        this.dirty = false
        try {
          const value = await this.read()
          if (this.disposed) return
          this.running = this.isRunning(value); this.accept(value)
        } catch (error) {
          if (this.disposed) return
          this.failed(error); throw error
        }
      } while (this.dirty && !this.disposed)
    }).finally(() => { this.current = undefined; this.schedule() })
    return this.current
  }

  dispose(): void { this.disposed = true; this.enabled = false; this.dirty = false; this.clearTimer() }

  private clearTimer(): void { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined }
  private schedule(): void {
    this.clearTimer()
    if (this.disposed || !this.enabled) return
    this.timer = setTimeout(() => { void this.refresh().catch(() => {}) }, this.running ? 2000 : 30_000)
  }
}
