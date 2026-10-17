/**
 * Hand-written Typert Remote contribution for SourceDeck's V3a wire surface.
 *
 * The V3a client talks to the Host through one JSON operation method. A
 * generated contribution would use one endpoint per operation, but out-of-tree
 * packages cannot run the workspace-bound Typert generator; the single method
 * keeps the hand-written artifact small and lets the Host dispatch named
 * operations internally.
 */
import { z } from 'zod'
import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'

/** One strict string codec with its wire projection. */
function stringCodec(typeSymbol: string, description: string) {
  return {
    mode: 'strict' as const,
    typeSymbol,
    create: () => z.string(),
    description,
    jsonSchema: { type: 'string' as const },
  }
}

/** Remote contribution mounted by the client half. */
export const TYPERT_REMOTE = createTypertRemoteInfo({
  package: 'dsh-source-deck',
  methods: {
    'sourceDeck/request': {
      service: 'sourceDeckRemote',
      description: 'Run one SourceDeck data operation and return its JSON result.',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'op',
          wire: 'op',
          source: 'json',
          codec: stringCodec('dsh-source-deck#request:op', 'Operation name.'),
          strictCodec: stringCodec('dsh-source-deck#request:op', 'Operation name.'),
        },
        {
          name: 'body',
          wire: 'body',
          source: 'json',
          codec: stringCodec('dsh-source-deck#request:body', 'Operation arguments encoded as JSON.'),
          strictCodec: stringCodec('dsh-source-deck#request:body', 'Operation arguments encoded as JSON.'),
        },
      ],
      result: stringCodec('dsh-source-deck#request:result', 'Operation result encoded as JSON.'),
    },
  },
}, z)
