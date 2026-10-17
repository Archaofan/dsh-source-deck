/**
 * The deck tab: a side-peek screening surface.
 *
 * Layout follows the researched pattern: a persistent header (progress,
 * policy, filters, search), a scrollable candidate list with inline decisions,
 * and a sticky submission footer. The add form is collapsed unless the set is
 * empty, so first-run guidance does not displace the working list.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { CandidateView, SetView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { DeckFace, PolicyView } from './deck-face.ts'
import type { DeckKey } from './locales.ts'
import css from './DeckBody.module.css'

/** The body's composed props: runtime shares, copy, and the injected face. */
export type DeckBodyProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'sourceDeck'>
  & { readonly deck: DeckFace }

type Filter = 'all' | 'pending' | 'kept' | 'excluded'

const FILTERS: readonly Filter[] = ['all', 'pending', 'kept', 'excluded']

function groupsOf(candidates: readonly CandidateView[]) {
  return {
    pending: candidates.filter(entry => entry.candidate.verdict === 'pending'),
    kept: candidates.filter(entry => entry.candidate.verdict === 'kept'),
    excluded: candidates.filter(entry => entry.candidate.verdict === 'excluded'),
  }
}

function domainOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

/** Most actionable order: undecided first, then kept, then excluded. */
const VERDICT_ORDER: Record<Verdict, number> = { pending: 0, kept: 1, excluded: 2 }

/**
 * The deck panel.
 * @param props - session-bound tab shares, copy, and the Remote face.
 * @returns the panel.
 */
