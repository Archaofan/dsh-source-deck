import type { DeckStore } from './model.ts'
const locks = new WeakMap<DeckStore, Map<string, Promise<unknown>>>()
/** Serialize mutations across async store.put boundaries, without global cross-session blocking. */
export function withStoreLock<T>(store: DeckStore, key: string, operation: () => Promise<T>): Promise<T> {
  let entries = locks.get(store)
  if (!entries) { entries = new Map(); locks.set(store, entries) }
  const next = (entries.get(key) ?? Promise.resolve()).catch(() => {}).then(operation)
  entries.set(key, next)
  void next.finally(() => { if (entries.get(key) === next) entries.delete(key) }).catch(() => {})
  return next
}
