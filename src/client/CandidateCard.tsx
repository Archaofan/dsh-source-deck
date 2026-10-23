import { useEffect, useMemo, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { CandidateView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { DeckKey } from './locales.ts'
import { formatSourceFacts, githubRepo, safeWebUrl, sourceImages } from './source-presentation.ts'
import css from './CandidateCard.module.css'

export interface CandidateCardProps {
  entry: CandidateView; t: TranslateNS<'sourceDeck'>; reason: string; favorite: boolean; compared: boolean; busy: boolean; readOnly: boolean
  saving?: boolean; deciding?: boolean; error?: string; compareFull?: boolean
  onReason(value: string): void; onDecide(verdict: Verdict): void; onSaveReason(): void; onFavorite(): void; onCompare(): void
}
export function CandidateCard({ entry, t, reason, favorite, compared, busy, readOnly, saving, deciding, error, compareFull, onReason, onDecide, onSaveReason, onFavorite, onCompare }: CandidateCardProps) {
  const { source, candidate } = entry
  const images = useMemo(() => sourceImages(source), [source]); const imageKey = images.join('|')
  const [imageIndex, setImageIndex] = useState(0)
  useEffect(() => setImageIndex(0), [imageKey])
  const image = images[imageIndex]
  const locale = document.documentElement.lang || navigator.language || 'zh-CN'
  const facts = useMemo(() => formatSourceFacts(source, locale), [source, locale])
  const repo = githubRepo(source); const url = safeWebUrl(source.url)
  const metadataUrl = safeWebUrl(source.meta?.metadataUrl)
  const note = source.note?.trim() ? source.note : undefined
  const description = source.meta?.description?.trim() ? source.meta.description : undefined
  const snippet = source.snippet?.trim() ? source.snippet : undefined
  return <article className={css.card} data-verdict={candidate.verdict} data-candidate-id={entry.candidateId} aria-busy={saving || undefined}>
    <div className={css.art}>
      {image ? <img src={image} alt={source.title} loading="lazy" referrerPolicy="no-referrer" onError={() => {
        console.warn('[source-deck] image failed', image)
        setImageIndex(current => current === imageIndex ? current + 1 : current)
      }} /> : <span className={css.monogram} aria-label={t('source.imageFallback')}>{source.title.slice(0, 2)}</span>}
      <button type="button" className={css.favorite} aria-label={t(favorite ? 'card.unfavorite' : 'card.favorite')} aria-pressed={favorite} disabled={busy} onClick={onFavorite}>{favorite ? '★' : '☆'}</button>
    </div>
    <div className={css.content}>
      <div className={css.eyebrow}>{repo ? 'GitHub' : t('source.web')} · {t(`card.verdict.${candidate.verdict}`)}</div>
      <h3 className={css.title}>{url ? <a href={url} target="_blank" rel="noreferrer">{repo ?? source.title} ↗</a> : source.title}</h3>
      <p className={css.description}>{note ? <><strong>{t('source.note')} · </strong>{note}</> : description || snippet || t('source.noDescription')}</p>
      {repo ? <div className={css.facts}><strong>★ {facts.stars}</strong><span>{t('source.updated')} {facts.updated}</span></div> : null}
      <div className={css.tags}>{[source.meta?.language, source.meta?.license].filter(Boolean).map(tag => <span key={tag}>{tag}</span>)}</div>
      {source.meta?.archived ? <p className={css.warning}>{t('ux.archived')}</p> : null}
      {candidate.policyFlags?.length ? <div className={css.flags}>{candidate.policyFlags.map(flag => <span key={flag} title={t(`flag.${flag}.hint` as DeckKey)}>{t(`flag.${flag}` as DeckKey)}</span>)}</div> : null}
      {repo || source.meta?.topics?.length || description || note || snippet ? <details className={css.reason}><summary>{t('ux.sourceDetails')}</summary>
        {note ? <p className={css.lookup}><strong>{t('source.note')} · </strong>{note}</p> : null}
        {description && description !== note ? <p className={css.lookup}><strong>{t('source.description')} · </strong>{description}</p> : null}
        {snippet && snippet !== note && snippet !== description ? <p className={css.lookup}>{snippet}</p> : null}
        {source.meta?.topics?.length ? <p className={css.lookup}>{source.meta.topics.join(' · ')}</p> : null}
        {repo ? <p className={css.lookup}>{t('source.checked')} {facts.checked}{metadataUrl ? <> · <a href={metadataUrl} target="_blank" rel="noreferrer">{t('source.metadata')}</a></> : null}</p> : null}
      </details> : null}
      <div className={css.actions}>
        <button type="button" aria-pressed={candidate.verdict === 'kept'} className={candidate.verdict === 'kept' ? css.keepActive : css.button} disabled={busy || readOnly} onClick={() => onDecide(candidate.verdict === 'kept' ? 'pending' : 'kept')}>✓ {t('action.keep')}</button>
        <button type="button" aria-pressed={candidate.verdict === 'excluded'} className={candidate.verdict === 'excluded' ? css.excludeActive : css.button} disabled={busy || readOnly} onClick={() => onDecide(candidate.verdict === 'excluded' ? 'pending' : 'excluded')}>✕ {t('action.exclude')}</button>
        <button type="button" className={css.button} aria-pressed={compared} disabled={!compared && compareFull} onClick={onCompare}>{t(compared ? 'compare.remove' : compareFull ? 'compare.limit' : 'compare.add')}</button>
      </div>
      {saving ? <p className={css.lookup} role="status">{t('ux.saving')}</p> : null}
      {error ? <p className={css.warning} role="alert">{error}</p> : null}
      <details className={css.reason}>
        <summary>{t('source.reason')}</summary>
        <input value={reason} onChange={event => onReason(event.target.value)} aria-label={t('source.reason')} placeholder={t('source.reasonPlaceholder')} disabled={busy || readOnly || deciding} onBlur={onSaveReason} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) onSaveReason() }} />
      </details>
    </div>
  </article>
}
