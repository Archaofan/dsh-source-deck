import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { UseSidebarRightTabInfo } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { CandidateView, FavoriteView, SetView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { DeckFace } from './deck-face.ts'
import type { DeckKey } from './locales.ts'
import { CandidateCard } from './CandidateCard.tsx'
import { ComparePanel, CompareSelection } from './ComparePanel.tsx'
import { CandidateMutations, DecisionUndo, type UndoDecision } from './candidate-mutations.ts'
import { retainedDeckTarget, retainLoadedDeckTarget } from './activity.ts'
import { safeWebUrl } from './source-presentation.ts'
import { DeckRefresh } from './deck-refresh.ts'
import { favoriteIdentity, projectDeck, sourceMatches, compareSources, comparisonEntries, deckSorts, type DeckSort } from './deck-projection.ts'
import css from './DeckBody.module.css'

export type DeckBodyProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'sourceDeck'> & { readonly deck: DeckFace; readonly useTabInfo: UseSidebarRightTabInfo }
interface Draft { owner: string; request: string; note: string; reasons: Record<string, string>; compare: string[]; query?: string; favoriteQuery?: string; filter?: 'all' | Verdict; sort?: DeckSort; favoriteSort?: DeckSort }
const emptyDraft = (owner: string): Draft => ({ owner, request: '', note: '', reasons: {}, compare: [] })

export function DeckBody({ sessionId, useTabInfo, t, deck }: DeckBodyProps) {
  const { tab } = useTabInfo()
  const params = tab.navigation.params as { setId?: string; roundId?: string } | undefined
  const [targetSetId, updateTargetSetId] = useState<string | undefined>(() => retainedDeckTarget(window.sessionStorage, sessionId, params?.setId))
  const setTargetSetId = (setId?: string) => updateTargetSetId(retainedDeckTarget(window.sessionStorage, sessionId, setId))
  const owner = `${sessionId}:${targetSetId ?? 'active'}`
  const currentOwner = useRef(owner); currentOwner.current = owner
  const undoHistory = useMemo(() => new DecisionUndo(), [owner])
  const [undoAction, setUndoAction] = useState<UndoDecision>()
  const latestView = useRef<{ owner: string; value: SetView | null }>({ owner, value: null })
  const [viewState, setViewState] = useState<{ owner: string; value: SetView | null }>({ owner, value: null })
  const view = viewState.owner === owner ? viewState.value : null
  const setView = useCallback((value: SetView | null) => {
    latestView.current = { owner, value }; undoHistory.observe(value); setUndoAction(undoHistory.available(value))
    setViewState(previous => previous.owner === owner && previous.value === value ? previous : { owner, value })
  }, [owner, undoHistory])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<readonly FavoriteView[]>([])
  const [mode, setMode] = useState<'deck' | 'favorites'>('deck')
  const [manual, setManual] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [editor, setEditor] = useState({ owner, kind: 'none' as 'none' | 'new' | 'refine' })
  const editorKind = editor.owner === owner ? editor.kind : 'none'
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [allOperations, setOperations] = useState<ReadonlySet<string>>(new Set())
  const operationPrefix = `${owner}\0`
  const operations = new Set([...allOperations].filter(key => key.startsWith(operationPrefix)).map(key => key.slice(operationPrefix.length)))
  const deliveryBusy = operations.has('reference') || operations.has('send') || operations.has('undo')
  const inFlight = useRef(new Set<string>())
  const candidateMutations = useMemo(() => new CandidateMutations(), [owner])
  const candidatePending = useRef(new Map<string, number>())
  const decisionPending = useRef(new Map<string, number>())
  const candidateAttempt = useRef(new Map<string, number>())
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())
  const [deciding, setDeciding] = useState<ReadonlySet<string>>(new Set())
  const [candidateErrors, setCandidateErrors] = useState<Record<string, string>>({})
  const reader = useRef<{ owner: string; value: DeckRefresh<SetView | null> }>()
  const [documentVisible, setDocumentVisible] = useState(document.visibilityState !== 'hidden')
  const scroll = useRef<HTMLDivElement>(null)
  const resultFocus = useRef<HTMLParagraphElement>(null)
  const compareFocus = useRef<HTMLHeadingElement>(null)
  const compareButton = useRef<HTMLButtonElement>(null)
  const requestInput = useRef<HTMLTextAreaElement>(null)
  const refineInput = useRef<HTMLTextAreaElement>(null)
  const newButton = useRef<HTMLButtonElement>(null)
  const refineButton = useRef<HTMLButtonElement>(null)
  const returnLocation = useRef<{ owner: string; top: number; focus: HTMLElement | null }>()
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(owner))
  const currentDraft = draft.owner === owner ? draft : emptyDraft(owner)
  const patchDraft = (patch: Partial<Draft>) => setDraft(previous => ({ ...(previous.owner === owner ? previous : emptyDraft(owner)), ...patch }))
  const query = typeof currentDraft.query === 'string' ? currentDraft.query : ''
  const favoriteQuery = typeof currentDraft.favoriteQuery === 'string' ? currentDraft.favoriteQuery : ''
  const filter = ['all', 'pending', 'kept', 'excluded'].includes(currentDraft.filter ?? '') ? currentDraft.filter! : 'all'
  const sort = deckSorts.includes(currentDraft.sort!) ? currentDraft.sort! : 'original'
  const favoriteSort = deckSorts.includes(currentDraft.favoriteSort!) ? currentDraft.favoriteSort! : 'original'
  const setQuery = (value: string) => patchDraft({ query: value })
  const setFilter = (value: 'all' | Verdict) => patchDraft({ filter: value })

  useEffect(() => { setTargetSetId(params?.setId); setMode('deck'); setCompareOpen(false) }, [sessionId, tab.navigation.revision])
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`source-deck:${owner}`) ?? 'null') as Partial<Draft> | null
      setDraft({ ...emptyDraft(owner), ...(saved && typeof saved.request === 'string' && typeof saved.note === 'string' && saved.reasons && typeof saved.reasons === 'object' && Array.isArray(saved.compare) ? saved : {}), owner })
    } catch { setDraft(emptyDraft(owner)) }
    setCandidateErrors({})
  }, [owner])
  useEffect(() => { try { sessionStorage.setItem(`source-deck:${draft.owner}`, JSON.stringify(draft)) } catch { /* Editing remains available if storage is full. */ } }, [draft])
  const refresh = useCallback(() => reader.current?.owner === owner ? reader.current.value.refresh() : Promise.resolve(), [owner])
  useEffect(() => {
    const changed = () => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])
  useEffect(() => {
    setLoading(true); setView(null); setError(null); setNotice(null)
    const value = new DeckRefresh(
      () => targetSetId ? deck.loadSet(sessionId, targetSetId) : deck.load(sessionId),
      next => { if (currentOwner.current === owner) {
        if (!targetSetId && next) { retainLoadedDeckTarget(window.sessionStorage, sessionId, next.setId); setTargetSetId(next.setId); return }
        setView(next); setLoading(false)
      } },
      caught => { if (currentOwner.current === owner) { setError(caught instanceof Error ? caught.message : String(caught)); setLoading(false) } },
      next => Boolean(next?.rounds.some(item => item.round.status === 'starting' || item.round.status === 'running')),
    )
    reader.current = { owner, value }
    return () => { value.dispose(); if (reader.current?.value === value) reader.current = undefined }
  }, [deck, sessionId, targetSetId, owner, setView])
  useEffect(() => { reader.current?.value.setEnabled(mode === 'deck' && tab.visible && documentVisible) }, [deck, owner, mode, tab.visible, documentVisible])
  useEffect(() => { let cancelled = false; void deck.listFavorites().then(value => { if (!cancelled) setFavorites(value) }).catch(caught => { if (!cancelled) setError(String(caught)) }); return () => { cancelled = true } }, [deck, mode, sessionId])
  useEffect(() => { if (params?.roundId && view) document.getElementById(`deck-${params.roundId}`)?.scrollIntoView({ block: 'nearest' }) }, [params?.roundId, view?.setId])
  useEffect(() => {
    if (editorKind === 'new') requestInput.current?.focus()
    if (editorKind === 'refine') refineInput.current?.focus()
  }, [owner, editorKind])
  useEffect(() => {
    if (compareOpen) { if (scroll.current) scroll.current.scrollTop = 0; compareFocus.current?.focus({ preventScroll: true }) }
    else if (returnLocation.current?.owner === owner) {
      if (scroll.current) scroll.current.scrollTop = returnLocation.current.top
      const target = returnLocation.current.focus
      if (target?.isConnected) target.focus({ preventScroll: true }); else (compareButton.current ?? resultFocus.current)?.focus({ preventScroll: true })
      returnLocation.current = undefined
    } else returnLocation.current = undefined
  }, [compareOpen, owner])

  const operate = async (key: string, job: () => Promise<void>) => {
    key = operationPrefix + key
    if (inFlight.current.has(key)) return
    const boundOwner = owner
    inFlight.current.add(key); setOperations(new Set(inFlight.current)); setError(null)
    try { await job() } catch (caught) { if (currentOwner.current === boundOwner) setError(caught instanceof Error ? caught.message : String(caught)) }
    finally { inFlight.current.delete(key); setOperations(new Set(inFlight.current)) }
  }
  const start = (continued: boolean) => operate('start', async () => {
    const request = continued ? view?.rounds.at(-1)?.round.request ?? currentDraft.request : currentDraft.request
    if (!request.trim()) throw new Error(t('search.empty'))
    const result = await deck.startRound(sessionId, request, continued ? currentDraft.note || undefined : undefined, { mode: continued ? 'continue' : 'new', ...(continued && view ? { setId: view.setId } : {}), requestId: crypto.randomUUID() })
    if (currentOwner.current !== owner) return
    setEditor({ owner, kind: 'none' }); setTargetSetId(result.view.setId); setView(result.view)
    if (continued) await refresh()
  })
  const newTopic = () => {
    returnLocation.current = undefined; setMode('deck'); setCompareOpen(false); setEditor({ owner, kind: 'new' })
  }
  const closeEditor = () => {
    setEditor({ owner, kind: 'none' })
    ;(editorKind === 'refine' ? refineButton : newButton).current?.focus({ preventScroll: true })
  }
  const openCompare = () => {
    returnLocation.current = { owner, top: scroll.current?.scrollTop ?? 0, focus: document.activeElement instanceof HTMLElement ? document.activeElement : null }
    setCompareOpen(true)
  }
  const decide = async (entry: CandidateView, verdict: Verdict, reason?: string, explicit = true) => {
    const id = entry.candidateId
    const undoTicket = explicit ? undoHistory.begin(id) : undefined
    if (!explicit) undoHistory.invalidate(id)
    setUndoAction(undoHistory.available(view))
    const attempt = (candidateAttempt.current.get(id) ?? 0) + 1
    candidateAttempt.current.set(id, attempt); setError(null)
    const savedReason = reason ?? currentDraft.reasons[id] ?? entry.candidate.reason
    const trigger = explicit && document.activeElement instanceof HTMLElement ? document.activeElement : null
    const ids = trigger?.closest('article[data-candidate-id]') ? Array.from(scroll.current?.querySelectorAll<HTMLElement>('article[data-candidate-id]') ?? []).map(item => item.dataset.candidateId!) : []
    const index = ids.indexOf(id)
    const neighbors = [...ids.slice(index + 1), ...ids.slice(0, index).reverse()]
    candidatePending.current.set(id, (candidatePending.current.get(id) ?? 0) + 1); setSaving(new Set(candidatePending.current.keys()))
    if (explicit) { decisionPending.current.set(id, (decisionPending.current.get(id) ?? 0) + 1); setDeciding(new Set(decisionPending.current.keys())) }
    setCandidateErrors(previous => { const next = { ...previous }; delete next[id]; return next })
    try {
      const job = async () => {
        const before = latestView.current.owner === owner ? latestView.current.value?.candidates.find(item => item.candidateId === id) : undefined
        await deck.decide(id, verdict, savedReason); await refresh()
        if (undoTicket !== undefined && before && currentOwner.current === owner && candidateAttempt.current.get(id) === attempt) {
          const after = latestView.current.value?.candidates.find(item => item.candidateId === id)
          if (after && after.candidate.verdict === verdict && after.candidate.reason === savedReason) {
            undoHistory.confirm(undoTicket, before, after); setUndoAction(undoHistory.available(latestView.current.value))
          }
        }
      }
      await (explicit ? candidateMutations.runLatest(id, job) : candidateMutations.run(id, job))
      if (trigger && currentOwner.current === owner) requestAnimationFrame(() => {
        if (currentOwner.current !== owner || trigger.isConnected || (document.activeElement !== document.body && document.activeElement !== trigger)) return
        const articles = Array.from(scroll.current?.querySelectorAll<HTMLElement>('article[data-candidate-id]') ?? [])
        const next = neighbors.map(candidateId => articles.find(item => item.dataset.candidateId === candidateId)).find(Boolean)
        const control = next?.querySelector<HTMLButtonElement>('button[aria-pressed]:not(:disabled)')
        if (control) control.focus({ preventScroll: true }); else resultFocus.current?.focus({ preventScroll: true })
      })
    } catch (caught) { if (currentOwner.current === owner && candidateAttempt.current.get(id) === attempt) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setCandidateErrors(previous => ({ ...previous, [id]: message })); setError(`${entry.source.title}: ${message}`)
    } }
    finally {
      for (const [pending, update] of [[candidatePending, setSaving], ...(explicit ? [[decisionPending, setDeciding] as const] : [])] as const) {
        const count = (pending.current.get(id) ?? 1) - 1
        if (count) pending.current.set(id, count); else pending.current.delete(id)
        update(new Set(pending.current.keys()))
      }
    }
  }
  const favoritesByIdentity = useMemo(() => new Map(favorites.map(item => [favoriteIdentity(item.favorite), item])), [favorites])
  const toggleFavorite = (entry: CandidateView) => operate(`favorite:${entry.candidate.sourceId}`, async () => {
    const saved = favoritesByIdentity.get(favoriteIdentity(entry.source))
    if (saved) await deck.removeFavorite(saved.favoriteId); else await deck.addFavorite(entry.source)
    setFavorites(await deck.listFavorites())
  })
  const toggleCompare = (sourceId: string) => {
    const selected = comparisonEntries(view?.candidates ?? [], currentDraft.compare).map(item => item.candidate.sourceId)
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const selection = trigger?.closest('[data-compare-selection]')
    const selectionIndex = Array.from(selection?.querySelectorAll('li button') ?? []).indexOf(trigger as Element)
    if (selected.includes(sourceId)) {
      patchDraft({ compare: selected.filter(id => id !== sourceId) })
      requestAnimationFrame(() => {
        if (currentOwner.current !== owner || !trigger || trigger.isConnected || document.activeElement !== document.body) return
        const remaining = selection?.isConnected ? selection.querySelectorAll<HTMLButtonElement>('li button') : undefined
        ;(remaining?.[Math.min(selectionIndex, remaining.length - 1)] ?? (compareOpen ? compareFocus.current : resultFocus.current))?.focus({ preventScroll: true })
      })
    }
    else if (selected.length < 4) patchDraft({ compare: [...selected, sourceId] })
  }
  const undo = () => operate('undo', async () => {
    const action = undoAction
    const trigger = document.activeElement
    if (!action) return
    await candidateMutations.run(action.candidateId, async () => {
      await refresh()
      if (currentOwner.current !== owner || undoHistory.available(latestView.current.value) !== action) throw new Error(t('undo.conflict'))
      await deck.decide(action.candidateId, action.before.verdict, action.before.reason)
      undoHistory.invalidate()
      if (currentOwner.current === owner) {
        setUndoAction(undefined)
        setDraft(previous => previous.owner === owner ? { ...previous, reasons: { ...previous.reasons, [action.candidateId]: action.before.reason ?? '' } } : previous)
        setNotice(t('undo.done', { title: action.title }))
        if (document.activeElement === trigger || document.activeElement === document.body) resultFocus.current?.focus({ preventScroll: true })
      }
      await refresh()
    })
  })
  const reference = () => operate('reference', () => candidateMutations.withSettledWrites(async () => {
    if (!view) return
    const outcome = await deck.reference(sessionId, view.setId)
    if (outcome !== 'inserted') throw new Error(t(outcome === 'draft-changed' ? 'reference.conflict' : 'reference.unavailable'))
    if (currentOwner.current === owner) setNotice(t('reference.done'))
  }))
  const sendSummary = () => operate('send', () => candidateMutations.withSettledWrites(async () => { if (view) { await deck.deliverSelection(sessionId, view.setId); await refresh(); if (currentOwner.current === owner) setNotice(t('submit.done')) } }))
  const add = () => operate('add', async () => {
    if (!manual.trim()) return
    await deck.add(sessionId, { ...(safeWebUrl(manual.trim()) ? { url: manual.trim() } : { title: manual.trim() }), ...(view ? { setId: view.setId } : {}) })
    if (currentOwner.current === owner) { setManual(''); await refresh() }
  })
  const addFavorite = (item: FavoriteView) => operate(`library:${item.favoriteId}`, async () => {
    const added = await deck.add(sessionId, { ...item.favorite, ...(view?.set.status === 'open' ? { setId: view.setId } : {}) })
    if (currentOwner.current !== owner) return
    setTargetSetId(added.setId); setMode('deck'); await refresh()
  })
  const projection = useMemo(() => projectDeck(view, filter, query, sort), [view, filter, query, sort])
  const candidates = view?.candidates ?? []
  const rounds = view?.rounds ?? []
  const running = rounds.find(item => item.round.status === 'starting' || item.round.status === 'running')
  const latest = rounds.at(-1)
  const readOnly = view?.set.status === 'submitted'
  const hasContent = Boolean(candidates.length || rounds.length)
  const showRequest = !loading && (!hasContent || editorKind === 'new')
  const compareEntries = useMemo(() => comparisonEntries(candidates, currentDraft.compare), [view, currentDraft.compare])
  const shownFavorites = useMemo(() => favorites.filter(item => sourceMatches(item.favorite, favoriteQuery)).sort((a, b) => compareSources(a.favorite, b.favorite, favoriteSort)), [favorites, favoriteQuery, favoriteSort])
  const sortControl = (value: DeckSort, change: (sort: DeckSort) => void) => <label className={css.sort}>{t('sort.label')}<select value={value} onChange={event => change(event.target.value as DeckSort)}>{deckSorts.map(item => <option key={item} value={item}>{t(`sort.${item}`)}</option>)}</select></label>
  const card = (entry: CandidateView) => <CandidateCard key={entry.candidateId} entry={entry} t={t}
    reason={currentDraft.reasons[entry.candidateId] ?? entry.candidate.reason ?? ''}
    favorite={favoritesByIdentity.has(favoriteIdentity(entry.source))} compared={currentDraft.compare.includes(entry.candidate.sourceId)} readOnly={readOnly || deliveryBusy}
    busy={operations.has(`favorite:${entry.candidate.sourceId}`)} saving={saving.has(entry.candidateId)} deciding={deciding.has(entry.candidateId)} error={candidateErrors[entry.candidateId]}
    compareFull={compareEntries.length >= 4}
    onReason={value => { undoHistory.invalidate(entry.candidateId); setUndoAction(undoHistory.available(view)); patchDraft({ reasons: { ...currentDraft.reasons, [entry.candidateId]: value } }) }}
    onDecide={verdict => void decide(entry, verdict)}
    onSaveReason={() => { const reason = currentDraft.reasons[entry.candidateId]; if (reason !== undefined && reason !== (entry.candidate.reason ?? '')) void decide(entry, entry.candidate.verdict, reason, false) }}
    onFavorite={() => void toggleFavorite(entry)} onCompare={() => toggleCompare(entry.candidate.sourceId)} />

  return <div className={css.root} data-deck-state={mode} onKeyDown={event => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return
    const details = (event.target as HTMLElement).closest('details')
    if (details?.open) { details.open = false; details.querySelector('summary')?.focus(); event.preventDefault(); event.stopPropagation() }
  }}>
    <header className={css.header}>
      <div><h2 title={latest?.round.request}>{latest?.round.request || t('type.label')}</h2>{!hasContent ? <p>{t('v3.subtitle')}</p> : null}</div>
      <button ref={newButton} type="button" className={css.button} onClick={newTopic}>＋ {t('action.newSearch')}</button>
    </header>
    <nav className={css.tabs} aria-label={t('type.label')}>
      <button type="button" aria-pressed={mode === 'deck'} onClick={() => { setMode('deck'); setCompareOpen(false) }}>{t('v3.sources')} {candidates.length || ''}</button>
      <button type="button" aria-pressed={mode === 'favorites'} onClick={() => setMode('favorites')}>{t('favorites.title')} {favorites.length || ''}</button>
      <button type="button" onClick={() => void operate('refresh', mode === 'favorites' ? async () => setFavorites(await deck.listFavorites()) : refresh)} aria-label={t('v3.refresh')}>↻</button>
    </nav>
    {error ? <div role="alert" className={css.error}>{error}<button type="button" onClick={() => setError(null)} aria-label={t('v3.dismiss')}>×</button></div> : null}
    {notice ? <p role="status" className={css.notice}>{notice}</p> : null}
    <div ref={scroll} className={css.scroll}>
      {mode === 'favorites' ? <section className={css.section}>
        <input className={css.input} type="search" value={favoriteQuery} onChange={event => patchDraft({ favoriteQuery: event.target.value })} placeholder={t('favorites.search')} aria-label={t('favorites.search')} />
        {sortControl(favoriteSort, value => patchDraft({ favoriteSort: value }))}
        {shownFavorites.map(item => <article key={item.favoriteId} className={css.favoriteRow}>
          <strong>{safeWebUrl(item.favorite.url) ? <a href={safeWebUrl(item.favorite.url)} target="_blank" rel="noreferrer">{item.favorite.title}</a> : item.favorite.title}</strong><p>{item.favorite.note ?? item.favorite.meta?.description}</p>
          <button type="button" className={css.button} disabled={operations.has(`library:${item.favoriteId}`)} onClick={() => void addFavorite(item)}>{t('favorites.add')}</button>
          <button type="button" className={css.linkButton} disabled={operations.has(`library:${item.favoriteId}`)} onClick={() => void operate(`library:${item.favoriteId}`, async () => { await deck.removeFavorite(item.favoriteId); setFavorites(await deck.listFavorites()) })}>{t('favorites.remove')}</button>
        </article>)}
        {!shownFavorites.length ? <p className={css.empty}>{favorites.length ? t('ux.noMatches') : t('favorites.empty')}</p> : null}
      </section> : <>
        {compareOpen ? <section className={css.section}>
          <button type="button" className={css.button} onClick={() => setCompareOpen(false)}>← {t('ux.backToResults')}</button>
          <h2 ref={compareFocus} tabIndex={-1} className={css.compareHeading}>{t('compare.title')}</h2>
          <ComparePanel entries={compareEntries} t={t} remove={toggleCompare} />
        </section> : null}
        <div hidden={compareOpen}>
          {showRequest ? <section className={css.searchBox}>
            <label className={css.label} htmlFor={`deck-request-${tab.id}`}>{hasContent ? t('v3.newRequest') : t('v3.findTitle')}</label>
            <textarea ref={requestInput} id={`deck-request-${tab.id}`} className={css.textarea} rows={3} value={currentDraft.request} onChange={event => patchDraft({ request: event.target.value })} placeholder={t('search.placeholder')} onKeyDown={event => { if (hasContent && event.key === 'Escape' && !event.nativeEvent.isComposing) { closeEditor(); event.stopPropagation() } }} />
            <div className={css.searchActions}>{!hasContent ? <span>{t('v3.triggerHint')}</span> : <button type="button" className={css.linkButton} onClick={closeEditor}>{t('ux.cancel')}</button>}<button type="button" className={css.primary} disabled={operations.has('start')} onClick={() => void start(false)}>{operations.has('start') ? t('search.starting') : t('search.start')}</button></div>
            {!hasContent ? <div className={css.examples}>{(['search.example.one', 'search.example.two', 'search.example.three'] as const).map(key => <button type="button" key={key} onClick={() => patchDraft({ request: t(key) })}>{t(key)}</button>)}</div> : null}
          </section> : null}
          {loading ? <p className={css.section} role="status">{t('v3.loading')}</p> : null}
          {candidates.length ? <div className={css.filterBar}>
            <div className={css.filters}>{(['all', 'pending', 'kept', 'excluded'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(`v3.filter.${value}` as DeckKey)} {projection.counts[value]}</button>)}</div>
            <input className={css.input} type="search" aria-label={t('v3.filterSearch')} placeholder={t('v3.filterSearch')} value={query} onChange={event => setQuery(event.target.value)} />
            {sortControl(sort, value => patchDraft({ sort: value }))}
          </div> : null}
          <p ref={resultFocus} tabIndex={-1} className={css.resultStatus} aria-live="polite">{hasContent ? t('ux.resultCount', { shown: String(projection.shown.length), total: String(candidates.length) }) : ''}</p>
          {compareEntries.length ? <CompareSelection entries={compareEntries} t={t} remove={toggleCompare} clear={() => { patchDraft({ compare: [] }); resultFocus.current?.focus({ preventScroll: true }) }} open={openCompare} /> : null}
          {candidates.length > 0 && !projection.shown.length ? <div className={css.section}><p>{t('ux.noMatches')}</p><button type="button" className={css.button} onClick={() => patchDraft({ query: '', filter: 'all' })}>{t('ux.clearFilters')}</button></div> : null}
          {projection.groups.filter(group => group.entries.length || !projection.filtered || group.status === 'running' || group.status === 'starting' || group.diagnostic).map(group => <section key={group.id} id={`deck-${group.id}`} className={css.section}>
            <div className={css.roundHeading}><span>{group.index ? t('round.title', { index: String(group.index) }) : t('ux.manualGroup')} · {group.entries.length}/{group.total}</span><span className={css.status}>{group.status ? t(`v3.status.${group.status}` as DeckKey) : ''}</span></div>
            {group.index && rounds.length > 1 ? <p className={css.roundRequest}>{group.request}</p> : null}
            {group.note ? <p className={css.muted}>{group.note}</p> : null}{group.diagnostic ? <p className={css.error} role="status">{group.diagnostic}</p> : null}
            <div className={css.grid}>{group.entries.map(card)}</div>
            {!group.total ? <p className={css.empty}>{group.status === 'running' || group.status === 'starting' ? t('round.searching') : t('ux.noNewResults')}</p> : null}
          </section>)}
          {!readOnly ? <details className={css.manual}><summary>{t('v3.manual')}</summary><div><input className={css.input} aria-label={t('add.primary')} placeholder={t('add.primary')} value={manual} onChange={event => setManual(event.target.value)} /><button type="button" className={css.button} disabled={deliveryBusy || operations.has('add') || !manual.trim()} onClick={() => void add()}>{t('add.submit')}</button></div></details> : null}
        </div>
      </>}
    </div>
    {mode === 'deck' && view && hasContent ? <footer className={css.footer}>
      {undoAction && undoHistory.available(view) === undoAction ? <button type="button" className={`${css.linkButton} ${css.undo}`} title={t('undo.button', { title: undoAction.title })} disabled={deliveryBusy || operations.has('undo') || saving.size > 0} onClick={() => void undo()}>{t('undo.button', { title: undoAction.title })}</button> : null}
      <div className={css.summary}><span>✓ {projection.counts.kept} · ✕ {projection.counts.excluded} · {t('v3.pending')} {projection.counts.pending}</span>{running ? <button type="button" className={css.linkButton} disabled={operations.has('cancel')} onClick={() => void operate('cancel', async () => { await deck.cancelRound(sessionId, running.roundId); await refresh() })}>{t('v3.stop')}</button> : latest?.round.status ? <span>{t(`v3.status.${latest.round.status}` as DeckKey)}</span> : null}</div>
      <button type="button" className={css.primary} disabled={!projection.counts.kept || deliveryBusy} onClick={() => void reference()}>{t('reference.button', { count: String(projection.counts.kept) })}</button>
      <div className={css.secondaryActions}>
        {!readOnly ? <button ref={refineButton} type="button" className={css.linkButton} disabled={Boolean(running)} aria-expanded={editorKind === 'refine'} onClick={() => { if (!latest) newTopic(); else if (editorKind === 'refine') closeEditor(); else { setCompareOpen(false); setEditor({ owner, kind: 'refine' }) } }}>{t(latest ? 'ux.refine' : 'search.start')}</button> : null}
        {compareEntries.length > 0 && !compareOpen ? <button ref={compareButton} type="button" className={css.linkButton} onClick={openCompare}>{t('compare.title')} ({compareEntries.length}/4)</button> : null}
        <details className={css.more}><summary>{t('ux.more')}</summary><div><p>{t('ux.directHint')}</p><button type="button" className={css.button} disabled={Boolean(running) || deliveryBusy || !candidates.length || view.deliveryStatus === 'sent'} onClick={() => void sendSummary()}>{view.deliveryStatus === 'sent' ? t('submit.done') : t('reference.direct')}</button></div></details>
      </div>
      {editorKind === 'refine' && !readOnly ? <div className={css.refineEditor}><textarea ref={refineInput} className={css.textarea} rows={2} aria-label={t('feedback.label')} placeholder={t('feedback.placeholder')} value={currentDraft.note} onChange={event => patchDraft({ note: event.target.value })} onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing) { closeEditor(); event.stopPropagation() } }} /><div className={css.searchActions}><button type="button" className={css.linkButton} onClick={closeEditor}>{t('ux.cancel')}</button><button type="button" className={css.button} disabled={Boolean(running) || operations.has('start')} onClick={() => void start(true)}>{operations.has('start') ? t('search.starting') : t('feedback.continue')}</button></div></div> : null}
      {readOnly ? <p className={css.muted}>{t('v3.historyReadOnly')}</p> : null}
    </footer> : null}
  </div>
}
