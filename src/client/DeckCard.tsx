/**
 * Conversation card for one deck set: bounded candidate rows, decision counts,
 * and the entry back into the deck panel.
 */
import type { ReactNode } from 'react'
import type { ChatNodeViewProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import type { DeckKey } from './locales.ts'
import css from './DeckCard.module.css'

/** Card props: owner data, copy, and the panel entry callback. */
export type DeckCardProps =
  & ChatNodeViewProps<'source-deck-set'>
  & PropsLocale<'sourceDeck'>
  & { readonly openDeck: () => void }

/**
 * Render one deck set card.
 * @param props - the view node, copy, and panel entry.
 * @returns the card.
 */
export function DeckCard({ node, t, openDeck }: DeckCardProps): ReactNode {
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
                  <span key={flag} className={css.flag}>{t(`flag.${flag}` as DeckKey)}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {data.candidates.length > shown.length
        ? <p className={css.more}>{t('card.more', { count: String(data.candidates.length - shown.length) })}</p>
        : null}
      <button className={css.open} onClick={openDeck}>{t('card.open')}</button>
    </div>
  )
}
