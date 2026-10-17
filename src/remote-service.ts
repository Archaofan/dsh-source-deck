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
 * validates `version: 1`. The marker shape is the one documented by
 * `remoteMethods()` in the protocol package.
 */
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

/** SourceDeck Host Remote service. */
export class SourceDeckRemote extends TypertRemoteService {
  /**
   * @param ctx - owning Host context.
   */
  constructor(ctx: Context) {
    super(ctx, 'sourceDeckRemote', { namespace: 'sourceDeck' })
  }

  /**
   * Run one SourceDeck operation.
   * @param op - operation name.
   * @param body - operation arguments encoded as JSON.
   * @returns the operation result encoded as JSON.
   */
  async request(op: string, body: string): Promise<string> {
    void body
    return JSON.stringify({ ok: true, op, message: 'source-deck remote spike' })
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
