/**
 * Host Remote service for SourceDeck.
 *
 * One JSON operation method keeps the hand-written Typert contribution small:
 * `request(op, body)` decodes the body, dispatches a named operation, and
 * returns the JSON-encoded result.
 *
 * The `@Remote` decorator cannot survive this package's tsdown pass (Rolldown
 * keeps standard decorator syntax untransformed), so the class writes the same
 * versioned prototype marker the decorator writes: the protocol reads
 * `@deepseek-ai/dsh-typert-protocol/remote-methods` from the prototype and
 * validates `version: 1`.
 */
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { openDeck, type OpenDeck } from './domain.ts'
import { emitDeckRecord, snapshotOf } from './events.ts'
import type { ResearchCoordinator } from './research-coordinator.ts'
import {
  addFavorite, addSource, clearData, commitSelection, decide, getActiveSet, getPolicy, getSet, listFavorites,
  removeFavorite, setPolicy, startNewSet,
} from './ops.ts'
import { policySummary, type SourceMeta } from './scope-policy.ts'

/** One operation body shape; operations validate the fields they use. */
type OperationBody = Record<string, unknown>

function bodyOf(raw: string): OperationBody {
  if (raw.trim() === '') return {}
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('operation body must be a JSON object')
  }
  return parsed as OperationBody
}

function stringField(body: OperationBody, name: string): string {
  const value = body[name]
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`)
  return value
}

function optionalString(body: OperationBody, name: string): string | undefined {
  const value = body[name]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${name} must be a string`)
  return value
}

/** Decode optional Agent-supplied source metadata; unknown fields are ignored. */
function metaOf(body: OperationBody): SourceMeta | undefined {
  const raw = body.meta
  if (raw === undefined) return undefined
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('meta must be a JSON object')
  }
  const meta = raw as Record<string, unknown>
  const number = (name: string): number | undefined => {
    const value = meta[name]
    if (value === undefined) return undefined
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`meta.${name} must be a non-negative number`)
    }
    return value
  }
  const text = (name: string): string | undefined => {
    const value = meta[name]
    if (value === undefined) return undefined
    if (typeof value !== 'string') throw new Error(`meta.${name} must be a string`)
    return value
  }
  const flag = (name: string): boolean | undefined => {
    const value = meta[name]
    if (value === undefined) return undefined
    if (typeof value !== 'boolean') throw new Error(`meta.${name} must be a boolean`)
    return value
  }
  const list = (name: string): string[] | undefined => {
    const value = meta[name]
    if (value === undefined) return undefined
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
      throw new Error(`meta.${name} must be an array of strings`)
    }
    return value as string[]
  }
  const stars = number('stars')
  const pushedAt = text('pushedAt')
  const language = text('language')
  const license = text('license')
  const forks = number('forks')
  const archived = flag('archived')
  const fork = flag('fork')
  const topics = list('topics')
  const description = text('description')
  const repo = text('repo')
  const owner = text('owner')
  const image = text('image')
  const homepage = text('homepage')
  return {
    ...(stars === undefined ? {} : { stars }),
    ...(pushedAt === undefined ? {} : { pushedAt }),
    ...(language === undefined ? {} : { language }),
    ...(license === undefined ? {} : { license }),
    ...(forks === undefined ? {} : { forks }),
    ...(archived === undefined ? {} : { archived }),
    ...(fork === undefined ? {} : { fork }),
    ...(topics === undefined ? {} : { topics }),
    ...(description === undefined ? {} : { description }),
    ...(repo === undefined ? {} : { repo }),
    ...(owner === undefined ? {} : { owner }),
    ...(image === undefined ? {} : { image }),
    ...(homepage === undefined ? {} : { homepage }),
  }
}

/** SourceDeck Host Remote service. */
export class SourceDeckRemote extends TypertRemoteService {
  research?: ResearchCoordinator
  private deck: Promise<OpenDeck> | undefined
  private closed = false

  /**
   * @param ctx - owning Host context.
   */
  constructor(ctx: Context) {
    super(ctx, 'sourceDeckRemote', { namespace: 'sourceDeck' })
    ctx.effect(() => async () => {
      this.closed = true
      if (this.deck !== undefined) await (await this.deck).close()
    }, 'dsh-source-deck: close storage domain')
  }

  /**
   * Open (once) and return the deck store shared by the Remote service and the
   * `deck_submit_sources` tool.
   * @returns the operation store.
   */
  async getStore() {
    if (this.closed) throw new Error('source-deck storage domain is closed')
    this.deck ??= openDeck(this.ctx)
    return (await this.deck).store
  }

  async publish(sessionId: string, setId: string): Promise<void> {
    const store = await this.getStore()
    emitDeckRecord(this.ctx, sessionId, 'plugin:dsh-source-deck/set-snapshot', snapshotOf(setId, await getSet(store, setId), policySummary(await getPolicy(store))))
  }

