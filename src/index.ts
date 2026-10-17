/**
 * SourceDeck Host half: the profile Loader entry named by the bare package.
 *
 * Cordis function-plugin form: named exports only, no default export. The
 * Browser half lives in the `./client` export; the client module system mounts
 * it on this same row because the row's specifier is the bare package name.
 */
import type { Context } from '@deepseek-ai/cordis'
import { SourceDeckRemote } from './remote-service.ts'
import { registerDeckTool } from './tools.ts'

/** Plugin identity, matching the bundle patch row id. */
export const name = 'dsh-source-deck'

/** Host services this half waits on; the tools registration injects its own. */
export const inject: readonly string[] = []

/**
 * Host plugin body: mount the SourceDeck Remote service and its deck tool.
 * @param ctx - profile root context.
 */
export function apply(ctx: Context): void {
  const remote = new SourceDeckRemote(ctx)
  registerDeckTool(ctx, () => remote.getStore())
}
