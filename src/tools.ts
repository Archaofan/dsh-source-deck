/**
 * `deck_submit_sources` tool: the Agent's path into the deck.
 *
 * The deck's search button sends a prompt to the current conversation; the
 * Agent runs its normal search tools and submits the results here. The tool
 * validates and deduplicates each candidate, tags it with the active round,
 * and appends a whole-set log record for replay.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DeckStore } from './model.ts'
import { addSource, getSet } from './ops.ts'
import { emitDeckRecord, snapshotOf } from './events.ts'
import type { SourceMeta } from './scope-policy.ts'
import type { ResearchCoordinator } from './research-coordinator.ts'
import { requestDeckOpen } from './activity.ts'

/** The tool-registry slice this module needs. */
interface ToolService {
  register(definition: unknown): () => void
}

/** The execution identity fields this tool reads. */
interface DeckToolExec {
  readonly callId?: string
  readonly agent?: { readonly session: { readonly id: string; readonly header?: { readonly origin?: string } } }
}

/** One candidate as the model may submit it. */
interface SubmittedSource {
  readonly title?: string
  readonly url?: string
  readonly note?: string
  readonly snippet?: string
  readonly meta?: SourceMeta
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function metaOf(value: Record<string, unknown>, index: number): SourceMeta | undefined {
  const raw = value.meta
  if (raw === undefined) return undefined
  if (!isObject(raw)) throw new Error(`sources[${index}].meta must be an object`)
  const number = (name: string): number | undefined => {
    const item = raw[name]
    if (item === undefined) return undefined
    if (typeof item !== 'number' || !Number.isFinite(item) || item < 0) {
      throw new Error(`sources[${index}].meta.${name} must be a non-negative number`)
    }
    return item
  }
  const text = (name: string): string | undefined => {
    const item = raw[name]
    if (item === undefined) return undefined
    if (typeof item !== 'string') throw new Error(`sources[${index}].meta.${name} must be a string`)
    return item
  }
  const flag = (name: string): boolean | undefined => {
    const item = raw[name]
    if (item === undefined) return undefined
    if (typeof item !== 'boolean') throw new Error(`sources[${index}].meta.${name} must be a boolean`)
    return item
  }
  const topics = raw.topics
  if (topics !== undefined && (!Array.isArray(topics) || topics.some(topic => typeof topic !== 'string'))) {
    throw new Error(`sources[${index}].meta.topics must be an array of strings`)
  }
  const stars = number('stars')
  const pushedAt = text('pushedAt')
  const language = text('language')
  const license = text('license')
  const forks = number('forks')
  const archived = flag('archived')
  const fork = flag('fork')
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
    ...(topics === undefined ? {} : { topics: topics as string[] }),
    ...(description === undefined ? {} : { description }),
    ...(repo === undefined ? {} : { repo }),
    ...(owner === undefined ? {} : { owner }),
    ...(image === undefined ? {} : { image }),
    ...(homepage === undefined ? {} : { homepage }),
  }
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
    const meta = metaOf(value, index)
    return {
      ...(typeof title === 'string' ? { title } : {}),
      ...(typeof url === 'string' ? { url } : {}),
      ...(typeof value.note === 'string' ? { note: value.note } : {}),
      ...(typeof value.snippet === 'string' ? { snippet: value.snippet } : {}),
      ...(meta === undefined ? {} : { meta }),
    }
  })
}

/** JSON Schema for one optional source-metadata object. */
const META_SCHEMA = {
  type: 'object',
  description: 'Optional source metadata; GitHub fields render the deck card.',
  properties: {
    stars: { type: 'number', description: 'GitHub stargazers count.' },
    pushedAt: { type: 'string', description: 'ISO timestamp of the last push.' },
    language: { type: 'string', description: 'Primary language.' },
    license: { type: 'string', description: 'SPDX license identifier.' },
    forks: { type: 'number', description: 'Fork count.' },
    archived: { type: 'boolean', description: 'Whether the repository is archived.' },
    fork: { type: 'boolean', description: 'Whether the repository is itself a fork.' },
    topics: { type: 'array', items: { type: 'string' }, description: 'Repository topics.' },
    description: { type: 'string', description: 'One or two sentence description shown on the card.' },
    repo: { type: 'string', description: 'GitHub repository as owner/repo.' },
    owner: { type: 'string', description: 'GitHub owner login, used for the avatar.' },
    image: { type: 'string', description: 'Explicit card image URL.' },
    homepage: { type: 'string', description: 'Project homepage or docs URL.' },
  },
  additionalProperties: false,
}

