/**
 * The deck tab's chip title: the type's own label.
 *
 * Registered under `sidebar.right.pane.tab.title`; without it the chip would
 * show the bare label captured at open time.
 */
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * The title as the chip and a floating panel's header show it.
 * @param props - the tab information hook.
 * @returns the tab's title text.
 */
export function DeckTitle({ useTabInfo }: PropsRuntime<'sidebar.right.pane.tab.title'>): ReactNode {
  const { tab } = useTabInfo()
  return <>{tab.title}</>
}
