import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

// Test the actual component; CSS is irrelevant to the semantic disclosure contract.
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, {get: (_, name) => String(name)})' }
  if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText }
  return nextLoad(url, context)
} })
globalThis.document = { documentElement: { lang: 'en' } } as Document

const candidate = (id: string, source: object) => ({ candidateId: id,
  candidate: { setId: 's', sourceId: id, verdict: 'pending' as const, createdAt: '2026-10-20' },
  source: { title: id, origin: 'agent' as const, dedupeKey: id, createdAt: '2026-10-20', ...source },
})

test('screening note leads the card while the full note and project description both remain readable', async () => {
  const { CandidateCard } = await import('../src/client/CandidateCard.tsx')
  const note = 'Fits offline editing; synchronization still needs verification. '.repeat(8)
  const description = 'A general-purpose text editor.'
  const html = renderToStaticMarkup(createElement(CandidateCard, {
    entry: candidate('Editor', { note, meta: { description } }),
    t: key => key, reason: '', favorite: false, compared: false, busy: false, readOnly: false,
    onReason() {}, onDecide() {}, onSaveReason() {}, onFavorite() {}, onCompare() {},
  }))
  const preview = html.slice(0, html.indexOf('<details'))
  assert.ok(preview.includes(note), 'The task-specific note must not be replaced by generic metadata')
  const details = html.slice(html.indexOf('<details'))
  assert.ok(details.includes(note), 'The clamped note must remain readable in full')
  assert.ok(details.includes(description), 'The factual project description must remain accessible')
})

test('comparison keeps task relevance separate from description and identifies every source in each dimension', async () => {
  const { ComparePanel } = await import('../src/client/ComparePanel.tsx')
  const html = renderToStaticMarkup(createElement(ComparePanel, {
    entries: [candidate('Editor A', { note: 'Works offline', meta: { description: 'Text editor', stars: 0 } }),
      candidate('Editor B', { url: 'javascript:alert(1)', meta: { description: 'Web editor' } })],
    t: key => key, remove() {},
  }))
  assert.ok(html.includes('Works offline'), 'Comparison must expose the same screening note as the card')
  assert.ok(html.includes('Text editor'))
  assert.ok(html.includes('Web editor'))
  assert.ok(html.includes('scope="col"'))
  assert.ok(html.includes('scope="row"'))
  assert.ok((html.match(/Editor A/g) ?? []).length >= 4, 'Narrow dimension values must identify their source')
  assert.ok(!html.includes('href="javascript:'))
})

test('generic web and title-only long descriptions have an accessible full-detail disclosure', async () => {
  const { CandidateCard } = await import('../src/client/CandidateCard.tsx')
  const description = 'A relevant detail that must remain readable. '.repeat(20)
  for (const source of [{ title: 'Web', url: 'https://example.invalid', note: description }, { title: 'Title only', snippet: description }]) {
    const html = renderToStaticMarkup(createElement(CandidateCard, {
      entry: { candidateId: 'c', candidate: { setId: 's', sourceId: 'src', verdict: 'pending', createdAt: '2026-10-19' },
        source: { origin: 'user', dedupeKey: 'source', createdAt: '2026-10-19', ...source } },
      t: key => key, reason: '', favorite: false, compared: false, busy: false, readOnly: false,
      onReason() {}, onDecide() {}, onSaveReason() {}, onFavorite() {}, onCompare() {},
    }))
    const details = html.slice(html.indexOf('<details'))
    assert.ok(details.includes('<summary>ux.sourceDetails</summary>'))
    assert.ok(details.includes(description))
  }
})
