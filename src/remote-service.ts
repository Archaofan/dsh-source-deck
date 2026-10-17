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
import {
  addSource, clearData, commitSelection, decide, getActiveSet, getSet,
} from './ops.ts'

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

/** SourceDeck Host Remote service. */
export class SourceDeckRemote extends TypertRemoteService {
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
        })
        emitDeckRecord(this.ctx, sessionId, 'plugin:dsh-source-deck/set-snapshot',
          snapshotOf(result.setId, await getSet(store, result.setId)))
        return JSON.stringify(result)
      }
      case 'getActiveSet': {
        const view = await getActiveSet(await this.getStore(), stringField(args, 'sessionId'))
        return JSON.stringify(view ?? null)
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
          snapshotOf(candidate.setId, view))
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
