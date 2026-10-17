/**
 * SourceDeck log-only session records.
 *
 * The 0.2.1 Session API writes informational plugin state as *plugin records*:
 * events marked `ignorable` whose types live in `PluginRecordMap` instead of
 * `SessionEventMap`. Records are retained by replay/fork and skipped by readers
 * that do not know them, which is exactly the contract the deck's UI history
 * needs. Event types use the required `plugin:` prefix.
 */
import type { Context } from '@deepseek-ai/cordis'
import { appendPluginRecord } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import type { SetView } from './ops.ts'
import type { Origin, Verdict } from './model.ts'

declare module '@deepseek-ai/dsh-session/types' {
  interface PluginRecordMap {
    /** Whole deck snapshot for one set; the latest record wins on replay. */
    'plugin:dsh-source-deck/set-snapshot': {
      readonly setId: string
      readonly sessionId: string
      readonly origin: Origin
      readonly status: 'open' | 'submitted'
      readonly candidates: readonly {
        readonly candidateId: string
        readonly sourceId: string
        readonly title: string
        readonly url?: string
        readonly verdict: Verdict
        readonly reason?: string
      }[]
    }
    /** One decision change, for consumers that only need the delta. */
    'plugin:dsh-source-deck/candidate-decided': {
      readonly setId: string
      readonly candidateId: string
      readonly verdict: Verdict
      readonly reason?: string
    }
    /** One submitted selection. */
    'plugin:dsh-source-deck/selection-submitted': {
      readonly selectionId: string
      readonly setId: string
      readonly sessionId: string
      readonly kept: number
      readonly excluded: number
      readonly requestId: string
    }
  }
}

/** Record types this package may append. */
export type DeckRecordType =
  | 'plugin:dsh-source-deck/set-snapshot'
  | 'plugin:dsh-source-deck/candidate-decided'
  | 'plugin:dsh-source-deck/selection-submitted'

/** The owner slice of an agent the record writer needs. */
interface AgentOwner {
  readonly session: Session
}

/** The owner slice of the agent registry. */
interface AgentLookup {
  get(id: string): AgentOwner | undefined
}

/** Snapshot payload shape. */
export interface DeckSnapshot {
  readonly setId: string
  readonly sessionId: string
  readonly origin: Origin
  readonly status: 'open' | 'submitted'
  readonly candidates: readonly {
    readonly candidateId: string
    readonly sourceId: string
    readonly title: string
    readonly url?: string
    readonly verdict: Verdict
    readonly reason?: string
  }[]
}

/**
 * Build a snapshot payload from one set view.
 * @param setId - set identity.
 * @param view - current set and candidates.
 * @returns the record payload.
 */
export function snapshotOf(setId: string, view: SetView): DeckSnapshot {
  return {
    setId,
    sessionId: view.set.sessionId,
    origin: view.set.origin,
    status: view.set.status,
    candidates: view.candidates.map(entry => ({
      candidateId: entry.candidateId,
      sourceId: entry.candidate.sourceId,
      title: entry.source.title,
      ...(entry.source.url === undefined ? {} : { url: entry.source.url }),
      verdict: entry.candidate.verdict,
      ...(entry.candidate.reason === undefined ? {} : { reason: entry.candidate.reason }),
    })),
  }
}

/**
 * Append one deck record to the owning session's log.
 * @param ctx - Host context carrying the agent registry.
 * @param sessionId - owning session.
 * @param type - declared plugin record type.
 * @param data - record payload matching the declared type.
 * @returns whether the owning agent was found and the record was accepted.
 */
export function emitDeckRecord(
  ctx: Context,
  sessionId: string,
  type: DeckRecordType,
  data: object,
): boolean {
  try {
    const agents = ctx.get('agents') as unknown as AgentLookup | undefined
    const agent = agents?.get(sessionId)
    if (agent === undefined) return false
    appendPluginRecord(agent.session, type as never, data as never)
    return true
  } catch (error) {
    ctx.logger.warn('dsh-source-deck: failed to append session record %s: %o', type, error)
    return false
  }
}
