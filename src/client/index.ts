/**
 * SourceDeck browser half: register `sourcedeck` as a right-Sidebar tab type.
 *
 * The public two-stage path, unmodified: the type into `ctx.sidebarRightTabs`,
 * the body into the keyed `sidebar.right.pane.tab` seat and the chip title into
 * the keyed `sidebar.right.pane.tab.title` seat, both under the type's id.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { DeckBody } from './DeckBody.tsx'
import { DeckTitle } from './DeckTitle.tsx'
import { DECK_ID, deckDefinition } from './definition.ts'
import { en, zh } from './locales.ts'

export type { DeckKey } from './locales.ts'
export type { DeckBodyProps } from './DeckBody.tsx'

/** This plugin's copy namespace. */
const NS = 'sourceDeck'

/**
 * Required browser services: the tab registry, the keyed seat, and copy.
 */
export const inject = ['slots', 'locale', 'sidebarRightTabs']

/**
 * Client plugin body: register the type, its dictionaries, its body, and its chip title.
 * @param ctx - client root context carrying the registry and the slots.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.sidebarRightTabs.register(deckDefinition(t)), 'dsh-source-deck: deck type')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-source-deck: dictionaries')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: DECK_ID, locale: NS },
    DeckBody,
  )), 'dsh-source-deck: deck tab body')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: DECK_ID },
    DeckTitle,
  )), 'dsh-source-deck: deck tab title')
}
