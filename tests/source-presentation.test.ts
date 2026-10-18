import assert from 'node:assert/strict'
import test from 'node:test'
const source = (meta: object = {}) => ({ title: 'Library', url: 'https://github.com/owner/repo', origin: 'agent' as const, dedupeKey: 'repo', createdAt: '2026-10-18T00:00:00Z', meta })
test('source facts distinguish zero, unknown, update and lookup dates', async () => {
  const { formatSourceFacts } = await import('../src/client/source-presentation.ts')
  const facts = formatSourceFacts(source({ stars: 0, pushedAt: '2026-10-01T00:00:00Z', metadataFetchedAt: '2026-10-18T00:00:00Z' }), 'en-US')
  assert.equal(facts.stars, '0'); assert.notEqual(facts.updated, facts.checked)
  assert.equal(formatSourceFacts(source(), 'en-US').stars, 'Unknown')
  assert.equal(formatSourceFacts(source({ pushedAt: 'invalid' }), 'en-US').updated, 'Unknown')
  assert.equal(formatSourceFacts(source(), 'en-US').checked, 'Unknown')
})
test('source images prefer project image and use a safe owner fallback', async () => {
  const { sourceImages } = await import('../src/client/source-presentation.ts')
  const images = sourceImages(source({ image: 'https://example.com/logo.svg', owner: 'owner' }))
  assert.equal(images[0], 'https://example.com/logo.svg'); assert.equal(images.length, 2)
  for (const image of ['javascript:alert(1)', 'file:///secret', 'https://user:pass@example.com/image']) {
    assert.ok(!sourceImages(source({ image })).includes(image))
  }
})

test('verified metadata refresh replaces stale global source facts', async () => {
  const { memoryStore } = await import('./memory-store.ts')
  const { addSource, getSet, startNewSet } = await import('../src/ops.ts')
  const store = memoryStore()
  await addSource(store, { sessionId: 's', origin: 'agent', url: 'https://github.com/a/b', meta: { stars: 1, metadataFetchedAt: '2026-10-01T00:00:00Z' } })
  await startNewSet(store, 's', 'agent')
  const added = await addSource(store, { sessionId: 's', origin: 'agent', url: 'https://github.com/a/b', meta: { stars: 2, metadataFetchedAt: '2026-10-18T00:00:00Z' } })
  assert.equal((await getSet(store, added.setId)).candidates[0]?.source.meta?.stars, 2)
})
