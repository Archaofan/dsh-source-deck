/**
 * Conversation card Definition for a deck set.
 *
 * Every deck write appends a whole-set `plugin:dsh-source-deck/set-snapshot`
 * record. The Definition treats each record as a start/update of the same
 * business identity (the set id), so the latest snapshot wins on replay and
 * the card follows live decisions.
 */
import type {
  ConversationMatch, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { DeckSnapshot } from '../events.ts'

/** Card kind; also the keyed `conversation.chat.node` row. */
export const DECK_CARD_KIND = 'source-deck-set'

/** Renderer payload derived from the latest snapshot. */
export interface DeckCardData {
  readonly setId: string
  readonly candidates: readonly {
    readonly candidateId: string
    readonly title: string
    readonly url?: string
    readonly verdict: 'pending' | 'kept' | 'excluded'
    readonly reason?: string
  }[]
  readonly kept: number
  readonly excluded: number
  readonly pending: number
}

declare module '@deepseek-ai/dsh-client-ui-chat/client' {
  interface ChatNodeDataMap {
    /** One deck set as the conversation card shows it. */
    'source-deck-set': DeckCardData
  }
}

function dataOf(event: ConversationMatch['event']): DeckCardData {
  const snapshot = event.data as DeckSnapshot
  const candidates = snapshot.candidates.map(candidate => ({
    candidateId: candidate.candidateId,
    title: candidate.title,
    ...(candidate.url === undefined ? {} : { url: candidate.url }),
    verdict: candidate.verdict,
    ...(candidate.reason === undefined ? {} : { reason: candidate.reason }),
  }))
  return {
    setId: snapshot.setId,
    candidates,
    kept: candidates.filter(candidate => candidate.verdict === 'kept').length,
    excluded: candidates.filter(candidate => candidate.verdict === 'excluded').length,
    pending: candidates.filter(candidate => candidate.verdict === 'pending').length,
  }
}

/** Conversation card Definition for deck snapshots. */
export const deckCardDefinition: ConversationNodeDefinition<DeckCardData> = {
  kind: DECK_CARD_KIND,
  target: 'chat',
  match: (event) => {
    if (event.type !== 'plugin:dsh-source-deck/set-snapshot') return null
    return { id: String((event.data as DeckSnapshot).setId), role: 'start' }
  },
  start: (_context, match) => dataOf(match.event),
  update: (_context: ConversationNodeContext<DeckCardData> & { state: DeckCardData }, match) => dataOf(match.event),
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: DECK_CARD_KIND,
      id: context.id,
      target: 'chat',
      anchorSeq: context.start?.event.seq ?? context.matches[0]?.event.seq ?? 0,
      location: context.start?.location ?? { kind: 'unresolved' },
      visibility: 'visible',
      data: context.state,
    }
  },
}
