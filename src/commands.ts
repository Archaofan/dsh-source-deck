import type { Context } from '@deepseek-ai/cordis'
import type { DeckStore } from './model.ts'
import type { ResearchCoordinator } from './research-coordinator.ts'
import { requestDeckOpen } from './activity.ts'

interface DeckCommandInvocation { readonly agent: { readonly session: { readonly id: string } }; readonly rawInput: string; readonly commandId: string }
interface CommandsService { register(definition: { name: string; description: string; input: { hint: string }; handler(input: DeckCommandInvocation): Promise<{ kind: 'success'; text: string }> }): () => void }

export function registerDeckCommands(ctx: Context, research: ResearchCoordinator, getStore: () => Promise<DeckStore>): void {
  ctx.inject(['commands'], scope => {
    const commands = scope.get('commands') as unknown as CommandsService
    scope.effect(() => commands.register({
      name: 'deck', description: '资料台：查找开源库、比较技术方案 / SourceDeck research', input: { hint: '输入需求开始后台研究；留空打开资料台' },
      async handler(invocation) {
        const sessionId = invocation.agent.session.id
        const request = invocation.rawInput.trim()
        if (!request) { await requestDeckOpen(await getStore(), sessionId); return { kind: 'success', text: '已打开资料台。' } }
        const result = await research.start({ sessionId, request, requestId: `deck-command:${invocation.commandId}`, mode: 'new' })
        await requestDeckOpen(await getStore(), sessionId, result.target.setId, result.roundId)
        return { kind: 'success', text: '资料台正在后台研究，你可以继续当前对话。' }
      },
    }), 'dsh-source-deck: /deck Host command')
  })
}
