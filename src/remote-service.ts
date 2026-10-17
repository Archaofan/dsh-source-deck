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

  private async store() {
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
        const result = await addSource(await this.store(), {
          sessionId: stringField(args, 'sessionId'),
          origin: (args.origin === 'agent' ? 'agent' : 'user'),
          ...(optionalString(args, 'title') === undefined ? {} : { title: optionalString(args, 'title') }),
          ...(optionalString(args, 'url') === undefined ? {} : { url: optionalString(args, 'url') }),
          ...(optionalString(args, 'note') === undefined ? {} : { note: optionalString(args, 'note') }),
          ...(optionalString(args, 'snippet') === undefined ? {} : { snippet: optionalString(args, 'snippet') }),
        })
        return JSON.stringify(result)
      }
      case 'getActiveSet': {
        const view = await getActiveSet(await this.store(), stringField(args, 'sessionId'))
        return JSON.stringify(view ?? null)
      }
      case 'getSet': {
        const view = await getSet(await this.store(), stringField(args, 'setId'))
        return JSON.stringify(view)
      }
      case 'decide': {
        const verdict = args.verdict
        if (verdict !== 'kept' && verdict !== 'excluded' && verdict !== 'pending') {
          throw new Error('verdict must be kept, excluded, or pending')
        }
        await decide(await this.store(), {
          candidateId: stringField(args, 'candidateId'),
          verdict,
          ...(optionalString(args, 'reason') === undefined ? {} : { reason: optionalString(args, 'reason') }),
        })
        return JSON.stringify({ ok: true })
      }
      case 'commitSelection': {
        const result = await commitSelection(await this.store(), {
          sessionId: stringField(args, 'sessionId'),
          setId: stringField(args, 'setId'),
          requestId: stringField(args, 'requestId'),
        })
        return JSON.stringify(result)
      }
      case 'clearData':
        await clearData(await this.store())
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
