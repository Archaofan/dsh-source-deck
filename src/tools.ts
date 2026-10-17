/**
 * `deck_submit_sources` tool: the agent's path into the deck.
 *
 * The tool validates each candidate, deduplicates on the normalized source
 * key, computes non-blocking policy flags from optional metadata, appends a
 * whole-set log record, and returns a bounded summary plus the active policy.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DeckStore } from './model.ts'
import { addSource, getPolicy, getSet } from './ops.ts'
import { emitDeckRecord, snapshotOf } from './events.ts'
import { policySummary, type SourceMeta } from './scope-policy.ts'

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
  return {
    ...(stars === undefined ? {} : { stars }),
    ...(pushedAt === undefined ? {} : { pushedAt }),
    ...(language === undefined ? {} : { language }),
    ...(license === undefined ? {} : { license }),
    ...(forks === undefined ? {} : { forks }),
    ...(archived === undefined ? {} : { archived }),
    ...(fork === undefined ? {} : { fork }),
    ...(topics === undefined ? {} : { topics: topics as string[] }),
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
  description: 'Optional source metadata the Host compares with the active source policy.',
  properties: {
    stars: { type: 'number', description: 'GitHub stargazers count.' },
    pushedAt: { type: 'string', description: 'ISO timestamp of the last push.' },
    language: { type: 'string', description: 'Primary language.' },
    license: { type: 'string', description: 'SPDX license identifier.' },
    forks: { type: 'number', description: 'Fork count.' },
    archived: { type: 'boolean', description: 'Whether the repository is archived.' },
    fork: { type: 'boolean', description: 'Whether the repository is itself a fork.' },
    topics: { type: 'array', items: { type: 'string' }, description: 'Repository topics.' },
  },
  additionalProperties: false,
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
        + 'Pass GitHub metadata (stars, pushedAt, language, fork, archived, topics) when available: '
        + 'the Host flags candidates that fall outside the user\'s active source policy. '
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
            policy: { type: 'string' },
            candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                  policyFlags: { type: 'array', items: { type: 'string' } },
                },
                required: ['title'],
                additionalProperties: false,
              },
            },
          },
          required: ['count', 'setId', 'policy', 'candidates'],
          additionalProperties: false,
        },
        render: (_args: unknown, value: unknown) => [{
          type: 'text',
          text: isObject(value) && typeof value.count === 'number'
            ? `已收入 ${value.count} 条候选到资料台，等待用户筛选。当前来源策略：${String(value.policy ?? '未设置')}`
            : '已收入候选到资料台。',
        }],
      },
      async execute(args: unknown, exec: DeckToolExec) {
        const sessionId = exec.agent?.session.id
        if (sessionId === undefined) throw new Error('deck_submit_sources requires an owning agent session')
        const store = await getStore()
        const policy = await getPolicy(store)
        const summary = policySummary(policy)
        const submitted = sourcesOf(args)
        const results = []
        for (const source of submitted) {
          const added = await addSource(store, { sessionId, origin: 'agent', ...source })
          emitDeckRecord(ctx, sessionId, 'plugin:dsh-source-deck/set-snapshot',
            snapshotOf(added.setId, await getSet(store, added.setId), summary))
          results.push(added)
        }
        const setId = results[0]?.setId
        if (setId === undefined) return { count: 0, setId: '', policy: summary, candidates: [] }
        const view = await getSet(store, setId)
        return {
          count: view.candidates.length,
          setId,
          policy: summary,
          candidates: view.candidates.map(entry => ({
            title: entry.source.title,
            ...(entry.source.url === undefined ? {} : { url: entry.source.url }),
            ...(entry.candidate.policyFlags === undefined ? {} : { policyFlags: entry.candidate.policyFlags }),
          })),
        }
      },
    }), 'dsh-source-deck: deck_submit_sources tool')
  })
}
