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
import { ResearchCoordinator } from './research-coordinator.ts'
import { createResearchRuntime } from './research-runtime.ts'
import { registerDeckCommands } from './commands.ts'

/** Plugin identity, matching the bundle patch row id. */
export const name = 'dsh-source-deck'

/** Host services this half waits on; the tools registration injects its own. */
export const inject: readonly string[] = ['storageDomain']

/**
 * Host plugin body: mount the SourceDeck Remote service and its deck tool.
 * @param ctx - profile root context.
 */
export function apply(ctx: Context): void {
  const remote = new SourceDeckRemote(ctx)
  let research: ResearchCoordinator
  const runtime = createResearchRuntime(ctx, workerId => research.targetForWorker(workerId))
  research = new ResearchCoordinator(() => remote.getStore(), runtime, (sessionId, setId) => {
    void remote.publish(sessionId, setId).catch(() => {})
  })
  remote.research = research
  ctx.effect(() => () => research.dispose(), 'dsh-source-deck: research cleanup')
  registerDeckTool(ctx, () => remote.getStore(), research)
  registerDeckCommands(ctx, research, () => remote.getStore())
}
