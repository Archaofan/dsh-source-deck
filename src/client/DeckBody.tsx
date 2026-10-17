/**
 * The deck tab's body: manual add, grouped screening, and submission back to
 * the Agent. Data comes from the injected Remote face; the panel keeps only
 * view-local state (form fields, busy flags) in React.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { CandidateView, SetView } from '../ops.ts'
import type { DeckFace } from './deck-face.ts'
import type {} from './locales.ts'
import css from './DeckBody.module.css'

/** The body's composed props: runtime shares, copy, and the injected face. */
export type DeckBodyProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'sourceDeck'>
  & { readonly deck: DeckFace }

/** Group candidates by verdict, preserving insertion order. */
function groupsOf(candidates: readonly CandidateView[]) {
  return {
    pending: candidates.filter(entry => entry.candidate.verdict === 'pending'),
    kept: candidates.filter(entry => entry.candidate.verdict === 'kept'),
    excluded: candidates.filter(entry => entry.candidate.verdict === 'excluded'),
  }
}

/**
 * The deck panel.
 * @param props - session-bound tab shares, copy, and the Remote face.
 * @returns the panel.
 */
export function DeckBody({ sessionId, t, deck }: DeckBodyProps): ReactNode {
  const [view, setView] = useState<SetView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  const refresh = async (): Promise<void> => {
    try {
      setError(null)
      setView(await deck.load(sessionId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  useEffect(() => {
    setSubmitted(false)
    void refresh()
    // Reload when the panel is bound to a different session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const add = async (): Promise<void> => {
    if (title.trim() === '' && url.trim() === '') {
      setError(t('add.invalid'))
      return
    }
    setBusy(true)
    try {
      await deck.add(sessionId, {
        ...(title.trim() === '' ? {} : { title: title.trim() }),
        ...(url.trim() === '' ? {} : { url: url.trim() }),
        ...(note.trim() === '' ? {} : { note: note.trim() }),
      })
      setTitle('')
      setUrl('')
      setNote('')
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const decide = async (candidateId: string, verdict: 'kept' | 'excluded' | 'pending'): Promise<void> => {
    setBusy(true)
    try {
      await deck.decide(candidateId, verdict)
      await refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (view === null) return
    const groups = groupsOf(view.candidates)
    if (groups.kept.length + groups.excluded.length === 0) {
      setError(t('submit.none'))
      return
    }
    setBusy(true)
    try {
      const result = await deck.commit(sessionId, view.setId)
      await deck.prompt(sessionId, result.promptText)
      setSubmitted(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const groups = view === null
    ? { pending: [], kept: [], excluded: [] } as const
    : groupsOf(view.candidates)
  const setId = view?.setId ?? ''

  return (
    <div className={css.root} data-deck-state={view === null ? 'empty' : 'ready'} data-deck-tab="deck">
      <div className={css.counts}>{t('summary', {
        kept: String(groups.kept.length),
        excluded: String(groups.excluded.length),
        pending: String(groups.pending.length),
      })}</div>

      {view === null ? (
        <div>
          <p className={css.line}>{t('empty.title')}</p>
          <p className={css.note}>{t('empty.note')}</p>
        </div>
      ) : null}

      <div className={css.form}>
        <input className={css.input} value={title} placeholder={t('add.title')} disabled={busy}
          onChange={event => setTitle(event.target.value)} />
        <input className={css.input} value={url} placeholder={t('add.url')} disabled={busy}
          onChange={event => setUrl(event.target.value)} />
        <input className={css.input} value={note} placeholder={t('add.note')} disabled={busy}
          onChange={event => setNote(event.target.value)} />
        <button className={css.primary} disabled={busy} onClick={() => void add()}>{t('add.button')}</button>
      </div>

      {([['pending', groups.pending], ['kept', groups.kept], ['excluded', groups.excluded]] as const).map(([key, entries]) => (
        <section key={key} className={css.group}>
          <h3 className={css.groupTitle}>{t(`group.${key}` as const)} ({entries.length})</h3>
          {entries.length === 0 ? null : (
            <ul className={css.list}>
              {entries.map(entry => (
                <li key={entry.candidateId} className={css.item}>
                  <div className={css.itemTitle}>
                    {entry.source.url === undefined
                      ? entry.source.title
                      : <a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.title}</a>}
                  </div>
                  {entry.source.note === undefined ? null : <div className={css.meta}>{entry.source.note}</div>}
                  {entry.candidate.reason === undefined ? null : <div className={css.meta}>{entry.candidate.reason}</div>}
                  <div className={css.actions}>
                    {entry.candidate.verdict === 'kept'
                      ? <button className={css.button} disabled={busy} onClick={() => void decide(entry.candidateId, 'pending')}>{t('action.undo')}</button>
                      : <button className={css.button} disabled={busy} onClick={() => void decide(entry.candidateId, 'kept')}>{t('action.keep')}</button>}
                    {entry.candidate.verdict === 'excluded'
                      ? <button className={css.button} disabled={busy} onClick={() => void decide(entry.candidateId, 'pending')}>{t('action.undo')}</button>
                      : <button className={css.button} disabled={busy} onClick={() => void decide(entry.candidateId, 'excluded')}>{t('action.exclude')}</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {submitted
        ? <p className={css.success}>{t('submit.done')} <button className={css.button} onClick={() => { setSubmitted(false); void refresh() }}>{t('submit.continue')}</button></p>
        : (
          <button className={css.primary} disabled={busy || setId === ''} onClick={() => void submit()}>
            {busy ? t('submit.busy') : t('submit.button')}
          </button>
        )}
      {error === null ? null : <p className={css.error}>{t('error.prefix')}{error}</p>}
    </div>
  )
}
