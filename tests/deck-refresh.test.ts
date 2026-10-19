import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate as turn } from 'node:timers/promises'
import { DeckRefresh } from '../src/client/deck-refresh.ts'

test('terminal idle reads twice per minute after initialization; running reads every two seconds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let running = false; let reads = 0
  const reader = new DeckRefresh(async () => { reads++; return { running } }, () => {}, () => {}, value => value.running)
  t.after(() => reader.dispose())
  reader.setEnabled(true); await turn()
  assert.equal(reads, 1)
  t.mock.timers.tick(30_000); await turn()
  t.mock.timers.tick(30_000); await turn()
  assert.equal(reads, 3)
  running = true; await reader.refresh()
  const before = reads
  t.mock.timers.tick(1999); await turn(); assert.equal(reads, before)
  t.mock.timers.tick(1); await turn(); assert.equal(reads, before + 1)
})

test('refreshes during a slow read coalesce into one trailing read without overlap', async () => {
  let release!: () => void; let reads = 0; let concurrent = 0; let maxConcurrent = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  const accepted: number[] = []
  const reader = new DeckRefresh(async () => {
    const value = ++reads; concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent)
    if (value === 1) await gate
    concurrent--; return value
  }, value => accepted.push(value), () => {}, () => false)
  const first = reader.refresh(); await turn()
  const second = reader.refresh(); const third = reader.refresh()
  release(); await Promise.all([first, second, third])
  assert.equal(reads, 2); assert.equal(maxConcurrent, 1)
  assert.deepEqual(accepted, [1, 2]); reader.dispose()
})

test('pause cancels periodic reads, resume refreshes, and disposal ignores a late response', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let reads = 0; const accepted: number[] = []
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const reader = new DeckRefresh(async () => { reads++; if (reads === 2) await gate; return reads }, value => accepted.push(value), () => {}, () => false)
  reader.setEnabled(true); await turn()
  reader.setEnabled(false); t.mock.timers.tick(60_000); await turn()
  assert.equal(reads, 1)
  reader.setEnabled(true); await turn(); assert.equal(reads, 2)
  reader.dispose(); release(); await turn()
  t.mock.timers.tick(60_000); await turn()
  assert.deepEqual(accepted, [1]); assert.equal(reads, 2)
})

test('a failed read reports once and remains retryable', async () => {
  let failed = true; const errors: string[] = []; const accepted: string[] = []
  const reader = new DeckRefresh(async () => { if (failed) throw new Error('offline'); return 'restored' },
    value => accepted.push(value), error => errors.push(String(error)), () => false)
  await assert.rejects(reader.refresh(), /offline/)
  failed = false; await reader.refresh()
  assert.deepEqual(errors, ['Error: offline']); assert.deepEqual(accepted, ['restored'])
  reader.dispose()
})

test('a failed old read cannot consume a successful write invalidation queued during that read', async () => {
  let release!: () => void; let began!: () => void; let reads = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { began = resolve })
  const accepted: string[] = []; const errors: unknown[] = []
  const reader = new DeckRefresh(async () => {
    if (++reads === 1) { began(); await gate; throw new Error('obsolete read failed') }
    return 'after-successful-write'
  }, value => accepted.push(value), error => errors.push(error), () => false)
  const first = reader.refresh(); await started
  const afterWrite = reader.refresh()
  release(); await Promise.all([first, afterWrite])
  assert.equal(reads, 2); assert.deepEqual(accepted, ['after-successful-write']); assert.deepEqual(errors, [])
  reader.dispose()
})
