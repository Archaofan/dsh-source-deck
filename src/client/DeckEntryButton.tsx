/**
 * Composer entry button: the deck's `conversation.input.right` seat. Clicking
 * it opens (or focuses) the deck tab of the current session.
 */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './DeckEntryButton.module.css'

/** Entry props: the composer runtime share, copy, and the open callback. */
export type DeckEntryButtonProps =
  & PropsRuntime<'conversation.input.right'>
  & PropsLocale<'sourceDeck'>
  & { readonly openDeck: () => void }

/**
 * Render the composer's deck entry.
 * @param props - copy and the open callback.
 * @returns the button.
 */
export function DeckEntryButton({ t, openDeck }: DeckEntryButtonProps): ReactNode {
  return (
    <button type="button" className={css.entry} aria-label={t('guide.title')} title={t('guide.title')} onClick={openDeck}>
      {t('type.label')}
    </button>
  )
}
