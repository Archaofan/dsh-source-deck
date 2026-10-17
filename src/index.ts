/**
 * SourceDeck Host half: the profile Loader entry named by the bare package.
 *
 * Cordis function-plugin form: named exports only, no default export. The
 * Browser half lives in the `./client` export; the client module system mounts
 * it on this same row because the row's specifier is the bare package name.
 */
import type { Context } from '@deepseek-ai/cordis'
import { SourceDeckRemote } from './remote-service.ts'

/** Plugin identity, matching the bundle patch row id. */
export const name = 'dsh-source-deck'

/** Host services this half waits on; none yet in stage one. */
export const inject: readonly string[] = []

/**
 * Host plugin body: mount the SourceDeck Remote service.
 * @param ctx - profile root context.
 */
export function apply(ctx: Context): void {
  ctx.plugin(SourceDeckRemote)
}
