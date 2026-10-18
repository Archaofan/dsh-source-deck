import type { DeckStore } from '../src/model.ts'

export function memoryStore(persistAsync = false): DeckStore {
  const tables = new Map<string, Map<string, unknown>>()
  const table = (name: string) => {
    let value = tables.get(name)
    if (!value) { value = new Map(); tables.set(name, value) }
    return value
  }
  return {
    get: (name, key) => table(name).get(key),
    entries: name => table(name).entries(),
    put: async (name, key, value) => {
      if (persistAsync) await new Promise(resolve => setTimeout(resolve, 0))
      table(name).set(key, value)
    },
    delete: (name, key) => { table(name).delete(key) },
  }
}
