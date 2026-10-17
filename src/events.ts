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
      readonly policySummary?: string
      readonly rounds: readonly {
        readonly roundId: string
        readonly index: number
        readonly request: string
        readonly note?: string
        readonly createdAt: string
      }[]
      readonly candidates: readonly {
        readonly candidateId: string
        readonly sourceId: string
        readonly roundId?: string
        readonly title: string
        readonly url?: string
        readonly summary?: string
        readonly repo?: string
        readonly owner?: string
        readonly stars?: number
        readonly language?: string
        readonly image?: string
        readonly homepage?: string
        readonly verdict: Verdict
        readonly reason?: string
        readonly policyFlags?: readonly string[]
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
  readonly policySummary?: string
  readonly rounds: readonly {
    readonly roundId: string
    readonly index: number
    readonly request: string
    readonly note?: string
    readonly createdAt: string
  }[]
  readonly candidates: readonly {
    readonly candidateId: string
    readonly sourceId: string
    readonly roundId?: string
    readonly title: string
    readonly url?: string
    readonly summary?: string
    readonly repo?: string
    readonly owner?: string
    readonly stars?: number
    readonly language?: string
    readonly image?: string
    readonly homepage?: string
    readonly verdict: Verdict
    readonly reason?: string
    readonly policyFlags?: readonly string[]
  }[]
}

/** Derive ``owner/repo`` and the owner login from a GitHub URL. */
function githubOf(url: string | undefined): { repo?: string; owner?: string } {
  if (url === undefined) return {}
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') return {}
    const [owner, repo] = parsed.pathname.split('/').filter(part => part !== '')
    if (owner === undefined) return {}
    return { owner, ...(repo === undefined ? {} : { repo: `${owner}/${repo}` }) }
  } catch {
    return {}
  }
}

/**
 * Build a snapshot payload from one set view.
 * @param setId - set identity.
 * @param view - current set and candidates.
 * @param policy - one-line active policy summary.
 * @returns the record payload.
 */
export function snapshotOf(setId: string, view: SetView, policy?: string): DeckSnapshot {
  return {
    setId,
    sessionId: view.set.sessionId,
    origin: view.set.origin,
    status: view.set.status,
    ...(policy === undefined ? {} : { policySummary: policy }),
    rounds: view.rounds.map(({ roundId, round }) => ({
      roundId,
      index: round.index,
      request: round.request,
      ...(round.note === undefined ? {} : { note: round.note }),
      createdAt: round.createdAt,
    })),
    candidates: view.candidates.map(entry => {
      const github = githubOf(entry.source.url)
      const meta = entry.source.meta ?? {}
      return {
        candidateId: entry.candidateId,
        sourceId: entry.candidate.sourceId,
        ...(entry.candidate.roundId === undefined ? {} : { roundId: entry.candidate.roundId }),
        title: entry.source.title,
        ...(entry.source.url === undefined ? {} : { url: entry.source.url }),
        ...(entry.source.note === undefined && meta.description === undefined ? {} : { summary: entry.source.note ?? meta.description }),
        ...(meta.repo === undefined && github.repo === undefined ? {} : { repo: meta.repo ?? github.repo }),
        ...(meta.owner === undefined && github.owner === undefined ? {} : { owner: meta.owner ?? github.owner }),
        ...(meta.stars === undefined ? {} : { stars: meta.stars }),
        ...(meta.language === undefined ? {} : { language: meta.language }),
        ...(meta.image === undefined ? {} : { image: meta.image }),
        ...(meta.homepage === undefined ? {} : { homepage: meta.homepage }),
        verdict: entry.candidate.verdict,
        ...(entry.candidate.reason === undefined ? {} : { reason: entry.candidate.reason }),
        ...(entry.candidate.policyFlags === undefined ? {} : { policyFlags: entry.candidate.policyFlags }),
      }
    }),
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
