import { useEffect, useState } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { CandidateView } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { DeckKey } from './locales.ts'
import { formatSourceFacts, githubRepo, safeWebUrl, sourceImages } from './source-presentation.ts'
import css from './CandidateCard.module.css'

export interface CandidateCardProps {
  entry: CandidateView; t: TranslateNS<'sourceDeck'>; reason: string; favorite: boolean; compared: boolean; busy: boolean; readOnly: boolean
  onReason(value: string): void; onDecide(verdict: Verdict): void; onSaveReason(): void; onFavorite(): void; onCompare(): void
}
export function CandidateCard({ entry, t, reason, favorite, compared, busy, readOnly, onReason, onDecide, onSaveReason, onFavorite, onCompare }: CandidateCardProps) {
  const { source, candidate } = entry
  const images = sourceImages(source); const imageKey = images.join('|')
  const [imageIndex, setImageIndex] = useState(0)
  useEffect(() => setImageIndex(0), [imageKey])
  const image = images[imageIndex]
  const facts = formatSourceFacts(source, document.documentElement.lang || navigator.language || 'zh-CN')
  const repo = githubRepo(source); const url = safeWebUrl(source.url)
  const metadataUrl = safeWebUrl(source.meta?.metadataUrl)
  return <article className={css.card} data-verdict={candidate.verdict} data-candidate-id={entry.candidateId}>
    <div className={css.art}>
      {image ? <img src={image} alt={source.title} loading="lazy" referrerPolicy="no-referrer" onError={() => {
        console.warn('[source-deck] image failed', image)
        setImageIndex(current => current === imageIndex ? current + 1 : current)
      }} /> : <span className={css.monogram} aria-label={t('source.imageFallback')}>{source.title.slice(0, 2)}</span>}
      <button type="button" className={css.favorite} aria-label={t(favorite ? 'favorites.remove' : 'favorites.add')} aria-pressed={favorite} disabled={busy} onClick={onFavorite}>{favorite ? '★' : '☆'}</button>
    </div>
    <div className={css.content}>
      <div className={css.eyebrow}>{repo ? 'GitHub' : t('source.web')} · {t(`card.verdict.${candidate.verdict}`)}</div>
      <h3 className={css.title}>{url ? <a href={url} target="_blank" rel="noreferrer">{repo ?? source.title} ↗</a> : source.title}</h3>
      <p className={css.description}>{source.meta?.description || source.note || source.snippet || t('source.noDescription')}</p>
      {repo ? <div className={css.facts}><strong>★ {facts.stars}</strong><span>{t('source.updated')} {facts.updated}</span></div> : null}
      <div className={css.tags}>{[source.meta?.language, source.meta?.license, ...(source.meta?.topics ?? []).slice(0, 3)].filter(Boolean).map(tag => <span key={tag}>{tag}</span>)}</div>
      {candidate.policyFlags?.length ? <div className={css.flags}>{candidate.policyFlags.map(flag => <span key={flag} title={t(`flag.${flag}.hint` as DeckKey)}>{t(`flag.${flag}` as DeckKey)}</span>)}</div> : null}
      {repo ? <p className={css.lookup}>{t('source.checked')} {facts.checked}{metadataUrl ? <> · <a href={metadataUrl} target="_blank" rel="noreferrer">{t('source.metadata')}</a></> : null}</p> : null}
      <div className={css.actions}>
        <button type="button" aria-pressed={candidate.verdict === 'kept'} className={candidate.verdict === 'kept' ? css.keepActive : css.button} disabled={busy || readOnly} onClick={() => onDecide(candidate.verdict === 'kept' ? 'pending' : 'kept')}>✓ {t('action.keep')}</button>
        <button type="button" aria-pressed={candidate.verdict === 'excluded'} className={candidate.verdict === 'excluded' ? css.excludeActive : css.button} disabled={busy || readOnly} onClick={() => onDecide(candidate.verdict === 'excluded' ? 'pending' : 'excluded')}>✕ {t('action.exclude')}</button>
        <button type="button" className={css.button} aria-pressed={compared} onClick={onCompare}>{t(compared ? 'compare.remove' : 'compare.add')}</button>
      </div>
      <details className={css.reason}>
        <summary>{t('source.reason')}</summary>
        <input value={reason} onChange={event => onReason(event.target.value)} aria-label={t('source.reason')} placeholder={t('source.reasonPlaceholder')} disabled={busy || readOnly} onBlur={onSaveReason} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) onSaveReason() }} />
      </details>
    </div>
  </article>
}
