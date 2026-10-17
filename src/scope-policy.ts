/**
 * Source-scope policy: the user's structured source constraints.
 *
 * SourceDeck never fetches metadata itself; the Agent supplies it with each
 * candidate and the Host only compares that metadata against the active policy,
 * producing non-blocking flags for the panel and the conversation card.
 */

/** Preset policy kinds. */
export type PolicyKind = 'github' | 'web' | 'llm-freeform'

/** Metadata the Agent may attach to one source. */
export interface SourceMeta {
  readonly stars?: number
  readonly pushedAt?: string
  readonly language?: string
  readonly license?: string
  readonly forks?: number
  readonly archived?: boolean
  readonly fork?: boolean
  readonly topics?: readonly string[]
  /** Short human-readable description shown on the card. */
  readonly description?: string
  /** `owner/repo` for a GitHub source, when known. */
  readonly repo?: string
  /** GitHub owner login, used for the avatar. */
  readonly owner?: string
  /** Explicit card image URL; falls back to the GitHub owner avatar. */
  readonly image?: string
  /** Project homepage or docs site. */
  readonly homepage?: string
}

/** One policy's parameters. Only fields for the selected kind are meaningful. */
export interface PolicyParams {
  readonly minStars?: number
  readonly updatedWithinMonths?: number
  readonly languages?: readonly string[]
  readonly licenses?: readonly string[]
  readonly topics?: readonly string[]
  readonly excludeForks?: boolean
  readonly excludeArchived?: boolean
  readonly domainsAllow?: readonly string[]
  readonly domainsBlock?: readonly string[]
  readonly preferOfficialDocs?: boolean
  readonly guidance?: string
}

/** One persisted policy. */
export interface ScopePolicy {
  readonly kind: PolicyKind
  readonly params: PolicyParams
  readonly updatedAt?: string
}

/**
 * First-run policy: no hard thresholds, only the user's stated preference.
 * A GitHub/star policy is one click away as a preset; making it the default
 * would flag most sources for users who never asked for that constraint.
 */
export const DEFAULT_POLICY: ScopePolicy = {
  kind: 'llm-freeform',
  params: { guidance: '优先官方文档、近期活跃的高星项目；排除营销与低质内容' },
}

const KINDS: readonly PolicyKind[] = ['github', 'web', 'llm-freeform']

function objectOf(value: unknown, subject: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${subject} must be an object`)
  }
  return value as Record<string, unknown>
}

function optionalNumber(params: Record<string, unknown>, name: string, min: number): number | undefined {
  const value = params[name]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new Error(`${name} must be a number >= ${min}`)
  }
  return value
}

function optionalStrings(params: Record<string, unknown>, name: string): readonly string[] | undefined {
  const value = params[name]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${name} must be an array of non-empty strings`)
  }
  return value.map(item => (item as string).trim())
}

function optionalBoolean(params: Record<string, unknown>, name: string): boolean | undefined {
  const value = params[name]
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`${name} must be a boolean`)
  return value
}

/**
 * Validate and normalize one policy payload.
 * @param input - policy from settings or storage.
 * @returns a policy carrying only the declared fields.
 * @throws when the kind or a declared parameter is invalid.
 */
export function normalizePolicy(input: unknown): ScopePolicy {
  const record = objectOf(input, 'policy')
  const kind = record.kind
  if (typeof kind !== 'string' || !KINDS.includes(kind as PolicyKind)) {
    throw new Error(`policy kind must be one of ${KINDS.join(', ')}`)
  }
  const params = objectOf(record.params ?? {}, 'policy params')
  const normalized: PolicyParams = {
    ...(optionalNumber(params, 'minStars', 0) === undefined ? {} : { minStars: optionalNumber(params, 'minStars', 0) }),
    ...(optionalNumber(params, 'updatedWithinMonths', 1) === undefined ? {} : { updatedWithinMonths: optionalNumber(params, 'updatedWithinMonths', 1) }),
    ...(optionalStrings(params, 'languages') === undefined ? {} : { languages: optionalStrings(params, 'languages') }),
    ...(optionalStrings(params, 'licenses') === undefined ? {} : { licenses: optionalStrings(params, 'licenses') }),
    ...(optionalStrings(params, 'topics') === undefined ? {} : { topics: optionalStrings(params, 'topics') }),
    ...(optionalBoolean(params, 'excludeForks') === undefined ? {} : { excludeForks: optionalBoolean(params, 'excludeForks') }),
    ...(optionalBoolean(params, 'excludeArchived') === undefined ? {} : { excludeArchived: optionalBoolean(params, 'excludeArchived') }),
    ...(optionalStrings(params, 'domainsAllow') === undefined ? {} : { domainsAllow: optionalStrings(params, 'domainsAllow') }),
    ...(optionalStrings(params, 'domainsBlock') === undefined ? {} : { domainsBlock: optionalStrings(params, 'domainsBlock') }),
    ...(optionalBoolean(params, 'preferOfficialDocs') === undefined ? {} : { preferOfficialDocs: optionalBoolean(params, 'preferOfficialDocs') }),
  }
  if (params.guidance !== undefined) {
    if (typeof params.guidance !== 'string') throw new Error('guidance must be a string')
    if (params.guidance.length > 2000) throw new Error('guidance must be at most 2000 characters')
  }
  return {
    kind: kind as PolicyKind,
    params: {
      ...normalized,
      ...(params.guidance === undefined ? {} : { guidance: params.guidance }),
    },
  }
}

