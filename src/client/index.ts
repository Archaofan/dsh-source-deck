/**
 * SourceDeck browser half: register `sourcedeck` as a right-Sidebar tab type
 * and mount this package's Remote contribution.
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
import { TYPERT_REMOTE } from '../remote-info.ts'

export type { DeckKey } from './locales.ts'
export type { DeckBodyProps } from './DeckBody.tsx'

/** This plugin's copy namespace. */
const NS = 'sourceDeck'

/** SourceDeck wire surface mounted by this half. */
export interface SourceDeckWire {
  request(op: string, body: string): Promise<{ ok: boolean; op: string; message: string }>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    remote: {
      $mount(contribution: unknown): Promise<() => Promise<void>>
    }
  }
}

/**
 * Required browser services: the tab registry, the keyed seat, copy, and the
 * Remote carrier this package mounts its contribution into.
 */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote']

/**
 * Client plugin body: register the type, its dictionaries, its body, its chip
 * title, and the SourceDeck Remote namespace.
 * @param ctx - client root context carrying the registry and the slots.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  try {
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

    const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
    ctx.effect(() => disposeRemote, 'dsh-source-deck: remote namespace')
    // The mounted namespace is a Cordis service, not a declared context
    // property; strict `ctx.get` reads the global store without a topology
    // edge from this plugin to the namespace it just mounted.
    const wire = ctx.get('remote.sourceDeck') as unknown as SourceDeckWire
    const result = await wire.request('ping', '{}')
    ;(globalThis as Record<string, unknown>).__sourceDeckSpike = result
    console.log('[source-deck] remote spike', result)
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    ;(globalThis as Record<string, unknown>).__sourceDeckError = detail
    console.error('[source-deck] activation failed:', detail, error)
  }
}
