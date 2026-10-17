/**
 * SourceDeck browser half: register the right-Sidebar deck tab, mount this
 * package's Remote contribution, and give the panel a plain-data face.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { CommitResult, SetView, AddSourceResult } from '../ops.ts'
import type { Verdict } from '../model.ts'
import { DeckBody } from './DeckBody.tsx'
import { DeckTitle } from './DeckTitle.tsx'
import { DECK_ID, deckDefinition } from './definition.ts'
import type { DeckFace } from './deck-face.ts'
import { en, zh } from './locales.ts'
import { TYPERT_REMOTE } from '../remote-info.ts'

export type { DeckKey } from './locales.ts'
export type { DeckBodyProps } from './DeckBody.tsx'

/** This plugin's copy namespace. */
const NS = 'sourceDeck'

/** Result envelope returned by the Remote carrier. */
export type RemoteResultLike =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: { readonly code?: string; readonly message?: string } }

/** SourceDeck wire surface mounted by this half. */
export interface SourceDeckWire {
  request(op: string, body: string): Promise<RemoteResultLike>
}

/** The official session Remote slice this half calls after a submission. */
interface SessionPromptRemote {
  prompt(request: {
    requestId: string
    sessionId: string
    mode: 'queue' | 'steer'
    content: readonly { type: 'text'; text: string }[]
  }): Promise<RemoteResultLike>
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
 * Client plugin body: register the tab, mount the Remote namespace, and wire
 * the panel's face to the namespace.
 * @param ctx - client root context carrying the registry and the slots.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  const t = ctx.locale.bind(NS)
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
  ctx.effect(() => disposeRemote, 'dsh-source-deck: remote namespace')

  const wire = ctx.get('remote.sourceDeck') as unknown as SourceDeckWire
  const sessionRemote = ctx.get('remote.session') as unknown as SessionPromptRemote
  const call = async (op: string, body: object): Promise<unknown> => {
    const result = await wire.request(op, JSON.stringify(body))
    if (!result.ok) throw new Error(result.error.message ?? result.error.code ?? 'SourceDeck Remote call failed')
    return result.value === undefined || result.value === '' ? undefined : JSON.parse(result.value)
  }
  const deck: DeckFace = {
    load: async (sessionId: string) => await call('getActiveSet', { sessionId }) as SetView | null,
    add: async (sessionId: string, input) => await call('addSource', { sessionId, origin: 'user', ...input }) as AddSourceResult,
    decide: async (candidateId: string, verdict: Verdict, reason?: string) => {
      await call('decide', { candidateId, verdict, ...(reason === undefined ? {} : { reason }) })
    },
    commit: async (sessionId: string, setId: string) =>
      await call('commitSelection', { sessionId, setId, requestId: crypto.randomUUID() }) as CommitResult,
    prompt: async (sessionId: string, text: string) => {
      const result = await sessionRemote.prompt({
        requestId: crypto.randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      })
      return result.ok
    },
  }

  ctx.effect(() => ctx.sidebarRightTabs.register(deckDefinition(t)), 'dsh-source-deck: deck type')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-source-deck: dictionaries')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: DECK_ID, locale: NS, inject: () => ({ deck }) },
    DeckBody as never,
  )), 'dsh-source-deck: deck tab body')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: DECK_ID },
    DeckTitle,
  )), 'dsh-source-deck: deck tab title')
}