/** One-line human/model summary of the active policy. */
export function policySummary(policy: ScopePolicy): string {
  const { kind, params } = policy
  if (kind === 'github') {
    const parts = ['GitHub']
    if (params.minStars !== undefined) parts.push(`stars≥${params.minStars}`)
    if (params.updatedWithinMonths !== undefined) parts.push(`近${params.updatedWithinMonths}个月更新`)
    if (params.languages !== undefined && params.languages.length > 0) parts.push(`语言=${params.languages.join('/')}`)
    if (params.licenses !== undefined && params.licenses.length > 0) parts.push(`License=${params.licenses.join('/')}`)
    if (params.topics !== undefined && params.topics.length > 0) parts.push(`topics=${params.topics.join('/')}`)
    if (params.excludeForks === true) parts.push('排除 fork')
    if (params.excludeArchived === true) parts.push('排除 archived')
    return parts.join(' · ')
  }
  if (kind === 'web') {
    const parts = ['网页']
    if (params.domainsAllow !== undefined && params.domainsAllow.length > 0) parts.push(`允许=${params.domainsAllow.join('/')}`)
    if (params.domainsBlock !== undefined && params.domainsBlock.length > 0) parts.push(`屏蔽=${params.domainsBlock.join('/')}`)
    if (params.preferOfficialDocs === true) parts.push('优先官方文档')
    return parts.join(' · ')
  }
  return `LLM 自主${params.guidance === undefined || params.guidance.trim() === '' ? '' : ` · ${params.guidance.trim()}`}`
}

function hostOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

function hostMatches(host: string, domain: string): boolean {
  const normalized = domain.trim().toLowerCase()
  return normalized !== '' && (host === normalized || host.endsWith(`.${normalized}`))
}

function monthsAgo(now: number, months: number): number {
  return now - months * 30.44 * 24 * 60 * 60 * 1000
}

/**
 * Compare one source's metadata with the active policy.
 * @param policy - active policy.
 * @param meta - source metadata supplied by the Agent (missing facts skip their dimension).
 * @param url - source URL when one exists.
 * @param now - clock for deterministic staleness checks.
 * @returns non-blocking flags in a stable order; never blocks a source.
 */
export function computeFlags(
  policy: ScopePolicy,
  meta: SourceMeta,
  url: string | undefined,
  now: number = Date.now(),
): string[] {
  const flags: string[] = []
  const params = policy.params
  if (policy.kind === 'github') {
    if (params.minStars !== undefined && meta.stars !== undefined && meta.stars < params.minStars) {
      flags.push('stars-below')
    }
    if (params.updatedWithinMonths !== undefined && meta.pushedAt !== undefined) {
      const pushed = Date.parse(meta.pushedAt)
      if (Number.isFinite(pushed) && pushed < monthsAgo(now, params.updatedWithinMonths)) flags.push('stale')
    }
    if (params.languages !== undefined && params.languages.length > 0 && meta.language !== undefined) {
      const allowed = params.languages.map(language => language.toLowerCase())
      if (!allowed.includes(meta.language.toLowerCase())) flags.push('language-not-allowed')
    }
    if (params.licenses !== undefined && params.licenses.length > 0 && meta.license !== undefined) {
      const allowed = params.licenses.map(license => license.toLowerCase())
      if (!allowed.includes(meta.license.toLowerCase())) flags.push('license-not-allowed')
    }
    if (params.topics !== undefined && params.topics.length > 0 && meta.topics !== undefined) {
      const allowed = new Set(params.topics.map(topic => topic.toLowerCase()))
      if (!meta.topics.some(topic => allowed.has(topic.toLowerCase()))) flags.push('topic-missing')
    }
    if (params.excludeForks === true && meta.fork === true) flags.push('fork')
    if (params.excludeArchived === true && meta.archived === true) flags.push('archived')
  } else if (policy.kind === 'web') {
    const host = hostOf(url)
    if (host !== undefined) {
      if (params.domainsBlock?.some(domain => hostMatches(host, domain)) === true) {
        flags.push('domain-blocked')
      } else if (params.domainsAllow !== undefined && params.domainsAllow.length > 0
        && !params.domainsAllow.some(domain => hostMatches(host, domain))) {
        flags.push('domain-not-allowed')
      }
    }
  }
  return flags
}