  /**
   * Run one SourceDeck operation.
   * @param op - operation name.
   * @param body - operation arguments encoded as JSON.
   * @returns the operation result encoded as JSON.
   */
  async request(op: string, body: string): Promise<string> {
    const args = bodyOf(body)
    switch (op) {
      case 'ping':
        return JSON.stringify({ ok: true, op, message: 'source-deck remote' })
      case 'addSource': {
        const sessionId = stringField(args, 'sessionId')
        const store = await this.getStore()
        const result = await addSource(store, {
          sessionId,
          origin: (args.origin === 'agent' ? 'agent' : 'user'),
          ...(optionalString(args, 'title') === undefined ? {} : { title: optionalString(args, 'title') }),
          ...(optionalString(args, 'url') === undefined ? {} : { url: optionalString(args, 'url') }),
          ...(optionalString(args, 'note') === undefined ? {} : { note: optionalString(args, 'note') }),
          ...(optionalString(args, 'snippet') === undefined ? {} : { snippet: optionalString(args, 'snippet') }),
          ...(metaOf(args) === undefined ? {} : { meta: metaOf(args) }),
        })
        emitDeckRecord(this.ctx, sessionId, 'plugin:dsh-source-deck/set-snapshot',
          snapshotOf(result.setId, await getSet(store, result.setId), policySummary(await getPolicy(store))))
        return JSON.stringify(result)
      }
      case 'startRound': {
        const sessionId = stringField(args, 'sessionId')
        if (!this.research) throw new Error('Background research service unavailable')
        const result = await this.research.start({
          sessionId,
          request: stringField(args, 'request'),
          requestId: stringField(args, 'requestId'),
          mode: args.mode === 'continue' ? 'continue' : 'new',
          ...(optionalString(args, 'setId') ? { setId: optionalString(args, 'setId') } : {}),
          ...(optionalString(args, 'note') === undefined ? {} : { note: optionalString(args, 'note') }),
        })
        return JSON.stringify(result)
      }
      case 'cancelRound': {
        if (!this.research) throw new Error('Background research service unavailable')
        await this.research.cancel(stringField(args, 'sessionId'), stringField(args, 'roundId'))
        return JSON.stringify({ ok: true })
      }
      case 'listFavorites':
        return JSON.stringify(listFavorites(await this.getStore()))
      case 'addFavorite': {
        const store = await this.getStore()
        const favorite = await addFavorite(store, {
          title: optionalString(args, 'title') ?? '',
          ...(optionalString(args, 'url') === undefined ? {} : { url: optionalString(args, 'url') }),
          ...(optionalString(args, 'note') === undefined ? {} : { note: optionalString(args, 'note') }),
          ...(optionalString(args, 'snippet') === undefined ? {} : { snippet: optionalString(args, 'snippet') }),
          ...(metaOf(args) === undefined ? {} : { meta: metaOf(args) }),
        })
        return JSON.stringify(favorite)
      }
      case 'removeFavorite': {
        await removeFavorite(await this.getStore(), stringField(args, 'favoriteId'))
        return JSON.stringify({ ok: true })
      }
      case 'getScopePolicy': {
        const policy = await getPolicy(await this.getStore())
        return JSON.stringify({ policy, summary: policySummary(policy) })
      }
      case 'setScopePolicy': {
        const store = await this.getStore()
        const stored = await setPolicy(store, args.policy ?? { kind: args.kind, params: args.params })
        return JSON.stringify({ policy: stored, summary: policySummary(stored) })
      }
      case 'getActiveSet': {
        const view = await getActiveSet(await this.getStore(), stringField(args, 'sessionId'))
        return JSON.stringify(view ?? null)
      }
      case 'newSet': {
        const sessionId = stringField(args, 'sessionId')
        const setId = await startNewSet(await this.getStore(), sessionId, 'user')
        return JSON.stringify({ setId })
      }
      case 'getSet': {
        const view = await getSet(await this.getStore(), stringField(args, 'setId'))
        return JSON.stringify(view)
      }
      case 'decide': {
        const verdict = args.verdict
        if (verdict !== 'kept' && verdict !== 'excluded' && verdict !== 'pending') {
          throw new Error('verdict must be kept, excluded, or pending')
        }
        const store = await this.getStore()
        const candidate = await decide(store, {
          candidateId: stringField(args, 'candidateId'),
          verdict,
          ...(optionalString(args, 'reason') === undefined ? {} : { reason: optionalString(args, 'reason') }),
        })
        const view = await getSet(store, candidate.setId)
        emitDeckRecord(this.ctx, view.set.sessionId, 'plugin:dsh-source-deck/candidate-decided', {
          setId: candidate.setId,
          candidateId: stringField(args, 'candidateId'),
          verdict: candidate.verdict,
          ...(candidate.reason === undefined ? {} : { reason: candidate.reason }),
        })
        emitDeckRecord(this.ctx, view.set.sessionId, 'plugin:dsh-source-deck/set-snapshot',
          snapshotOf(candidate.setId, view, policySummary(await getPolicy(store))))
        return JSON.stringify({ ok: true })
      }
      case 'commitSelection': {
        const sessionId = stringField(args, 'sessionId')
        const result = await commitSelection(await this.getStore(), {
          sessionId,
          setId: stringField(args, 'setId'),
          requestId: stringField(args, 'requestId'),
        })
        emitDeckRecord(this.ctx, sessionId, 'plugin:dsh-source-deck/selection-submitted', {
          selectionId: result.selectionId,
          setId: stringField(args, 'setId'),
          sessionId,
          kept: result.kept.length,
          excluded: result.excluded.length,
          requestId: stringField(args, 'requestId'),
        })
        return JSON.stringify(result)
      }
      case 'clearData':
        await clearData(await this.getStore())
        return JSON.stringify({ ok: true })
      default:
        throw new Error(`unknown source-deck operation ${JSON.stringify(op)}`)
    }
  }
}

// Same frozen descriptor the `@Remote` method decorator installs at class
// definition time; see the protocol's `remoteMethods()` contract.
Object.defineProperty(SourceDeckRemote.prototype, '@deepseek-ai/dsh-typert-protocol/remote-methods', {
  configurable: true,
  value: Object.freeze({
    version: 1,
    methods: Object.freeze([
      Object.freeze({ method: 'request', invocation: Object.freeze({ kind: 'direct' }) }),
    ]),
  }),
})
