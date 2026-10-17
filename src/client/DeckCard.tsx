/**
 * Conversation card for one deck set: bounded candidate rows with inline
 * decisions, decision counts, and the entry back into the deck panel.
 */
import type { ReactNode } from 'react'
import type { ChatNodeViewProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { Verdict } from '../model.ts'
import type {} from './locales.ts'
import type { DeckKey } from './locales.ts'
import css from './DeckCard.module.css'

/** Card props: owner data, copy, the panel entry, and inline decisions. */
export type DeckCardProps =
  & ChatNodeViewProps<'source-deck-set'>
  & PropsLocale<'sourceDeck'>
  & {
    readonly openDeck: () => void
    readonly decide: (candidateId: string, verdict: Verdict) => void
  }

/**
 * Render one deck set card.
 * @param props - the view node, copy, panel entry, and decision callback.
 * @returns the card.
 */
export function DeckCard({ node, t, openDeck, decide }: DeckCardProps): ReactNode {
  const data = node.data
  const shown = data.candidates.slice(0, 5)
  return (
    <div className={css.card} data-deck-card={data.setId}>
      <div className={css.header}>
        <span className={css.title}>{t('card.title')} · {data.candidates.length}</span>
        <span className={css.counts}>{t('summary', {
          kept: String(data.kept),
          excluded: String(data.excluded),
          pending: String(data.pending),
        })}</span>
      </div>
      {data.latestRoundIndex === undefined ? null : (
        <p className={css.round}>{t('card.round', { index: String(data.latestRoundIndex), request: data.latestRequest ?? '' })}</p>
      )}
      {data.policySummary === undefined ? null : <p className={css.policy}>{t('policy.bar', { summary: data.policySummary })}</p>}
      <ul className={css.list}>
        {shown.map(candidate => (
          <li key={candidate.candidateId} className={css.row}>
            <div className={css.line}>
              <span className={css.name}>
                {candidate.url === undefined
                  ? candidate.title
                  : <a href={candidate.url} target="_blank" rel="noreferrer">{candidate.title}</a>}
              </span>
              <span className={css[candidate.verdict]}>{t(`card.verdict.${candidate.verdict}` as const)}</span>
            </div>
            {candidate.policyFlags === undefined || candidate.policyFlags.length === 0 ? null : (
              <div className={css.flags}>
                {candidate.policyFlags.map(flag => (
                  <span key={flag} className={css.flag} title={t(`flag.${flag}.hint` as DeckKey)}>
                    {t(`flag.${flag}` as DeckKey)}
                  </span>
                ))}
              </div>
            )}
            <div className={css.actions}>
              <button type="button" className={candidate.verdict === 'kept' ? css.activeKeep : css.action}
                aria-pressed={candidate.verdict === 'kept'}
                onClick={() => decide(candidate.candidateId, candidate.verdict === 'kept' ? 'pending' : 'kept')}>
                {candidate.verdict === 'kept' ? t('action.undo') : t('action.keep')}
              </button>
              <button type="button" className={candidate.verdict === 'excluded' ? css.activeExclude : css.action}
                aria-pressed={candidate.verdict === 'excluded'}
                onClick={() => decide(candidate.candidateId, candidate.verdict === 'excluded' ? 'pending' : 'excluded')}>
                {candidate.verdict === 'excluded' ? t('action.undo') : t('action.exclude')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {data.candidates.length > shown.length
        ? <p className={css.more}>{t('card.more', { count: String(data.candidates.length - shown.length) })}</p>
        : null}
      <button type="button" className={css.open} onClick={openDeck}>{t('card.open')}</button>
    </div>
  )
}
