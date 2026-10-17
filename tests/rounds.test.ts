import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addFavorite, addSource, clearData, decide, getSet, listFavorites, removeFavorite, startRound,
} from '../src/ops.ts'
import { recentConversation } from '../src/conversation-context.ts'
import type { DeckStore } from '../src/model.ts'

function memoryStore(): DeckStore {
  const tables = new Map<string, Map<string, unknown>>()
  const table = (name: string) => {
    let current = tables.get(name)
    if (current === undefined) {
      current = new Map()
      tables.set(name, current)
    }
    return current
  }
  return {
    entries: name => table(name).entries(),
    get: (name, key) => table(name).get(key),
    put: (name, key, value) => { table(name).set(key, value) },
    delete: (name, key) => { table(name).delete(key) },
  }
}

test('startRound creates a round and tags later candidates with it', async () => {
  const store = memoryStore()
  const round = await startRound(store, { sessionId: 's', request: 'Find markdown editors' })
  assert.equal(round.round.index, 1)
  assert.match(round.promptText, /Find markdown editors/)
  const added = await addSource(store, { sessionId: 's', origin: 'agent', title: 'Editor', url: 'https://example.com/editor' })
  assert.equal(added.setId, round.round.setId)
  const view = await getSet(store, added.setId)
  assert.equal(view.rounds.length, 1)
  assert.equal(view.candidates[0]?.candidate.roundId, round.roundId)
})

test('the next round prompt carries kept, excluded and the user note', async () => {
  const store = memoryStore()
  const first = await startRound(store, { sessionId: 's', request: 'Find editors' })
  const keep = await addSource(store, { sessionId: 's', origin: 'agent', title: 'Keep me', url: 'https://example.com/keep' })
  const drop = await addSource(store, { sessionId: 's', origin: 'agent', title: 'Drop me', url: 'https://example.com/drop' })
  await decide(store, { candidateId: keep.candidateId, verdict: 'kept' })
  await decide(store, { candidateId: drop.candidateId, verdict: 'excluded', reason: 'too old' })
  const second = await startRound(store, { sessionId: 's', request: 'Find more editors', note: 'TypeScript only' })
  assert.equal(second.round.index, 2)
  assert.equal(second.round.setId, first.round.setId)
  assert.match(second.promptText, /Keep me/)
  assert.match(second.promptText, /too old/)
  assert.match(second.promptText, /TypeScript only/)
  assert.match(second.promptText, /这是续搜/)
  assert.match(second.promptText, /4 个左右/)
  assert.match(second.promptText, /补充说明优先/)
})

test('favorites dedupe, list newest first, and remove', async () => {
  const store = memoryStore()
  const first = await addFavorite(store, { title: 'Docs', url: 'https://example.com/docs?utm_source=x' })
  const duplicate = await addFavorite(store, { title: 'Docs', url: 'https://example.com/docs' })
  assert.equal(duplicate.favoriteId, first.favoriteId)
  await addFavorite(store, { title: 'Other', url: 'https://example.com/other' })
  const list = listFavorites(store)
  assert.equal(list.length, 2)
  await removeFavorite(store, first.favoriteId)
  assert.equal(listFavorites(store).length, 1)
})

test('clearData removes rounds and favorites too', async () => {
  const store = memoryStore()
  await startRound(store, { sessionId: 's', request: 'Find something' })
  await addFavorite(store, { title: 'Docs', url: 'https://example.com/docs' })
  await clearData(store)
  assert.equal([...store.entries('rounds')].length, 0)
  assert.equal([...store.entries('favorites')].length, 0)
})

test('recentConversation recaps chat turns and skips deck noise', () => {
  const events = [
    { type: 'user/message', data: { content: [{ type: 'text', text: '我在调研 Go 日志库，偏好 zap' }] } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '可以看 zap 和 zerolog' }] } } },
    { type: 'user/message', data: { content: [{ type: 'text', text: 'Current runtime context. This snapshot supersedes...' }] } },
    { type: 'user/message', data: { content: [{ type: 'text', text: 'Time sampled while preparing turn 1, step 1: 2026-10-17T20:21:20+08:00' }] } },
    { type: 'user/message', data: { content: [{ type: 'text', text: '请帮我找资料，直接执行' }] } },
  ]
  const session = {
    seq: events.length,
    eventAt: (index: number) => events[index],
  } as unknown as Parameters<typeof recentConversation>[0]
  const recap = recentConversation(session)
  assert.match(recap ?? '', /Go 日志库/)
  assert.match(recap ?? '', /zerolog/)
  assert.doesNotMatch(recap ?? '', /请帮我找资料/)
  assert.doesNotMatch(recap ?? '', /Current runtime context/)
  assert.doesNotMatch(recap ?? '', /Time sampled/)
})
