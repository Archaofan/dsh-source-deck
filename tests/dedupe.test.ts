import assert from 'node:assert/strict'
import test from 'node:test'
import { dedupeKey, normalizeUrl } from '../src/dedupe.ts'

test('normalizeUrl lowercases scheme and host and strips default ports', () => {
  assert.equal(normalizeUrl('HTTPS://Example.COM:443/Path'), 'https://example.com/Path')
  assert.equal(normalizeUrl('http://Example.com:80/a'), 'http://example.com/a')
})

test('normalizeUrl drops tracking parameters and fragments and sorts the rest', () => {
  assert.equal(
    normalizeUrl('https://example.com/doc?b=2&utm_source=x&a=1&utm_medium=y#section'),
    'https://example.com/doc?a=1&b=2',
  )
})

test('normalizeUrl removes a trailing slash but keeps the root slash', () => {
  assert.equal(normalizeUrl('https://example.com/path/'), 'https://example.com/path')
  assert.equal(normalizeUrl('https://example.com/'), 'https://example.com/')
})

test('normalizeUrl rejects non-http(s) input', () => {
  assert.equal(normalizeUrl('not a url'), null)
  assert.equal(normalizeUrl('ftp://example.com/file'), null)
})

test('dedupeKey uses the normalized URL when present', () => {
  assert.equal(
    dedupeKey({ url: 'https://Example.com/x/?utm_campaign=c', title: 'Anything' }),
    'url:https://example.com/x',
  )
})

test('dedupeKey falls back to a normalized title when no URL is present', () => {
  assert.equal(dedupeKey({ title: '  Hello   World  ' }), 'title:hello world')
})

test('dedupeKey rejects sources with neither URL nor title', () => {
  assert.throws(() => dedupeKey({ title: '   ' }), /title or url/i)
})
