/**
 * Read-only product baseline. Synthetic records live only in memory.
 * No Desktop/profile/network access. Timings exclude Electron, Remote, disk,
 * React and layout; they must never be reported as end-user UI latency.
 * Run from the repository: node docs/research/probes/2026-10-19-experience-baseline.mjs
 */
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { getSet } from '../../../src/ops.ts'
import { formatSourceFacts } from '../../../src/client/source-presentation.ts'

const date = '2026-10-18T08:00:00.000Z'
const source = index => ({
  title: `Synthetic repository ${index}`, url: `https://example.invalid/repo/${index}`,
  origin: 'agent', dedupeKey: `synthetic:${index}`, createdAt: date,
  note: 'Synthetic task-specific explanation; no real user or repository data.',
  meta: { description: 'Synthetic repository description', stars: 12345, language: 'TypeScript',
    license: 'MIT', pushedAt: date, metadataFetchedAt: date },
})

function seededStore(setCount) {
  const tables = new Map()
  const table = name => {
    if (!tables.has(name)) tables.set(name, new Map())
    return tables.get(name)
  }
  const scans = {}
  for (let s = 0; s < setCount; s++) {
    const setId = `set-${s}`
    table('sets').set(setId, { sessionId: `session-${s}`, origin: 'agent', status: 'open', createdAt: date })
    for (let r = 0; r < 3; r++) table('rounds').set(`round-${s}-${r}`, {
      setId, sessionId: `session-${s}`, index: r + 1, request: 'Synthetic request', createdAt: date, status: 'completed',
    })
    for (let c = 0; c < 24; c++) {
      const sourceId = `source-${s}-${c}`
      table('sources').set(sourceId, source(sourceId))
      table('candidates').set(`candidate-${s}-${c}`, {
        setId, sourceId, roundId: `round-${s}-${c % 3}`, verdict: 'pending', createdAt: date,
      })
    }
    // Reference snapshots must not be mistaken for a delivered summary.
    table('selections').set(`reference-${s}`, {
      setId, sessionId: `session-${s}`, kind: 'reference', kept: [], excluded: [],
      requestId: `request-${s}`, submittedAt: date,
    })
  }
  return {
    scans,
    get: (name, key) => table(name).get(key),
    *entries(name) {
      for (const entry of table(name)) { scans[name] = (scans[name] ?? 0) + 1; yield entry }
    },
    put: () => { throw new Error('baseline must not write') },
    delete: () => { throw new Error('baseline must not delete') },
  }
}

function percentile(values, fraction) {
  return Number([...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1].toFixed(3))
}
async function measure(operation, samples = 60) {
  for (let i = 0; i < 10; i++) await operation()
  const times = []
  for (let i = 0; i < samples; i++) {
    const start = performance.now()
    await operation()
    times.push(performance.now() - start)
  }
  return { samples, p50Ms: percentile(times, 0.5), p95Ms: percentile(times, 0.95) }
}

const historyReads = []
for (const totalSets of [1, 100, 1000]) {
  const store = seededStore(totalSets)
  const setId = `set-${totalSets - 1}`
  const view = await getSet(store, setId)
  assert.equal(view.candidates.length, 24)
  assert.equal(view.rounds.length, 3)
  assert.equal(view.deliveryStatus, undefined)
  assert.deepEqual(store.scans, { candidates: totalSets * 24, selections: totalSets, rounds: totalSets * 3 })
  const visitedPerRead = Object.values(store.scans).reduce((a, b) => a + b, 0)
  const scansPerRead = { ...store.scans }
  historyReads.push({ totalSets, visibleCandidates: 24, scansPerRead, visitedPerRead,
    theoreticalVisitsPerMinuteAtTwoSecondInterval: visitedPerRead * 30,
    jsonBytes: Buffer.byteLength(JSON.stringify(view)),
    ...await measure(() => getSet(store, setId)) })
}

const factFormatting = []
for (const callsPerPass of [6, 24, 200]) {
  const records = Array.from({ length: callsPerPass }, (_, i) => source(i))
  assert.equal(formatSourceFacts(records[0], 'zh-CN').stars, '12,345')
  factFormatting.push({ callsPerPass,
    ...await measure(() => { for (const record of records) formatSourceFacts(record, 'zh-CN') }, 30) })
}
// ComparePanel currently formats every source in each of its six dimension rows.
const output = {
  schemaVersion: 1, measuredAtUtc: new Date().toISOString(), node: process.version,
  kind: 'synthetic-in-memory-baseline',
  limitations: 'No disk, Remote, React, Electron, image loading, model requests or field INP measured. Scan counters add instrumentation overhead. Timings vary by machine/run.',
  historyReads, factFormatting, compareFourSourcesFormattingCallsPerRender: 4 * 6,
  deckFullReadIntervalMsInCurrentSource: 2000,
  activityObserverIntervalMsInCurrentSource: 2000,
  activityObserverUsesDirectKeys: true,
}
console.log(JSON.stringify(output, null, 2))
