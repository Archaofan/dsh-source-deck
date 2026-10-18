/**
 * The deck tab: a conversation-shaped screening surface driven by the current
 * session's model.
 *
 * A round starts with a plain-language request; the deck asks the Agent to
 * search with its normal tools and submit candidates. Each round renders as a
 * card grid. The user's checks/crosses and an optional note become the next
 * round's brief, so no site configuration or regex is required.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { CandidateView, FavoriteView, SetView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { DeckFace } from './deck-face.ts'
import type { DeckKey } from './locales.ts'
import css from './DeckBody.module.css'

/** The body's composed props: runtime shares, copy, and the injected face. */
export type DeckBodyProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'sourceDeck'>
  & { readonly deck: DeckFace }

type Mode = 'deck' | 'favorites'

const EXAMPLES = ['search.example.one', 'search.example.two', 'search.example.three'] as const

function formatStars(stars: number | undefined): string | undefined {
  if (stars === undefined) return undefined
  if (stars >= 1000) return `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k`
  return String(stars)
}

function avatarOf(entry: CandidateView, image?: string): string | undefined {
  if (image !== undefined) return image
  const meta = entry.source.meta
  if (meta?.image !== undefined) return meta.image
  const owner = meta?.owner
  return owner === undefined ? undefined : `https://github.com/${owner}.png?size=80`
}

/**
 * The deck panel.
 * @param props - session-bound tab shares, copy, and the Remote face.
 * @returns the panel.
 */
