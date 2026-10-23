/** Real React component + real domain operations; DOM supplied by the existing sandbox tooling.
 * SOURCEDECK_DOM_RUNTIME must name happy-dom's index.js. No production dependency or Host access.
 */
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createElement, act } from 'react'
import { memoryStore } from '../../../tests/memory-store.ts'
import { addSource, getSet, decide } from '../../../src/ops.ts'
import { zh } from '../../../src/client/locales.ts'

registerHooks({ load(url, context, next) {
  if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, {get: (_, name) => String(name)})' }
  if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText }
  return next(url, context)
} })
assert.ok(process.env.SOURCEDECK_DOM_RUNTIME, 'Set SOURCEDECK_DOM_RUNTIME to the existing happy-dom entry point')
const { Window } = await import(pathToFileURL(process.env.SOURCEDECK_DOM_RUNTIME).href)
const window = new Window({ url: 'http://localhost/' })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'sessionStorage', 'requestAnimationFrame']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? window : key === 'requestAnimationFrame' ? window.requestAnimationFrame.bind(window) : window[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = await import('react-dom/client')
const { DeckBody } = await import('../../../src/client/DeckBody.tsx')
const translate = (key, params = {}) => Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), zh[key] ?? key)
const store = memoryStore()
const first = await addSource(store, { sessionId: 'A', origin: 'user', title: 'Editor A' })
const second = await addSource(store, { sessionId: 'B', origin: 'user', title: 'Editor B' })
await decide(store, { candidateId: first.candidateId, verdict: 'excluded', reason: 'old reason' })
const sets = { A: first.setId, B: second.setId }
let gate
const deck = {
  load: sessionId => getSet(store, sets[sessionId]), loadSet: (_, setId) => getSet(store, setId), listFavorites: async () => [],
  decide: async (candidateId, verdict, reason) => { if (gate && candidateId === first.candidateId) await gate; await decide(store, { candidateId, verdict, reason }) },
}
const container = document.createElement('div'); document.body.append(container)
const root = createRoot(container)
const render = async (sessionId, explicit = true) => act(async () => root.render(createElement(DeckBody, {
  sessionId, deck, t: translate,
  useTabInfo: () => ({ tab: { id: 'test', visible: true, navigation: { revision: `${sessionId}:${explicit}`, params: explicit ? { setId: sets[sessionId] } : {} } } }),
})))
const buttons = () => [...container.querySelectorAll('button')]
const undoButton = () => buttons().find(button => button.textContent.startsWith('↶'))
const keepButton = () => buttons().find(button => button.textContent === '✓ 保留')
const click = async button => { assert.ok(button); await act(async () => button.click()) }

try {
  await render('A'); await click(keepButton())
  assert.ok(undoButton(), 'Confirmed decision exposes undo')
  let release; gate = new Promise(resolve => { release = resolve })
  await click(undoButton())
  assert.equal(keepButton().disabled, true, 'Verdicts must be locked while undo is awaiting Remote')
  assert.equal(container.querySelector('input[aria-label="筛选原因"]')?.disabled ?? [...container.querySelectorAll('input')].find(input => input.value === 'old reason')?.disabled, true,
    'Reason input must be locked while undo is awaiting Remote')
  await render('B'); await click(keepButton())
  assert.ok(undoButton()?.textContent.includes('Editor B'))
  await act(async () => { gate = undefined; release() })
  assert.ok(undoButton()?.textContent.includes('Editor B'), 'Old-topic completion cannot clear the new topic undo')
  assert.equal(store.get('candidates', first.candidateId).verdict, 'excluded')
  assert.equal(store.get('candidates', first.candidateId).reason, 'old reason')
  await click(undoButton())
  assert.equal(store.get('candidates', second.candidateId).verdict, 'pending')
  assert.equal(store.get('candidates', second.candidateId).reason, undefined)
  await addSource(store, { sessionId: 'B', origin: 'user', title: 'Other editor', target: { setId: second.setId } })
  await click(buttons().find(button => button.getAttribute('aria-label') === '刷新资料'))
  const compare = () => buttons().filter(button => button.textContent === '对比')
  await click(compare()[0]); await click(compare()[0])
  const remove = [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === '移出对比 · Editor B')
  remove.focus(); await click(remove)
  await act(async () => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))))
  assert.equal(document.activeElement.getAttribute('aria-label'), '移出对比 · Other editor', 'Removing a comparison chip keeps focus on the neighboring chip')
  window.sessionStorage.removeItem('source-deck:target:A')
  await render('A', false)
  await click(buttons().find(button => button.textContent === '对比'))
  await act(async () => { const select = container.querySelector('select'); select.value = 'stars'; select.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await render('A', true)
  assert.ok(container.querySelector('[data-compare-selection]'), 'Opening the same topic through a historical card retains comparison membership')
  assert.equal(container.querySelector('select').value, 'stars', 'Opening the same topic through another entry retains sorting')
  console.log(JSON.stringify({ kind: 'react-dom-domain-interaction', checks: ['undo edit lock', 'stale owner completion', 'prior verdict/reason restored', 'undefined reason restored', 'neighboring comparison focus', 'same-topic entry retention'], passed: true }))
} finally { await act(async () => root.unmount()); await window.happyDOM.close() }
