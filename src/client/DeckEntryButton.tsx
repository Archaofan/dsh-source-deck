/**
 * Composer entry button: the deck's `conversation.input.right` seat. Clicking
 * it opens (or focuses) the deck tab of the current session.
 */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './DeckEntryButton.module.css'
import { DeckActivityObserver } from './DeckActivityObserver.tsx'
import type { DeckActivity } from '../activity.ts'
import type { DeckLocation } from './activity.ts'

/** Entry props: the composer runtime share, copy, and the open callback. */
export type DeckEntryButtonProps =
  & PropsRuntime<'conversation.input.right'>
  & PropsLocale<'sourceDeck'>
  & { readonly openDeck: (location?: DeckLocation) => void; readonly activity: (sessionId: string) => Promise<DeckActivity>; readonly seenActivities: Set<string> }

/**
 * Render the composer's deck entry.
 * @param props - copy and the open callback.
 * @returns the button.
 */
export function DeckEntryButton({ t, openDeck, sessionId, activity, seenActivities }: DeckEntryButtonProps): ReactNode {
  return (
    <>
    {sessionId ? <DeckActivityObserver sessionId={sessionId} load={activity} open={openDeck} seen={seenActivities} /> : null}
    <button type="button" className={css.entry} aria-label={t('guide.title')} title={t('guide.title')} onClick={() => openDeck(sessionId ? { sessionId } : undefined)}>
      {t('type.label')}
    </button>
    </>
  )
}
