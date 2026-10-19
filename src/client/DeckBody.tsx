import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { UseSidebarRightTabInfo } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { CandidateView, FavoriteView, SetView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { DeckFace } from './deck-face.ts'
import type { DeckKey } from './locales.ts'
import { CandidateCard } from './CandidateCard.tsx'
import { ComparePanel } from './ComparePanel.tsx'
import { CandidateMutations } from './candidate-mutations.ts'
import { retainedDeckTarget } from './activity.ts'
import { safeWebUrl } from './source-presentation.ts'
import { DeckRefresh } from './deck-refresh.ts'
import css from './DeckBody.module.css'

export type DeckBodyProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'sourceDeck'> & { readonly deck: DeckFace; readonly useTabInfo: UseSidebarRightTabInfo }
interface Draft { owner: string; request: string; note: string; reasons: Record<string, string>; compare: string[] }
const emptyDraft = (owner: string): Draft => ({ owner, request: '', note: '', reasons: {}, compare: [] })

export function DeckBody({ sessionId, useTabInfo, t, deck }: DeckBodyProps) {
  const { tab } = useTabInfo()
  const params = tab.navigation.params as { setId?: string; roundId?: string } | undefined
  const [targetSetId, updateTargetSetId] = useState<string | undefined>(() => retainedDeckTarget(window.sessionStorage, sessionId, params?.setId))
  const setTargetSetId = (setId?: string) => updateTargetSetId(retainedDeckTarget(window.sessionStorage, sessionId, setId))
  const [view, setView] = useState<SetView | null>(null)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<readonly FavoriteView[]>([])
  const [mode, setMode] = useState<'deck' | 'favorites'>('deck')
  const [filter, setFilter] = useState<'all' | Verdict>('all')
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [operations, setOperations] = useState<ReadonlySet<string>>(new Set())
  const inFlight = useRef(new Set<string>())
  const candidateMutations = useRef(new CandidateMutations())
  const reader = useRef<{ owner: string; value: DeckRefresh<SetView | null> }>()
  const [documentVisible, setDocumentVisible] = useState(document.visibilityState !== 'hidden')
  const owner = `${sessionId}:${targetSetId ?? 'active'}`
  const currentOwner = useRef(owner); currentOwner.current = owner
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(owner))
  const currentDraft = draft.owner === owner ? draft : emptyDraft(owner)
  const patchDraft = (patch: Partial<Draft>) => setDraft(previous => ({ ...(previous.owner === owner ? previous : emptyDraft(owner)), ...patch }))

  useEffect(() => { setTargetSetId(params?.setId); setMode('deck') }, [sessionId, tab.navigation.revision])
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`source-deck:${owner}`) ?? 'null') as Partial<Draft> | null
      setDraft({ ...emptyDraft(owner), ...(saved && typeof saved.request === 'string' && typeof saved.note === 'string' && saved.reasons && typeof saved.reasons === 'object' && Array.isArray(saved.compare) ? saved : {}), owner })
    } catch { setDraft(emptyDraft(owner)) }
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
      next => { if (currentOwner.current === owner) { setView(next); setLoading(false) } },
      caught => { if (currentOwner.current === owner) { setError(caught instanceof Error ? caught.message : String(caught)); setLoading(false) } },
      next => Boolean(next?.rounds.some(item => item.round.status === 'starting' || item.round.status === 'running')),
    )
    reader.current = { owner, value }
    return () => { value.dispose(); if (reader.current?.value === value) reader.current = undefined }
  }, [deck, sessionId, targetSetId, owner])
  useEffect(() => { reader.current?.value.setEnabled(mode === 'deck' && tab.visible && documentVisible) }, [deck, owner, mode, tab.visible, documentVisible])
  useEffect(() => { let cancelled = false; void deck.listFavorites().then(value => { if (!cancelled) setFavorites(value) }).catch(caught => { if (!cancelled) setError(String(caught)) }); return () => { cancelled = true } }, [deck, mode, sessionId])
  useEffect(() => { if (params?.roundId && view) document.getElementById(`deck-${params.roundId}`)?.scrollIntoView({ block: 'nearest' }) }, [params?.roundId, view?.setId])

  const operate = async (key: string, job: () => Promise<void>) => {
    if (inFlight.current.has(key)) return
    const boundOwner = owner
    inFlight.current.add(key); setOperations(new Set(inFlight.current)); setError(null)
    try { await job() } catch (caught) { if (currentOwner.current === boundOwner) setError(caught instanceof Error ? caught.message : String(caught)) }
    finally { inFlight.current.delete(key); setOperations(new Set(inFlight.current)) }
  }
  const start = (continued: boolean) => operate('start', async () => {
    const request = continued ? view?.rounds.at(-1)?.round.request ?? currentDraft.request : currentDraft.request
    if (!request.trim()) throw new Error(t('search.empty'))
    const result = await deck.startRound(sessionId, request, currentDraft.note || undefined, { mode: continued ? 'continue' : 'new', ...(continued && view ? { setId: view.setId } : {}), requestId: crypto.randomUUID() })
    if (currentOwner.current !== owner) return
    setTargetSetId(result.view.setId); setView(result.view)
  })
  const newTopic = () => operate('new', async () => {
    const created = await deck.newSet(sessionId)
    if (currentOwner.current !== owner) return
    setTargetSetId(created.setId); setQuery(''); setFilter('all'); setMode('deck'); setCompareOpen(false)
  })
  const decide = (entry: CandidateView, verdict: Verdict, reason?: string) => {
    const savedReason = reason ?? currentDraft.reasons[entry.candidateId] ?? entry.candidate.reason
    return candidateMutations.current.run(entry.candidateId, async () => {
      await deck.decide(entry.candidateId, verdict, savedReason)
      await refresh()
    }).catch(caught => { if (currentOwner.current === owner) setError(caught instanceof Error ? caught.message : String(caught)) })
  }
  const favoriteKey = (url?: string, title?: string) => url ?? title ?? ''
  const toggleFavorite = (entry: CandidateView) => operate(`favorite:${entry.candidate.sourceId}`, async () => {
    const saved = favorites.find(item => favoriteKey(item.favorite.url, item.favorite.title) === favoriteKey(entry.source.url, entry.source.title))
    if (saved) await deck.removeFavorite(saved.favoriteId)
    else await deck.addFavorite(entry.source)
    setFavorites(await deck.listFavorites())
  })
  const toggleCompare = (sourceId: string) => {
    const selected = currentDraft.compare
    if (selected.includes(sourceId)) patchDraft({ compare: selected.filter(id => id !== sourceId) })
    else if (selected.length < 4) patchDraft({ compare: [...selected, sourceId] })
    else setError(t('compare.limit'))
  }
  const reference = () => operate('reference', async () => {
    if (!view) return
    const outcome = await deck.reference(sessionId, view.setId)
    if (outcome !== 'inserted') throw new Error(t(outcome === 'draft-changed' ? 'reference.conflict' : 'reference.unavailable'))
    if (currentOwner.current === owner) setNotice(t('reference.done'))
  })
  const sendSummary = () => operate('send', async () => { if (view) { await deck.deliverSelection(sessionId, view.setId); await refresh(); if (currentOwner.current === owner) setNotice(t('submit.done')) } })
  const add = () => operate('add', async () => {
    if (!manual.trim()) return
    await deck.add(sessionId, { ...(safeWebUrl(manual.trim()) ? { url: manual.trim() } : { title: manual.trim() }), ...(view ? { setId: view.setId } : {}) })
    setManual(''); await refresh()
  })
  const addFavorite = (item: FavoriteView) => operate(`library:${item.favoriteId}`, async () => {
    const added = await deck.add(sessionId, { ...item.favorite, ...(view?.set.status === 'open' ? { setId: view.setId } : {}) })
    if (currentOwner.current !== owner) return
    setTargetSetId(added.setId); setMode('deck'); await refresh()
  })

  const candidates = view?.candidates ?? []
  const keptCount = candidates.filter(item => item.candidate.verdict === 'kept').length
  const excludedCount = candidates.filter(item => item.candidate.verdict === 'excluded').length
  const running = view?.rounds.find(item => item.round.status === 'starting' || item.round.status === 'running')
  const readOnly = view?.set.status === 'submitted'
  const shown = candidates.filter(item => (filter === 'all' || item.candidate.verdict === filter) && `${item.source.title} ${item.source.note ?? ''} ${item.source.meta?.description ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const rounds = view?.rounds ?? []
  const groups = [...rounds.map(item => ({ id: item.roundId, index: item.round.index, request: item.round.request, status: item.round.status, diagnostic: item.round.diagnostic, note: item.round.note })),
    ...(candidates.some(item => !item.candidate.roundId) ? [{ id: 'manual', index: 0, request: t('v3.manual'), status: undefined, diagnostic: undefined, note: undefined }] : [])]
  const compareEntries = candidates.filter(item => currentDraft.compare.includes(item.candidate.sourceId))
  const card = (entry: CandidateView) => <CandidateCard key={entry.candidateId} entry={entry} t={t}
    reason={currentDraft.reasons[entry.candidateId] ?? entry.candidate.reason ?? ''}
    favorite={favorites.some(item => favoriteKey(item.favorite.url, item.favorite.title) === favoriteKey(entry.source.url, entry.source.title))}
    compared={currentDraft.compare.includes(entry.candidate.sourceId)} readOnly={readOnly}
    busy={operations.has(`favorite:${entry.candidate.sourceId}`)}
    onReason={value => patchDraft({ reasons: { ...currentDraft.reasons, [entry.candidateId]: value } })}
    onDecide={verdict => void decide(entry, verdict)}
    onSaveReason={() => { const reason = currentDraft.reasons[entry.candidateId]; if (reason !== undefined && reason !== (entry.candidate.reason ?? '')) void decide(entry, entry.candidate.verdict, reason) }}
    onFavorite={() => void toggleFavorite(entry)} onCompare={() => toggleCompare(entry.candidate.sourceId)} />

  return <div className={css.root} data-deck-state={mode}>
    <header className={css.header}>
      <div><span className={css.eyebrow}>SOURCEDECK</span><h2>{t('type.label')}</h2><p>{t('v3.subtitle')}</p></div>
      <button type="button" className={css.button} disabled={operations.has('new')} onClick={() => void newTopic()}>＋ {t('action.newSearch')}</button>
    </header>
    <nav className={css.tabs} aria-label={t('type.label')}>
      <button type="button" aria-pressed={mode === 'deck'} onClick={() => setMode('deck')}>{t('v3.sources')} {candidates.length || ''}</button>
      <button type="button" aria-pressed={mode === 'favorites'} onClick={() => setMode('favorites')}>{t('favorites.title')} {favorites.length || ''}</button>
      <button type="button" aria-pressed={compareOpen} onClick={() => { setCompareOpen(!compareOpen); setMode('deck') }}>{t('compare.title')} {currentDraft.compare.length || ''}</button>
      <button type="button" onClick={() => void operate('refresh', refresh)} aria-label={t('v3.refresh')}>↻</button>
    </nav>
    {error ? <div role="alert" className={css.error}>{error}<button type="button" onClick={() => setError(null)} aria-label={t('v3.dismiss')}>×</button></div> : null}
    {notice ? <p role="status" className={css.notice}>{notice}</p> : null}
    <div className={css.scroll}>
      {mode === 'favorites' ? <section className={css.section}>
        <input className={css.input} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('favorites.search')} aria-label={t('favorites.search')} />
        {favorites.filter(item => `${item.favorite.title} ${item.favorite.note ?? ''}`.toLowerCase().includes(query.toLowerCase())).map(item => <article key={item.favoriteId} className={css.favoriteRow}>
          <strong>{safeWebUrl(item.favorite.url) ? <a href={safeWebUrl(item.favorite.url)} target="_blank" rel="noreferrer">{item.favorite.title}</a> : item.favorite.title}</strong>
          <p>{item.favorite.note ?? item.favorite.meta?.description}</p>
          <button type="button" className={css.button} disabled={operations.has(`library:${item.favoriteId}`)} onClick={() => void addFavorite(item)}>{t('favorites.add')}</button>
          <button type="button" className={css.linkButton} onClick={() => void operate(`library:${item.favoriteId}`, async () => { await deck.removeFavorite(item.favoriteId); setFavorites(await deck.listFavorites()) })}>{t('favorites.remove')}</button>
        </article>)}
        {!favorites.length ? <p className={css.empty}>{t('favorites.empty')}</p> : null}
      </section> : <>
        {compareOpen ? <div className={css.section}><ComparePanel entries={compareEntries} t={t} remove={toggleCompare} /></div> : null}
        <section className={css.searchBox}>
          <label className={css.label} htmlFor={`deck-request-${tab.id}`}>{candidates.length || rounds.length ? t('v3.newRequest') : t('v3.findTitle')}</label>
          <textarea id={`deck-request-${tab.id}`} className={css.textarea} rows={candidates.length || rounds.length ? 2 : 3} value={currentDraft.request} onChange={event => patchDraft({ request: event.target.value })} placeholder={t('search.placeholder')} />
          <div className={css.searchActions}><span>{t('v3.triggerHint')}</span><button type="button" className={css.primary} disabled={operations.has('start')} onClick={() => void start(false)}>{operations.has('start') ? t('search.starting') : t('search.start')}</button></div>
          {!rounds.length && !candidates.length ? <div className={css.examples}>{(['search.example.one', 'search.example.two', 'search.example.three'] as const).map(key => <button type="button" key={key} onClick={() => patchDraft({ request: t(key) })}>{t(key)}</button>)}</div> : null}
        </section>
        {loading ? <p className={css.empty} role="status">{t('v3.loading')}</p> : null}
        {candidates.length ? <div className={css.filterBar}>
          <div className={css.filters}>{(['all', 'pending', 'kept', 'excluded'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(`v3.filter.${value}` as DeckKey)}</button>)}</div>
          <input className={css.input} type="search" aria-label={t('v3.filterSearch')} placeholder={t('v3.filterSearch')} value={query} onChange={event => setQuery(event.target.value)} />
        </div> : null}
        {groups.map(group => {
          const entries = shown.filter(item => (item.candidate.roundId ?? 'manual') === group.id)
          return <section key={group.id} id={`deck-${group.id}`} className={css.section}>
            <div className={css.roundHeading}><span>{group.index ? t('round.title', { index: String(group.index) }) : t('v3.manual')}</span><span className={css.status}>{group.status ? t(`v3.status.${group.status}` as DeckKey) : ''}</span></div>
            {group.index ? <p className={css.roundRequest}>{group.request}</p> : null}
            {group.note ? <p className={css.muted}>{group.note}</p> : null}
            {group.diagnostic ? <p className={css.error} role="status">{group.diagnostic}</p> : null}
            <div className={css.grid}>{entries.map(card)}</div>
            {!entries.length ? <p className={css.empty}>{group.status === 'running' || group.status === 'starting' ? t('round.searching') : t('v3.noNewResults')}</p> : null}
          </section>
        })}
        {!readOnly ? <details className={css.manual}><summary>{t('v3.manual')}</summary><div><input className={css.input} aria-label={t('add.primary')} placeholder={t('add.primary')} value={manual} onChange={event => setManual(event.target.value)} /><button type="button" className={css.button} disabled={operations.has('add') || !manual.trim()} onClick={() => void add()}>{t('add.submit')}</button></div></details> : null}
      </>}
    </div>
    {mode === 'deck' && view && (rounds.length > 0 || candidates.length > 0) ? <footer className={css.footer}>
      <div className={css.summary}><span>✓ {keptCount} · ✕ {excludedCount} · {t('v3.pending')} {candidates.length - keptCount - excludedCount}</span>{running ? <button type="button" className={css.linkButton} disabled={operations.has('cancel')} onClick={() => void operate('cancel', async () => { await deck.cancelRound(sessionId, running.roundId); await refresh() })}>{t('v3.stop')}</button> : null}</div>
      {!readOnly ? <><textarea className={css.textarea} rows={2} aria-label={t('feedback.label')} placeholder={t('feedback.placeholder')} value={currentDraft.note} onChange={event => patchDraft({ note: event.target.value })} />
        <button type="button" className={css.button} disabled={Boolean(running) || operations.has('start')} onClick={() => void start(true)}>{running ? t('v3.background') : t('feedback.continue')}</button></> : <p className={css.muted}>{t('v3.historyReadOnly')}</p>}
      <button type="button" className={css.primary} disabled={!keptCount || operations.has('reference')} onClick={() => void reference()}>{t('reference.button', { count: String(keptCount) })}</button>
      <button type="button" className={css.linkButton} disabled={Boolean(running) || operations.has('send') || !candidates.length || view.deliveryStatus === 'sent'} onClick={() => void sendSummary()}>{view.deliveryStatus === 'sent' ? t('submit.done') : t('reference.direct')}</button>
      <p className={css.footerHint}>{t('v3.referenceHint')}</p>
    </footer> : null}
  </div>
}
