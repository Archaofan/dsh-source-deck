import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeFlags, DEFAULT_POLICY, normalizePolicy, policySummary,
} from '../src/scope-policy.ts'

const github = normalizePolicy({
  kind: 'github',
  params: {
    minStars: 500,
    updatedWithinMonths: 6,
    languages: ['Go'],
    excludeForks: true,
    excludeArchived: true,
  },
})

test('github policy flags low stars, stale updates, forks and archived sources', () => {
  const now = Date.parse('2026-10-17T00:00:00Z')
  const flags = computeFlags(github, {
    stars: 42,
    pushedAt: '2025-01-01T00:00:00Z',
    language: 'Go',
    fork: true,
    archived: true,
  }, 'https://github.com/example/repo', now)
  assert.deepEqual(flags.sort(), ['archived', 'fork', 'stale', 'stars-below'])
})

test('github policy flags a disallowed language and passes a compliant source', () => {
  const now = Date.parse('2026-10-17T00:00:00Z')
  assert.deepEqual(
    computeFlags(github, { stars: 900, pushedAt: '2026-09-01T00:00:00Z', language: 'Rust' }, 'https://github.com/a/b', now),
    ['language-not-allowed'],
  )
  assert.deepEqual(
    computeFlags(github, { stars: 900, pushedAt: '2026-09-01T00:00:00Z', language: 'Go' }, 'https://github.com/a/b', now),
    [],
  )
})

test('missing metadata dimensions do not produce flags', () => {
  const now = Date.parse('2026-10-17T00:00:00Z')
  assert.deepEqual(computeFlags(github, {}, 'https://github.com/a/b', now), [])
})

test('web policy blocks and allow-lists hosts', () => {
  const web = normalizePolicy({
    kind: 'web',
    params: { domainsAllow: ['docs.example.com', 'example.com'], domainsBlock: ['spam.test'] },
  })
  assert.deepEqual(computeFlags(web, {}, 'https://spam.test/a'), ['domain-blocked'])
  assert.deepEqual(computeFlags(web, {}, 'https://other.test/a'), ['domain-not-allowed'])
  assert.deepEqual(computeFlags(web, {}, 'https://docs.example.com/a'), [])
  assert.deepEqual(computeFlags(web, {}, 'https://sub.example.com/a'), [])
})

test('llm-freeform policy never flags', () => {
  const llm = normalizePolicy({ kind: 'llm-freeform', params: { guidance: '优先官方文档' } })
  assert.deepEqual(computeFlags(llm, { stars: 1 }, 'https://example.com/a'), [])
})

test('policySummary describes each kind', () => {
  assert.match(policySummary(github), /GitHub/)
  assert.match(policySummary(github), /500/)
  assert.match(policySummary(normalizePolicy({ kind: 'web', params: { domainsBlock: ['spam.test'] } })), /spam\.test/)
  assert.match(policySummary(normalizePolicy({ kind: 'llm-freeform', params: { guidance: '官方文档' } })), /官方文档/)
})

test('normalizePolicy rejects an unknown kind and invalid numbers', () => {
  assert.throws(() => normalizePolicy({ kind: 'rss', params: {} }), /kind/i)
  assert.throws(() => normalizePolicy({ kind: 'github', params: { minStars: -1 } }), /minStars/i)
})

test('DEFAULT_POLICY is a permissive llm-freeform policy', () => {
  const policy = normalizePolicy(DEFAULT_POLICY)
  assert.equal(policy.kind, 'llm-freeform')
  assert.deepEqual(computeFlags(policy, { stars: 1 }, 'https://example.com/a'), [])
})
