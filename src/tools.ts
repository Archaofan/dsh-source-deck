/**
 * `deck_submit_sources` tool: the agent's path into the deck.
 *
 * The tool validates each candidate, deduplicates on the normalized source
 * key, appends a whole-set log record, and returns a bounded summary. The
 * model-visible text names only counts and titles; the user screens the rest in
 * the deck panel.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DeckStore } from './model.ts'
import { addSource, getSet } from './ops.ts'
import { emitDeckRecord, snapshotOf } from './events.ts'

/** The tool-registry slice this module needs. */
interface ToolService {
  register(definition: unknown): () => void
}

/** The execution identity fields this tool reads. */
interface DeckToolExec {
  readonly agent?: { readonly session: { readonly id: string } }
}

/** One candidate as the model may submit it. */
interface SubmittedSource {
  readonly title?: string
  readonly url?: string
  readonly note?: string
  readonly snippet?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sourcesOf(args: unknown): SubmittedSource[] {
  if (!isObject(args) || !Array.isArray(args.sources)) {
    throw new Error('deck_submit_sources requires a sources array')
  }
  return args.sources.map((value, index) => {
    if (!isObject(value)) throw new Error(`sources[${index}] must be an object`)
    const title = value.title
    const url = value.url
    if ((typeof title !== 'string' || title.trim() === '') && (typeof url !== 'string' || url.trim() === '')) {
      throw new Error(`sources[${index}] needs a title or url`)
    }
    return {
      ...(typeof title === 'string' ? { title } : {}),
      ...(typeof url === 'string' ? { url } : {}),
      ...(typeof value.note === 'string' ? { note: value.note } : {}),
      ...(typeof value.snippet === 'string' ? { snippet: value.snippet } : {}),
    }
  })
}

/**
 * Register `deck_submit_sources` on the Host tool registry.
 * @param ctx - Host context.
 * @param getStore - opens the shared deck store.
 */
export function registerDeckTool(ctx: Context, getStore: () => Promise<DeckStore>): void {
  ctx.inject(['tools'], (scoped) => {
    const tools = scoped.get('tools') as unknown as ToolService | undefined
    if (tools === undefined) return
    scoped.effect(() => tools.register({
      name: 'deck_submit_sources',
      description: 'Submit candidate sources to the user\'s SourceDeck panel. '
        + 'Each source needs a title or URL; duplicates are merged by normalized URL or title. '
        + 'The user screens the candidates and may hand the kept ones back in a later message.',
      parameters: {
        type: 'object',
        properties: {
          sources: {
            type: 'array',
            description: 'Candidate sources to screen.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Human-readable source title.' },
                url: { type: 'string', description: 'HTTP(S) source URL when one exists.' },
                note: { type: 'string', description: 'Why this source may matter.' },
                snippet: { type: 'string', description: 'Short excerpt for the user.' },
              },
              additionalProperties: false,
            },
          },
        },
        required: ['sources'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            setId: { type: 'string' },
            candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                },
                required: ['title'],
                additionalProperties: false,
              },
            },
          },
          required: ['count', 'setId', 'candidates'],
          additionalProperties: false,
        },
        render: (_args: unknown, value: unknown) => [{
          type: 'text',
          text: isObject(value) && typeof value.count === 'number'
            ? `已收入 ${value.count} 条候选到资料台，等待用户筛选。`
            : '已收入候选到资料台。',
        }],
      },
      async execute(args: unknown, exec: DeckToolExec) {
        const sessionId = exec.agent?.session.id
        if (sessionId === undefined) throw new Error('deck_submit_sources requires an owning agent session')
        const store = await getStore()
        const submitted = sourcesOf(args)
        const results = []
        for (const source of submitted) {
          const added = await addSource(store, { sessionId, origin: 'agent', ...source })
          emitDeckRecord(ctx, sessionId, 'plugin:dsh-source-deck/set-snapshot',
            snapshotOf(added.setId, await getSet(store, added.setId)))
          results.push(added)
        }
        const setId = results[0]?.setId
        if (setId === undefined) return { count: 0, setId: '', candidates: [] }
        const view = await getSet(store, setId)
        return {
          count: view.candidates.length,
          setId,
          candidates: view.candidates.map(entry => ({
            title: entry.source.title,
            ...(entry.source.url === undefined ? {} : { url: entry.source.url }),
          })),
        }
      },
    }), 'dsh-source-deck: deck_submit_sources tool')
  })
}