/**
 * Register `deck_submit_sources` on the Host tool registry.
 * @param ctx - Host context.
 * @param getStore - opens the shared deck store.
 */
export function registerDeckTool(ctx: Context, getStore: () => Promise<DeckStore>, research?: ResearchCoordinator): void {
  ctx.inject(['tools'], (scoped) => {
    const tools = scoped.get('tools') as unknown as ToolService | undefined
    if (tools === undefined) return
    if (research) scoped.effect(() => tools.register({
      name: 'deck_search',
      description: 'Start SourceDeck background research and open the screening deck. 当用户说“用资料台找…”、“把这些技术方案放到资料台比较”时调用。Find open-source libraries or technical sources using an independent worker while the main conversation continues. Returns immediately after startup; do not wait or duplicate this search in the main chat.',
      parameters: { type: 'object', properties: { request: { type: 'string', description: 'The user research requirement.' }, note: { type: 'string', description: 'Optional constraints.' } }, required: ['request'], additionalProperties: false },
      output: { schema: { type: 'object', properties: { roundId: { type: 'string' }, status: { type: 'string' } }, required: ['roundId', 'status'], additionalProperties: false },
        render: () => [{ type: 'text', text: '资料台正在后台研究，可继续当前开发对话。' }] },
      async execute(args: unknown, exec: DeckToolExec) {
        const sessionId = exec.agent?.session.id
        if (!sessionId || exec.agent?.session.header?.origin === 'subagent') throw new Error('deck_search requires the main conversation')
        if (!isObject(args) || typeof args.request !== 'string' || !args.request.trim()) throw new Error('research request is required')
        const result = await research.start({ sessionId, request: args.request, requestId: `deck-search:${sessionId}:${exec.callId ?? crypto.randomUUID()}`, mode: 'new', ...(typeof args.note === 'string' ? { note: args.note } : {}) })
        await requestDeckOpen(await getStore(), sessionId, result.target.setId, result.roundId)
        return { roundId: result.roundId, status: 'started' }
      },
    }), 'dsh-source-deck: natural language research tool')
    scoped.effect(() => tools.register({
      name: 'deck_submit_sources',
      description: 'Submit the results of a SourceDeck search round. '
        + 'Each source needs a title or URL; duplicates are merged by normalized URL or title. '
        + 'For GitHub repositories include meta.owner, meta.repo, meta.description, meta.stars and meta.language '
        + 'so the deck can render a rich card; for articles include a one-line note. '
        + 'Submit the whole round in one call; the user reviews it and may ask for another round.',
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
                meta: META_SCHEMA,
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
            ? `已提交 ${value.count} 条候选到资料台。`
            : '已提交候选到资料台。',
        }],
      },
      async execute(args: unknown, exec: DeckToolExec) {
        const callerId = exec.agent?.session.id
        if (callerId === undefined) throw new Error('deck_submit_sources requires an owning agent session')
        const target = await research?.targetForWorker(callerId)
        if (!target && exec.agent?.session.header?.origin === 'subagent') throw new Error('research worker is not assigned to a SourceDeck round')
        const sessionId = target?.parentSessionId ?? callerId
        const store = await getStore()
        const submitted = sourcesOf(args)
        const results = []
        for (const source of submitted) {
          const added = await addSource(store, { sessionId, origin: 'agent', ...source, ...(target ? { target } : {}) })
          results.push(added)
        }
        const setId = results[0]?.setId ?? target?.setId
        if (setId === undefined) return { count: 0, setId: '', candidates: [] }
        const view = await getSet(store, setId)
        emitDeckRecord(ctx, sessionId, 'plugin:dsh-source-deck/set-snapshot', snapshotOf(setId, view))
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
