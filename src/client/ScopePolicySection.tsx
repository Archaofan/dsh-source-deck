/**
 * Settings section: the source-scope policy editor plus the deck data reset.
 *
 * The editor keeps a draft locally and writes only on Save; the persisted
 * policy only affects candidates submitted afterwards.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PolicyKind, ScopePolicy } from '../scope-policy.ts'
import type { DeckFace } from './deck-face.ts'
import type {} from './locales.ts'
import css from './ScopePolicySection.module.css'

/** Section props: settings runtime share, copy, and the deck face. */
export type ScopePolicySectionProps =
  & PropsRuntime<'settings.section'>
  & PropsLocale<'sourceDeck'>
  & { readonly deck: DeckFace }

function splitList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(item => item !== '')
}

function draftOf(policy: ScopePolicy): {
  kind: PolicyKind
  minStars: string
  months: string
  languages: string
  licenses: string
  excludeForks: boolean
  excludeArchived: boolean
  domainsAllow: string
  domainsBlock: string
  preferOfficialDocs: boolean
  guidance: string
} {
  return {
    kind: policy.kind,
    minStars: policy.params.minStars === undefined ? '' : String(policy.params.minStars),
    months: policy.params.updatedWithinMonths === undefined ? '' : String(policy.params.updatedWithinMonths),
    languages: (policy.params.languages ?? []).join(', '),
    licenses: (policy.params.licenses ?? []).join(', '),
    excludeForks: policy.params.excludeForks === true,
    excludeArchived: policy.params.excludeArchived === true,
    domainsAllow: (policy.params.domainsAllow ?? []).join(', '),
    domainsBlock: (policy.params.domainsBlock ?? []).join(', '),
    preferOfficialDocs: policy.params.preferOfficialDocs === true,
    guidance: policy.params.guidance ?? '',
  }
}

/**
 * Render the source-scope settings section.
 * @param props - copy and the deck face.
 * @returns the section.
 */
export function ScopePolicySection({ t, deck }: ScopePolicySectionProps): ReactNode {
  const [draft, setDraft] = useState(draftOf({ kind: 'github', params: {} }))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void deck.loadPolicy().then(view => {
      if (live) {
        setDraft(draftOf(view.policy))
        setLoading(false)
      }
    }).catch(caught => {
      if (live) {
        setError(caught instanceof Error ? caught.message : String(caught))
        setLoading(false)
      }
    })
    return () => { live = false }
  }, [deck])

  const save = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const policy: ScopePolicy = {
        kind: draft.kind,
        params: draft.kind === 'github'
          ? {
            ...(draft.minStars === '' ? {} : { minStars: Number(draft.minStars) }),
            ...(draft.months === '' ? {} : { updatedWithinMonths: Number(draft.months) }),
            ...(splitList(draft.languages).length === 0 ? {} : { languages: splitList(draft.languages) }),
            ...(splitList(draft.licenses).length === 0 ? {} : { licenses: splitList(draft.licenses) }),
            excludeForks: draft.excludeForks,
            excludeArchived: draft.excludeArchived,
          }
          : draft.kind === 'web'
            ? {
              ...(splitList(draft.domainsAllow).length === 0 ? {} : { domainsAllow: splitList(draft.domainsAllow) }),
              ...(splitList(draft.domainsBlock).length === 0 ? {} : { domainsBlock: splitList(draft.domainsBlock) }),
              preferOfficialDocs: draft.preferOfficialDocs,
            }
            : { guidance: draft.guidance },
      }
      const saved = await deck.savePolicy(policy)
      setDraft(draftOf(saved.policy))
      setMessage(`${t('settings.saved')}${saved.summary}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const clear = async (): Promise<void> => {
    if (!window.confirm(t('settings.clearConfirm'))) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await deck.clearData()
      setMessage(t('settings.cleared'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className={css.root}>{t('settings.loading')}</div>

  return (
    <div className={css.root} data-deck-settings="scope-policy">
      <h2 className={css.title}>{t('settings.title')}</h2>
      <p className={css.note}>{t('settings.description')}</p>

      <label className={css.field}>
        <span className={css.label}>{t('settings.kind')}</span>
        <select className={css.input} value={draft.kind} disabled={busy}
          onChange={event => setDraft({ ...draft, kind: event.target.value as PolicyKind })}>
          <option value="github">{t('settings.kind.github')}</option>
          <option value="web">{t('settings.kind.web')}</option>
          <option value="llm-freeform">{t('settings.kind.llm')}</option>
        </select>
      </label>

      {draft.kind === 'github' ? (
        <>
          <label className={css.field}>
            <span className={css.label}>{t('settings.minStars')}</span>
            <input className={css.input} type="number" min={0} value={draft.minStars} disabled={busy}
              onChange={event => setDraft({ ...draft, minStars: event.target.value })} />
          </label>
          <label className={css.field}>
            <span className={css.label}>{t('settings.months')}</span>
            <input className={css.input} type="number" min={1} value={draft.months} disabled={busy}
              onChange={event => setDraft({ ...draft, months: event.target.value })} />
          </label>
          <label className={css.field}>
            <span className={css.label}>{t('settings.languages')}</span>
            <input className={css.input} value={draft.languages} disabled={busy} placeholder="Go, TypeScript"
              onChange={event => setDraft({ ...draft, languages: event.target.value })} />
          </label>
          <label className={css.field}>
            <span className={css.label}>{t('settings.licenses')}</span>
            <input className={css.input} value={draft.licenses} disabled={busy} placeholder="MIT, Apache-2.0"
              onChange={event => setDraft({ ...draft, licenses: event.target.value })} />
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={draft.excludeForks} disabled={busy}
              onChange={event => setDraft({ ...draft, excludeForks: event.target.checked })} />
            {t('settings.excludeForks')}
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={draft.excludeArchived} disabled={busy}
              onChange={event => setDraft({ ...draft, excludeArchived: event.target.checked })} />
            {t('settings.excludeArchived')}
          </label>
        </>
      ) : null}

      {draft.kind === 'web' ? (
        <>
          <label className={css.field}>
            <span className={css.label}>{t('settings.domainsAllow')}</span>
            <input className={css.input} value={draft.domainsAllow} disabled={busy} placeholder="docs.example.com"
              onChange={event => setDraft({ ...draft, domainsAllow: event.target.value })} />
          </label>
          <label className={css.field}>
            <span className={css.label}>{t('settings.domainsBlock')}</span>
            <input className={css.input} value={draft.domainsBlock} disabled={busy} placeholder="spam.test"
              onChange={event => setDraft({ ...draft, domainsBlock: event.target.value })} />
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={draft.preferOfficialDocs} disabled={busy}
              onChange={event => setDraft({ ...draft, preferOfficialDocs: event.target.checked })} />
            {t('settings.preferOfficialDocs')}
          </label>
        </>
      ) : null}

      {draft.kind === 'llm-freeform' ? (
        <label className={css.field}>
          <span className={css.label}>{t('settings.guidance')}</span>
          <textarea className={css.textarea} value={draft.guidance} disabled={busy} rows={4}
            placeholder={t('settings.guidancePlaceholder')}
            onChange={event => setDraft({ ...draft, guidance: event.target.value })} />
        </label>
      ) : null}

      <div className={css.actions}>
        <button className={css.primary} disabled={busy} onClick={() => void save()}>{t('settings.save')}</button>
        <button className={css.button} disabled={busy} onClick={() => void clear()}>{t('settings.clear')}</button>
      </div>
      {message === null ? null : <p className={css.success}>{message}</p>}
      {error === null ? null : <p className={css.error}>{t('error.prefix')}{error}</p>}
    </div>
  )
}