export function DeckBody({ sessionId, t, deck }: DeckBodyProps): ReactNode {
  const [view, setView] = useState<SetView | null>(null)
  const [favorites, setFavorites] = useState<readonly FavoriteView[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [mode, setMode] = useState<Mode>('deck')
  const [request, setRequest] = useState('')
  const [note, setNote] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState('')
  const [favoriteQuery, setFavoriteQuery] = useState('')
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [searchingRound, setSearchingRound] = useState<string | null>(null)
  const [searchStartedAt, setSearchStartedAt] = useState<number>(0)
  const errorTimer = useRef<number | undefined>(undefined)

  const refresh = async (): Promise<void> => {
    try {
      const [nextView, nextFavorites] = await Promise.all([deck.load(sessionId), deck.listFavorites()])
      setView(nextView)
      setFavorites(nextFavorites)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setView(null)
    setSubmitted(false)
    setMode('deck')
    setRequest('')
    setNote('')
    setReasons({})
    setSearchingRound(null)
    void refresh()
    // Reload when the panel is bound to a different session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (searchingRound === null) return
    let cancelled = false
    const tick = async (): Promise<void> => {
      try {
        const next = await deck.load(sessionId)
        if (cancelled) return
        setView(next)
        const arrived = next?.candidates.some(entry => entry.candidate.roundId === searchingRound) ?? false
        if (arrived) {
          setSearchingRound(null)
          setNote('')
          setBusy(false)
        } else if (Date.now() - searchStartedAt > 300_000) {
          setSearchingRound(null)
          setBusy(false)
          setError(t('search.timeout'))
        }
      } catch {
        // A transient read failure is retried on the next tick.
      }
    }
    const interval = window.setInterval(() => void tick(), 2000)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
    // The polling lifetime is one search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchingRound, searchStartedAt, sessionId])

  useEffect(() => () => {
    if (errorTimer.current !== undefined) window.clearTimeout(errorTimer.current)
  }, [])

  const flashError = (message: string): void => {
    setError(message)
    if (errorTimer.current !== undefined) window.clearTimeout(errorTimer.current)
    errorTimer.current = window.setTimeout(() => setError(null), 8000)
  }

  const runRound = async (text: string, continueSetId?: string): Promise<void> => {
    const trimmed = text.trim()
    if (trimmed === '') {
      flashError(t('search.empty'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await deck.startRound(sessionId, trimmed, note.trim() === '' ? undefined : note.trim(), { mode: continueSetId ? 'continue' : 'new', ...(continueSetId ? { setId: continueSetId } : {}) })
      setView(result.view)
      setSearchingRound(result.roundId)
      setSearchStartedAt(Date.now())
      setBusy(false)
    } catch (caught) {
      setSearchingRound(null)
      setBusy(false)
      flashError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const continueRound = async (): Promise<void> => {
    const last = view?.rounds[view.rounds.length - 1]
    if (last === undefined) {
      await runRound(request)
      return
    }
    await runRound(last.round.request, view?.setId)
  }

  const decide = async (entry: CandidateView, verdict: Verdict, reason?: string): Promise<void> => {
    setBusy(true)
    try {
      await deck.decide(entry.candidateId, verdict, reason)
      await refresh()
    } catch (caught) {
      flashError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const saveReason = async (entry: CandidateView): Promise<void> => {
    const value = reasons[entry.candidateId]
    if (value === undefined) return
    await decide(entry, 'excluded', value)
  }

  const toggleFavorite = async (entry: CandidateView): Promise<void> => {
    try {
      const existing = favorites.find(favorite =>
        (entry.source.url !== undefined && favorite.favorite.url === entry.source.url)
        || (entry.source.url === undefined && favorite.favorite.title === entry.source.title))
      if (existing !== undefined) {
        await deck.removeFavorite(existing.favoriteId)
      } else {
        await deck.addFavorite({
          title: entry.source.title,
          ...(entry.source.url === undefined ? {} : { url: entry.source.url }),
          ...(entry.source.note === undefined ? {} : { note: entry.source.note }),
          ...(entry.source.snippet === undefined ? {} : { snippet: entry.source.snippet }),
        })
      }
      setFavorites(await deck.listFavorites())
    } catch (caught) {
      flashError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const submit = async (): Promise<void> => {
    if (view === null) return
    setBusy(true)
    try {
      await deck.deliverSelection(sessionId, view.setId)
      setSubmitted(true)
    } catch (caught) {
      flashError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const reference = async (): Promise<void> => {
    if (!view) return
    setBusy(true)
    try {
      const outcome = await deck.reference(sessionId, view.setId)
      if (outcome === 'inserted') setNotice(t('reference.done'))
      else flashError(t(outcome === 'draft-changed' ? 'reference.conflict' : 'reference.unavailable'))
    } catch (caught) { flashError(caught instanceof Error ? caught.message : String(caught)) }
    finally { setBusy(false) }
  }

  const addManual = async (): Promise<void> => {
    const text = manual.trim()
    if (text === '') return
    setBusy(true)
    try {
      const looksUrl = /^https?:\/\//i.test(text)
      await deck.add(sessionId, looksUrl ? { url: text } : { title: text })
      setManual('')
      setManualOpen(false)
      await refresh()
    } catch (caught) {
      flashError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const startFresh = async (): Promise<void> => {
    setBusy(true)
    try {
      await deck.newSet(sessionId)
      setSubmitted(false)
      setRequest('')
      setNote('')
      setReasons({})
      setSearchingRound(null)
      await refresh()
    } catch (caught) {
      flashError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const addFromFavorite = async (favorite: FavoriteView): Promise<void> => {
    try {
      await deck.add(sessionId, {
        title: favorite.favorite.title,
        ...(favorite.favorite.url === undefined ? {} : { url: favorite.favorite.url }),
        ...(favorite.favorite.note === undefined ? {} : { note: favorite.favorite.note }),
      })
      setMode('deck')
      await refresh()
    } catch (caught) {
      flashError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  if (loading) {
    return (
      <div className={css.root} data-deck-state="loading" data-deck-tab="deck">
        <div className={css.skeletonHeader} />
        <div className={css.skeletonCard} />
        <div className={css.skeletonCard} />
      </div>
    )
  }

  const rounds = view?.rounds ?? []
  const candidates = view?.candidates ?? []
  const keptCount = candidates.filter(entry => entry.candidate.verdict === 'kept').length
  const excludedCount = candidates.filter(entry => entry.candidate.verdict === 'excluded').length
  const hasThread = rounds.length > 0 || candidates.length > 0
  const byRound = new Map<string, CandidateView[]>()
  for (const entry of candidates) {
    const key = entry.candidate.roundId ?? ''
    const list = byRound.get(key) ?? []
    list.push(entry)
    byRound.set(key, list)
  }
  const favoriteKeys = new Set(favorites.map(favorite =>
    favorite.favorite.url ?? `title:${favorite.favorite.title}`))
  const visibleFavorites = favorites.filter(favorite => {
    const needle = favoriteQuery.trim().toLowerCase()
    if (needle === '') return true
    return favorite.favorite.title.toLowerCase().includes(needle)
      || (favorite.favorite.url ?? '').toLowerCase().includes(needle)
      || (favorite.favorite.note ?? '').toLowerCase().includes(needle)
  })

  return (
    <div className={css.root} data-deck-state={hasThread ? 'ready' : 'empty'} data-deck-tab="deck">
      <header className={css.header}>
        <div className={css.headerTop}>
          <div className={css.titleGroup}>
            <span className={css.title}>{mode === 'favorites' ? t('favorites.title') : t('panel.title')}</span>
            {hasThread && mode === 'deck'
              ? <span className={css.progressText}>{t('progress.summary', {
                kept: String(keptCount), excluded: String(excludedCount), total: String(candidates.length),
              })}</span>
              : null}
          </div>
          <div className={css.headerActions}>
            <button type="button" className={css.linkButton}
              onClick={() => { setError(null); setMode(mode === 'favorites' ? 'deck' : 'favorites') }}>
              {mode === 'favorites' ? t('favorites.back') : t('favorites.open')}
            </button>
            {hasThread && mode === 'deck' ? (
              <button type="button" className={css.linkButton} onClick={() => void startFresh()}>{t('action.newSearch')}</button>
            ) : null}
            <button type="button" className={css.iconButton} aria-label={t('action.refresh')} title={t('action.refresh')}
              onClick={() => void refresh()}>↻</button>
          </div>
        </div>
      </header>

      {error === null ? null : <p className={css.error}>{error}</p>}

      {mode === 'favorites' ? (
        <section className={css.favoritePane}>
          <input className={css.search} type="search" value={favoriteQuery} aria-label={t('favorites.search')}
            placeholder={t('favorites.searchPlaceholder')} onChange={event => setFavoriteQuery(event.target.value)} />
          {visibleFavorites.length === 0 ? (
            <div className={css.empty}>
              <p className={css.emptyTitle}>{t('favorites.empty')}</p>
              <p className={css.note}>{t('favorites.emptyHint')}</p>
            </div>
          ) : (
            <ul className={css.favoriteList}>
              {visibleFavorites.map(favorite => {
                const url = favorite.favorite.url
                return (
                  <li key={favorite.favoriteId} className={css.favoriteItem}>
                    <div className={css.favoriteBody}>
                      <a className={css.favoriteTitle} href={url} target="_blank" rel="noreferrer">{favorite.favorite.title}</a>
                      {favorite.favorite.note === undefined ? null : <p className={css.cardText}>{favorite.favorite.note}</p>}
                    </div>
                    <div className={css.cardActions}>
                      <button type="button" className={css.button} disabled={busy}
                        onClick={() => void addFromFavorite(favorite)}>{t('favorites.add')}</button>
                      <button type="button" className={css.linkButton} disabled={busy}
                        onClick={() => { void deck.removeFavorite(favorite.favoriteId).then(() => setFavorites(favorites.filter(item => item.favoriteId !== favorite.favoriteId))) }}>
                        {t('favorites.remove')}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      {mode === 'deck' && !hasThread ? (
        <section className={css.landing}>
          <h2 className={css.landingTitle}>{t('search.title')}</h2>
          <p className={css.landingHint}>{t('search.hint')}</p>
          <textarea className={css.requestBox} value={request} rows={3} aria-label={t('search.label')}
            placeholder={t('search.placeholder')} disabled={busy}
            onChange={event => setRequest(event.target.value)} />
          <div className={css.examples}>
            {EXAMPLES.map(key => (
              <button key={key} type="button" className={css.example} onClick={() => setRequest(t(key))}>
                {t(key)}
              </button>
            ))}
          </div>
          <button type="button" className={css.primary} disabled={busy} onClick={() => void runRound(request)}>
            {busy ? t('search.starting') : t('search.start')}
          </button>
          <button type="button" className={css.manualToggle} onClick={() => setManualOpen(!manualOpen)}>
            {t('search.manual')}
          </button>
          {manualOpen ? (
            <div className={css.manualRow}>
              <input className={css.input} value={manual} aria-label={t('add.primary')}
                placeholder={t('add.primaryPlaceholder')} onChange={event => setManual(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') void addManual() }} />
              <button type="button" className={css.button} disabled={busy} onClick={() => void addManual()}>{t('add.submit')}</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === 'deck' && hasThread ? (
        <div className={css.feed}>
          {rounds.map(({ roundId, round }) => {
            const entries = byRound.get(roundId) ?? []
            return (
              <section key={roundId} className={css.round}>
                <div className={css.roundHeader}>
                  <span className={css.roundBadge}>{t('round.title', { index: String(round.index) })}</span>
                  <p className={css.roundRequest}>{round.request}</p>
                </div>
                {round.note === undefined ? null : <p className={css.roundNote}>{t('round.note', { note: round.note })}</p>}
                {entries.length === 0 ? (
                  <p className={css.waiting}>
                    {searchingRound === roundId ? t('round.searching') : t('round.empty')}
                  </p>
                ) : (
                  <ul className={css.cardGrid}>
                    {entries.map(entry => {
                      const meta = entry.source.meta ?? {}
                      const image = avatarOf(entry, meta.image)
                      const favKey = entry.source.url ?? `title:${entry.source.title}`
                      const favorited = favoriteKeys.has(favKey)
                      const stars = formatStars(meta.stars)
                      return (
                        <li key={entry.candidateId} className={css.card}
                          data-verdict={entry.candidate.verdict} data-candidate={entry.candidateId}>
                          <div className={css.cardHead}>
                            <span className={css.avatarWrap}>
                              <span className={css.avatarFallback} aria-hidden="true">{entry.source.title.slice(0, 1)}</span>
                              {image === undefined ? null : (
                                <img className={css.avatar} src={image} alt="" loading="lazy" referrerPolicy="no-referrer"
                                  onError={event => { (event.currentTarget as HTMLImageElement).style.display = 'none' }} />
                              )}
                            </span>
                            <div className={css.cardTitleGroup}>
                              {entry.source.url === undefined
                                ? <span className={css.cardTitle}>{entry.source.title}</span>
                                : <a className={css.cardTitle} href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.title}</a>}
                              {meta.repo === undefined || meta.repo === entry.source.title ? null : <span className={css.repo}>{meta.repo}</span>}
                            </div>
                            <button type="button" className={favorited ? css.starActive : css.star}
                              aria-label={favorited ? t('card.unfavorite') : t('card.favorite')}
                              title={favorited ? t('card.unfavorite') : t('card.favorite')}
                              onClick={() => void toggleFavorite(entry)}>{favorited ? '★' : '☆'}</button>
                          </div>
                          {entry.source.note === undefined && meta.description === undefined ? null : (
                            <p className={css.cardText}>{entry.source.note ?? meta.description}</p>
                          )}
                          <div className={css.metaRow}>
                            {stars === undefined ? null : <span className={css.metaChip}>★ {stars}</span>}
                            {meta.language === undefined ? null : <span className={css.metaChip}>{meta.language}</span>}
                            {entry.source.url === undefined ? null : (
                              <a className={css.metaLink} href={entry.source.url} target="_blank" rel="noreferrer">{t('link.open')} ↗</a>
                            )}
                          </div>
                          {entry.candidate.policyFlags === undefined || entry.candidate.policyFlags.length === 0 ? null : (
                            <div className={css.flags}>
                              {entry.candidate.policyFlags.map(flag => (
                                <span key={flag} className={css.flag}>{t(`flag.${flag}` as DeckKey)}</span>
                              ))}
                            </div>
                          )}
                          <div className={css.cardActions}>
                            <button type="button"
                              className={entry.candidate.verdict === 'kept' ? css.keepActive : css.action}
                              aria-pressed={entry.candidate.verdict === 'kept'} disabled={busy || submitted}
                              title={t('card.undo')}
                              onClick={() => void decide(entry, entry.candidate.verdict === 'kept' ? 'pending' : 'kept')}>
                              ✓ {entry.candidate.verdict === 'kept' ? t('card.kept') : t('card.keep')}
                            </button>
                            <button type="button"
                              className={entry.candidate.verdict === 'excluded' ? css.excludeActive : css.action}
                              aria-pressed={entry.candidate.verdict === 'excluded'} disabled={busy || submitted}
                              title={t('card.undo')}
                              onClick={() => void decide(entry, entry.candidate.verdict === 'excluded' ? 'pending' : 'excluded')}>
                              ✕ {entry.candidate.verdict === 'excluded' ? t('card.excluded') : t('card.exclude')}
                            </button>
                            {entry.candidate.verdict === 'pending' ? null : (
                              <button type="button" className={css.linkButton} disabled={busy || submitted}
                                onClick={() => void decide(entry, 'pending')}>{t('card.skip')}</button>
                            )}
                          </div>
                          {entry.candidate.verdict === 'excluded' ? (
                            <div className={css.reasonRow}>
                              <input className={css.reasonInput} value={reasons[entry.candidateId] ?? entry.candidate.reason ?? ''}
                                placeholder={t('card.reasonPlaceholder')} aria-label={t('card.reason')}
                                onBlur={() => void saveReason(entry)}
                                onKeyDown={event => { if (event.key === 'Enter') void saveReason(entry) }}
                                onChange={event => setReasons({ ...reasons, [entry.candidateId]: event.target.value })} />
                              <button type="button" className={css.linkButton} disabled={busy || submitted}
                                onClick={() => void saveReason(entry)}>{t('card.saveReason')}</button>
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          })}
          {view !== null && rounds.length === 0 && candidates.length > 0 ? (
            <section className={css.round}>
              <ul className={css.cardGrid}>
                {candidates.map(entry => (
                  <li key={entry.candidateId} className={css.card} data-verdict={entry.candidate.verdict}>
                    <a className={css.cardTitle} href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {mode === 'deck' && hasThread ? (
        <footer className={css.footer}>
          {submitted ? (
            <div className={css.successRow}>
              <span>{t('submit.done')}</span>
              <button type="button" className={css.button} onClick={() => void startFresh()}>{t('action.newSearch')}</button>
            </div>
          ) : (
            <>
              <textarea className={css.feedbackBox} value={note} rows={2} aria-label={t('feedback.label')}
                placeholder={t('feedback.placeholder')} disabled={busy || searchingRound !== null}
                onChange={event => setNote(event.target.value)} />
              <div className={css.feedbackRow}>
                <span className={css.feedbackSummary}>
                  {t('feedback.reference', { kept: String(keptCount), excluded: String(excludedCount) })}
                </span>
                <button type="button" className={css.primary}
                  disabled={busy || searchingRound !== null} onClick={() => void continueRound()}>
                  {searchingRound === null ? t('feedback.continue') : t('search.starting')}
                </button>
              </div>
              <button type="button" className={css.submitButton} disabled={busy || keptCount === 0}
                onClick={() => void reference()}>{t('reference.button', { count: String(keptCount) })}</button>
              {notice ? <p role="status" className={css.hint}>{notice}</p> : null}
              <button type="button" className={css.linkButton}
                disabled={busy || searchingRound !== null || keptCount + excludedCount === 0}
                onClick={() => void submit()}>{t('reference.direct')}</button>
            </>
          )}
          <p className={css.hint}>{t('footer.hint')}</p>
        </footer>
      ) : null}
    </div>
  )
}
