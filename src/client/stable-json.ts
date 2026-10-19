/** Reuse the last identical fresh wire response. Never skips a Host request. */
export class StableJson<T> {
  private raw: string | undefined
  private value!: T
  decode(raw: string): T {
    if (raw === this.raw) return this.value
    const value = JSON.parse(raw) as T
    this.raw = raw; this.value = value
    return value
  }
}
