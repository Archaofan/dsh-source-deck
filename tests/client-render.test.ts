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
