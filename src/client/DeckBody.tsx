/**
 * The deck tab's body: stage one placeholder.
 *
 * Everything the deck keeps will live in its store and everything it asks for
 * will go through its injected face; stage one only proves the tab mounts.
 */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './DeckBody.module.css'

/** The body's composed props: the tab it draws and its copy. */
export type DeckBodyProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsLocale<'sourceDeck'>

/**
 * The deck's body: the placeholder the stage-one smoke install shows.
 * @param props - the tab information hook and the namespace-bound translate.
 * @returns the placeholder panel.
 */
export function DeckBody({ useTabInfo, t }: DeckBodyProps): ReactNode {
  const { tab } = useTabInfo()
  return (
    <div className={css.root} data-deck-state="placeholder" data-deck-tab={tab.id}>
      <p className={css.line}>{t('empty.title')}</p>
      <p className={css.note}>{t('empty.note')}</p>
    </div>
  )
}