export function DeckBody({ sessionId, t, deck }: DeckBodyProps): ReactNode {
  const [view, setView] = useState<SetView | null>(null)
  const [policy, setPolicy] = useState<PolicyView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [reasonFor, setReasonFor] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [undo, setUndo] = useState<{ candidateId: string; title: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const undoTimer = useRef<number | undefined>(undefined)

  const refresh = async (): Promise<void> => {
    try {
      setError(null)
      const [nextView, nextPolicy] = await Promise.all([deck.load(sessionId), deck.loadPolicy()])
      setView(nextView)
      setPolicy(nextPolicy)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setSubmitted(false)
    setSelected(new Set())
    setFilter('all')
    setQuery('')
    setUndo(null)
    void refresh()
    // Reload when the panel is bound to a different session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => () => {
    if (undoTimer.current !== undefined) window.clearTimeout(undoTimer.current)
  }, [])

  const armUndo = (candidateId: string, title: string): void => {
    if (undoTimer.current !== undefined) window.clearTimeout(undoTimer.current)
    setUndo({ candidateId, title })
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  const decide = async (candidateId: string, verdict: Verdict, title: string, reason?: string): Promise<void> => {
    setBusy(true)
    try {
      await deck.decide(candidateId, verdict, reason)
      const nextReasons = { ...reasons }
      if (reason === undefined) delete nextReasons[candidateId]
      else nextReasons[candidateId] = reason
      setReasons(nextReasons)
      if (reason !== undefined) setReasonFor(null)
      await refresh()
      if (verdict !== 'pending') armUndo(candidateId, title)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const add = async (): Promise<void> => {
    const raw = draft.trim()
    if (raw === '') {
      setError(t('add.invalid'))
      return
    }
    setBusy(true)
    try {
      const looksUrl = /^https?:\/\//i.test(raw)
      await deck.add(sessionId, {
        ...(looksUrl ? { url: raw } : { title: raw }),
        ...(note.trim() === '' ? {} : { note: note.trim() }),
      })
      setDraft('')
      setNote('')
      // Keep the form open for rapid batch entry; only the empty-state form
      // collapses when the user chooses to stop adding.
      setAdding(true)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const bulk = async (verdict: Verdict): Promise<void> => {
    if (view === null || selected.size === 0) return
    setBusy(true)
    try {
      const entries = view.candidates.filter(entry => selected.has(entry.candidateId))
      for (const entry of entries) await deck.decide(entry.candidateId, verdict)
      setSelected(new Set())
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (view === null) return
    setBusy(true)
    try {
      const result = await deck.commit(sessionId, view.setId)
      await deck.prompt(sessionId, result.promptText)
      setSubmitted(true)
      setUndo(null)
      setSelected(new Set())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const startFresh = async (): Promise<void> => {
    setBusy(true)
    try {
      await deck.newSet(sessionId)
      setSubmitted(false)
      setAdding(true)
      setSelected(new Set())
      setFilter('all')
      setQuery('')
      setReasonFor(null)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement
    const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      || target.isContentEditable
    if (event.key === '/' && !typing) {
      event.preventDefault()
      searchRef.current?.focus()
      return
    }
    if (event.key === 'Escape') {
      setSelected(new Set())
      setReasonFor(null)
      if (typing) target.blur()
    }
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLLIElement>, entry: CandidateView): void => {
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (event.key === 'k' || event.key === 'K') {
      event.preventDefault()
      void decide(entry.candidateId, 'kept', entry.source.title)
    } else if (event.key === 'x' || event.key === 'X') {
      event.preventDefault()
      void decide(entry.candidateId, 'excluded', entry.source.title)
    } else if (event.key === 'u' || event.key === 'U') {
      if (entry.candidate.verdict !== 'pending') void decide(entry.candidateId, 'pending', entry.source.title)
    } else if (event.key === ' ') {
      event.preventDefault()
      toggleSelected(entry.candidateId)
    }
  }

  const toggleSelected = (candidateId: string): void => {
    setSelected(previous => {
      const next = new Set(previous)
      if (next.has(candidateId)) next.delete(candidateId)
      else next.add(candidateId)
      return next
    })
  }

  if (loading && view === null) {
    return (
      <div className={css.root} data-deck-state="loading" data-deck-tab="deck">
        <div className={css.skeletonHeader} />
        <div className={css.skeletonRow} />
        <div className={css.skeletonRow} />
        <div className={css.skeletonRow} />
      </div>
    )
  }

  const candidates = view?.candidates ?? []
  const counts = groupsOf(candidates)
  const decided = counts.kept.length + counts.excluded.length
  const total = candidates.length
  const progress = total === 0 ? 0 : Math.round((decided / total) * 100)
  const needle = query.trim().toLowerCase()
  const visible = candidates
    .filter(entry => filter === 'all' || entry.candidate.verdict === filter)
    .filter(entry => needle === ''
      || entry.source.title.toLowerCase().includes(needle)
      || (entry.source.url ?? '').toLowerCase().includes(needle)
      || (entry.source.note ?? '').toLowerCase().includes(needle))
    .sort((left, right) => {
      const order = VERDICT_ORDER[left.candidate.verdict] - VERDICT_ORDER[right.candidate.verdict]
      return order !== 0 ? order : left.candidate.createdAt.localeCompare(right.candidate.createdAt)
    })
  const formOpen = adding || total === 0
  const canSubmit = view !== null && decided > 0 && !busy
  const allVisibleSelected = visible.length > 0 && visible.every(entry => selected.has(entry.candidateId))
  const selectAllVisible = (): void => {
    setSelected(previous => {
      const next = new Set(previous)
      for (const entry of visible) {
        if (allVisibleSelected) next.delete(entry.candidateId)
        else next.add(entry.candidateId)
      }
      return next
    })
  }

  return (
    <div className={css.root} data-deck-state={view === null ? 'empty' : 'ready'} data-deck-tab="deck"
      onKeyDown={onRootKeyDown}>
      <header className={css.header}>
        <div className={css.headerTop}>
          <div className={css.titleGroup}>
            <span className={css.title}>{t('panel.title')}</span>
            <span className={css.progressText}>{t('footer.progress', { decided: String(decided), total: String(total) })}</span>
          </div>
          <button type="button" className={css.iconButton} aria-label={t('action.refresh')} title={t('action.refresh')}
            onClick={() => void refresh()}>↻</button>
        </div>
        <div className={css.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span className={css.progressBar} style={{ width: `${progress}%` }} />
        </div>
        {policy === null ? null : (
          <div className={css.policy}>
            <span className={css.policyText} title={policy.summary}>{policy.summary}</span>
          </div>
        )}
      </header>

      <div className={css.tabs} role="tablist" aria-label={t('filter.label')}>
        {FILTERS.map(key => {
          const count = key === 'all' ? total : counts[key as 'pending' | 'kept' | 'excluded'].length
          return (
            <button key={key} type="button" role="tab" aria-selected={filter === key}
              className={filter === key ? css.tabActive : css.tab}
              onClick={() => setFilter(key)}>
              {t(`filter.${key}` as DeckKey)} <span className={css.tabCount}>{count}</span>
            </button>
          )
        })}
      </div>
      <input ref={searchRef} className={css.search} type="search" value={query} aria-label={t('search.label')}
        placeholder={t('search.placeholder')} onChange={event => setQuery(event.target.value)} />

      {total === 0 ? (
        <div className={css.empty}>
          <p className={css.emptyTitle}>{t('empty.title')}</p>
          <p className={css.note}>{t('empty.note')}</p>
          <ol className={css.steps}>
            <li>{t('empty.step1')}</li>
            <li>{t('empty.step2')}</li>
            <li>{t('empty.step3')}</li>
          </ol>
        </div>
      ) : null}

      {!formOpen ? (
        <button type="button" className={css.addToggle} onClick={() => setAdding(true)}>＋ {t('add.expand')}</button>
      ) : (
        <form className={css.addForm} onSubmit={event => { event.preventDefault(); void add() }}>
          <input autoFocus={adding} className={css.input} value={draft} aria-label={t('add.primary')}
            placeholder={t('add.primaryPlaceholder')} disabled={busy}
            onChange={event => setDraft(event.target.value)} />
          <input className={css.input} value={note} aria-label={t('add.note')} placeholder={t('add.notePlaceholder')}
            disabled={busy} onChange={event => setNote(event.target.value)} />
          <div className={css.addActions}>
            <button type="submit" className={css.primary} disabled={busy || draft.trim() === ''}>{t('add.submit')}</button>
            {total === 0 ? null : (
              <button type="button" className={css.button} disabled={busy}
                onClick={() => { setAdding(false); setDraft(''); setNote('') }}>{t('add.cancel')}</button>
            )}
          </div>
        </form>
      )}

      {total === 0 ? null : (
        <div className={css.listToolbar}>
          <label className={css.selectAll}>
            <input type="checkbox" checked={allVisibleSelected} aria-label={t('bulk.selectAll')}
              onChange={selectAllVisible} />
            {t('bulk.selectAll')}
          </label>
          <span className={css.toolbarCount}>{t('bulk.total', { count: String(visible.length) })}</span>
        </div>
      )}

      {selected.size > 0 ? (
        <div className={css.bulkBar}>
          <span>{t('bulk.selected', { count: String(selected.size) })}</span>
          <button type="button" className={css.button} disabled={busy} onClick={() => void bulk('kept')}>{t('action.keepAll')}</button>
          <button type="button" className={css.button} disabled={busy} onClick={() => void bulk('excluded')}>{t('action.excludeAll')}</button>
          <button type="button" className={css.linkButton} onClick={() => setSelected(new Set())}>{t('bulk.clear')}</button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        total === 0 ? null : (
          <div className={css.emptyFilter}>
            <p className={css.note}>{t('filter.none')}</p>
            <button type="button" className={css.linkButton}
              onClick={() => { setFilter('all'); setQuery('') }}>{t('filter.clear')}</button>
          </div>
        )
      ) : (
        <ul className={css.list}>
          {visible.map(entry => (
            <li key={entry.candidateId} className={css.item} tabIndex={0} data-candidate={entry.candidateId}
              aria-label={t('row.label', { title: entry.source.title })}
              onKeyDown={event => onRowKeyDown(event, entry)}>
              <input type="checkbox" className={css.checkbox} checked={selected.has(entry.candidateId)}
                aria-label={t('row.select', { title: entry.source.title })}
                onChange={() => toggleSelected(entry.candidateId)} />
              <div className={css.body}>
                <div className={css.rowTop}>
                  <a className={css.name} href={entry.source.url ?? undefined} target="_blank" rel="noreferrer">
                    {entry.source.title}
                  </a>
                  <span className={`${css.verdict} ${css[entry.candidate.verdict]}`}>{t(`group.${entry.candidate.verdict}` as DeckKey)}</span>
                </div>
                <div className={css.metaRow}>
                  {domainOf(entry.source.url) === undefined ? null : <span className={css.domain}>{domainOf(entry.source.url)}</span>}
                  {entry.source.note === undefined ? null : <span className={css.meta}>{entry.source.note}</span>}
                </div>
                {entry.candidate.policyFlags === undefined || entry.candidate.policyFlags.length === 0 ? null : (
                  <div className={css.flags}>
                    {entry.candidate.policyFlags.map(flag => (
                      <span key={flag} className={css.flag} title={t(`flag.${flag}.hint` as DeckKey)}>
                        {t(`flag.${flag}` as DeckKey)}
                      </span>
                    ))}
                  </div>
                )}
                {entry.candidate.verdict === 'excluded' && reasonFor === entry.candidateId ? (
                  <div className={css.reasonRow}>
                    <input className={css.input} value={reasons[entry.candidateId] ?? entry.candidate.reason ?? ''}
                      placeholder={t('row.reasonPlaceholder')} aria-label={t('row.reason')}
                      onChange={event => setReasons({ ...reasons, [entry.candidateId]: event.target.value })} />
                    <button type="button" className={css.button} disabled={busy}
                      onClick={() => void decide(entry.candidateId, 'excluded', entry.source.title, reasons[entry.candidateId] ?? '')}>
                      {t('row.saveReason')}
                    </button>
                  </div>
                ) : entry.candidate.reason === undefined ? null : (
                  <p className={css.reason}>{entry.candidate.reason}</p>
                )}
                <div className={css.actions}>
                  <button type="button" className={entry.candidate.verdict === 'kept' ? css.actionActive : css.button}
                    aria-pressed={entry.candidate.verdict === 'kept'} disabled={busy}
                    onClick={() => void decide(entry.candidateId, 'kept', entry.source.title)}>{t('action.keep')}</button>
                  <button type="button" className={entry.candidate.verdict === 'excluded' ? css.actionDanger : css.button}
                    aria-pressed={entry.candidate.verdict === 'excluded'} disabled={busy}
                    onClick={() => {
                      setReasonFor(entry.candidateId)
                      void decide(entry.candidateId, 'excluded', entry.source.title)
                    }}>{t('action.exclude')}</button>
                  {entry.candidate.verdict === 'excluded' ? (
                    <button type="button" className={css.linkButton}
                      onClick={() => setReasonFor(entry.candidateId)}>{t('row.reason')}</button>
                  ) : null}
                  {entry.candidate.verdict === 'pending' ? null : (
                    <button type="button" className={css.linkButton} disabled={busy}
                      onClick={() => void decide(entry.candidateId, 'pending', entry.source.title)}>{t('action.undo')}</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {undo === null ? null : (
        <div className={css.toast} role="status">
          <span>{t('toast.decided', { title: undo.title })}</span>
          <button type="button" className={css.linkButton}
            onClick={() => { const current = undo; setUndo(null); if (current) void decide(current.candidateId, 'pending', current.title) }}>
            {t('action.undo')}
          </button>
        </div>
      )}

      {error === null ? null : <p className={css.error}>{t('error.prefix')}{error}</p>}

      <footer className={css.footer}>
        {submitted ? (
          <div className={css.successRow}>
            <span>{t('submit.done')}</span>
            <button type="button" className={css.button}
              onClick={() => void startFresh()}>{t('submit.continue')}</button>
          </div>
        ) : (
          <button type="button" className={css.primary} disabled={!canSubmit} onClick={() => void submit()}>
            {busy ? t('submit.busy') : t('submit.buttonWithCount', { count: String(counts.kept.length) })}
          </button>
        )}
        <p className={css.hint}>{t('footer.hint')}</p>
      </footer>
    </div>
  )
}
