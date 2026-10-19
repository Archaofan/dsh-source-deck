/**
 * SourceDeck browser half: register the right-Sidebar deck tab, mount this
 * package's Remote contribution, and give the panel a plain-data face.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { CommitResult, SetView, AddSourceResult, FavoriteView, StartRoundResult } from '../ops.ts'
import type { Verdict } from '../model.ts'
import type { ScopePolicy } from '../scope-policy.ts'
import { DeckBody } from './DeckBody.tsx'
import { DeckCard } from './DeckCard.tsx'
import { DeckEntryButton } from './DeckEntryButton.tsx'
import { DeckTitle } from './DeckTitle.tsx'
import { ScopePolicySection } from './ScopePolicySection.tsx'
import { deckCardDefinition, DECK_CARD_KIND } from './card-definition.ts'
import { DECK_ID, DECK_KIND, deckDefinition } from './definition.ts'
import type { DeckFace, PolicyView } from './deck-face.ts'
import { en, zh } from './locales.ts'
import { TYPERT_REMOTE } from '../remote-info.ts'
import type { DeckActivity } from '../activity.ts'
import type { DeckLocation } from './activity.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ReferenceSnapshot } from '../model.ts'
import { ReferenceBridge } from './input-bridge.ts'
import { StableJson } from './stable-json.ts'
import { currentReference, registerReferenceSource } from './references.ts'

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
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight', 'uiConversation', 'conversation', 'remote', 'sessions']

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
  const setResponses = new StableJson<SetView | null>()
  const call = async (op: string, body: object): Promise<unknown> => {
    const result = await wire.request(op, JSON.stringify(body))
    if (!result.ok) throw new Error(result.error.message ?? result.error.code ?? 'SourceDeck Remote call failed')
    if (result.value === undefined || result.value === '') return undefined
    return op === 'getSet' || op === 'getActiveSet' ? setResponses.decode(result.value) : JSON.parse(result.value)
  }
  const bridge = new ReferenceBridge()
  const submissionRequests = new Map<string, string>()
  const deck: DeckFace = {
    load: async (sessionId: string) => await call('getActiveSet', { sessionId }) as SetView | null,
    loadSet: async (sessionId, setId) => await call('getSet', { sessionId, setId }) as SetView,
    add: async (sessionId: string, input) => await call('addSource', { sessionId, origin: 'user', ...input }) as AddSourceResult,
    decide: async (candidateId: string, verdict: Verdict, reason?: string) => {
      await call('decide', { candidateId, verdict, ...(reason === undefined ? {} : { reason }) })
    },
    commit: async (sessionId: string, setId: string) => {
      const key = `${sessionId}:${setId}`
      if (!submissionRequests.has(key)) submissionRequests.set(key, crypto.randomUUID())
      return await call('commitSelection', { sessionId, setId, requestId: submissionRequests.get(key) }) as CommitResult
    },
    prompt: async (sessionId: string, text: string) => {
      const result = await sessionRemote.prompt({
        requestId: crypto.randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      })
      return result.ok
    },
    startRound: async (sessionId, request, note, options) =>
      await call('startRound', { sessionId, request, requestId: options?.requestId ?? crypto.randomUUID(), mode: options?.mode ?? 'new', ...(options?.setId ? { setId: options.setId } : {}), ...(note === undefined ? {} : { note }) }) as StartRoundResult,
    activity: async sessionId => await call('getActivity', { sessionId }) as DeckActivity,
    cancelRound: async (sessionId, roundId) => { await call('cancelRound', { sessionId, roundId }) },
    createReference: async (sessionId, setId, requestId) => await call('createReference', { sessionId, setId, requestId }) as ReferenceSnapshot,
    getReference: async (sessionId, selectionId) => await call('getReference', { sessionId, selectionId }) as ReferenceSnapshot,
    listReferences: async sessionId => await call('listReferences', { sessionId }) as ReferenceSnapshot[],
    serializeReference: async (sessionId, selectionId) => await call('serializeReference', { sessionId, selectionId }) as string,
    reference: async (sessionId, setId) => bridge.insert(sessionId, () => currentReference(deck, sessionId, setId)),
    deliverSelection: async (sessionId, setId) => {
      const committed = await deck.commit(sessionId, setId)
      if (committed.deliveryStatus === 'sent') return
      try {
        const result = await sessionRemote.prompt({ requestId: committed.requestId, sessionId, mode: 'queue', content: [{ type: 'text', text: committed.promptText }] })
        if (!result.ok) throw new Error(result.error.message ?? 'Summary delivery failed')
      } catch (error) {
        await call('acknowledgeSelection', { sessionId, selectionId: committed.selectionId, status: 'failed' })
        throw error
      }
      await call('acknowledgeSelection', { sessionId, selectionId: committed.selectionId, status: 'sent' })
    },
    loadPolicy: async () => await call('getScopePolicy', {}) as PolicyView,
    savePolicy: async (policy: ScopePolicy) => await call('setScopePolicy', { policy }) as PolicyView,
    newSet: async (sessionId: string) => await call('newSet', { sessionId }) as { setId: string },
    listFavorites: async () => await call('listFavorites', {}) as FavoriteView[],
    addFavorite: async input =>
      await call('addFavorite', { ...input }) as FavoriteView,
    removeFavorite: async (favoriteId: string) => { await call('removeFavorite', { favoriteId }) },
    clearData: async () => { await call('clearData', {}) },
  }

  ctx.effect(() => ctx.sidebarRightTabs.register(deckDefinition(t)), 'dsh-source-deck: deck type')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-source-deck: dictionaries')
  const openDeck = (location?: DeckLocation): void => {
    if (location) ctx.sidebarRight.openTabIn(location.sessionId as SessionId, DECK_KIND, { params: { setId: location.setId, roundId: location.roundId } })
    else ctx.sidebarRight.openTab(DECK_KIND)
  }
  const seenActivities = new Set<string>()
  registerReferenceSource(ctx, deck, openDeck)
  const registerInput = (sessionId: string, actions: InputActions): (() => void) => {
    const sessions = ctx.get('sessions') as unknown as { scope(id: string): ClientContext | undefined }
    const actx = sessions.scope(sessionId)
    if (!actx) return () => {}
    const input = ctx.conversation.input.for(actx)
    return bridge.register(sessionId, {
      captureInsertion: () => actions.captureInsertion(),
      insert: (reference, span) => actx.bail('slash/input-insert-reference', { reference, span }) === true,
      persistDraft: () => actions.persistDraft(),
      focus: () => input.focus(),
    })
  }
  const decideFromCard = (candidateId: string, verdict: Verdict): void => {
    void deck.decide(candidateId, verdict).catch(error => {
      console.warn('[source-deck] card decision failed', error)
    })
  }
  ctx.effect(() => ctx.uiConversation.events.register(deckCardDefinition), 'dsh-source-deck: deck card definition')
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register(
    {
      name: 'conversation.chat.node',
      key: DECK_CARD_KIND,
      locale: NS,
      inject: () => ({ openDeck, decide: decideFromCard }),
    },
    DeckCard as never,
  ))
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register(
    { name: 'conversation.input.right', id: 'source-deck', order: 10, locale: NS, inject: () => ({ openDeck, activity: deck.activity, seenActivities, registerInput }) },
    DeckEntryButton as never,
  ))
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'source-deck',
      order: 60,
      label: () => t('settings.nav'),
      locale: NS,
      inject: () => ({ deck }),
    },
    ScopePolicySection as never,
  ))
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: DECK_ID, locale: NS, inject: () => ({ deck }) },
    DeckBody as never,
  )), 'dsh-source-deck: deck tab body')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: DECK_ID },
    DeckTitle,
  )), 'dsh-source-deck: deck tab title')
}
