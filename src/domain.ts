/**
 * `source_deck` storage domain: five per-record tables opened through the Host
 * storage-domain facility.
 *
 * The facility validates each stored record with the table's schema on open.
 * The schemas here are small hand-written parsers rather than zod values: the
 * Host half must not depend on a runtime import that the profile cannot
 * resolve from an out-of-tree package, and the records are simple JSON.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DeckStore } from './model.ts'

/** The storage-domain facility slice this module needs. */
interface DomainFacility {
  open(spec: unknown): Promise<DomainHandle>
}

/** One table handle. */
interface TableHandle {
  get(key: string): unknown
  entries(): IterableIterator<[string, unknown]>
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<boolean>
}

/** One opened domain handle. */
interface DomainHandle {
  table(name: string): TableHandle
  close(): Promise<void>
}

/** A schema-like validator the facility calls before serving a record. */
function recordSchema(validate: (value: unknown) => void) {
  return {
    parse(value: unknown) {
      validate(value)
      return value
    },
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredString(value: unknown, field: string): void {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} must be a non-empty string`)
}

function requiredEnum(value: unknown, field: string, allowed: readonly string[]): void {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new Error(`${field} must be one of ${allowed.join(', ')}`)
  }
}

function validateSet(value: unknown): void {
  if (!isObject(value)) throw new Error('set record must be an object')
  requiredString(value.sessionId, 'set.sessionId')
  requiredEnum(value.origin, 'set.origin', ['agent', 'user'])
  requiredString(value.createdAt, 'set.createdAt')
  requiredEnum(value.status, 'set.status', ['open', 'submitted'])
}

function validateSource(value: unknown): void {
  if (!isObject(value)) throw new Error('source record must be an object')
  requiredString(value.title, 'source.title')
  requiredEnum(value.origin, 'source.origin', ['agent', 'user'])
  requiredString(value.dedupeKey, 'source.dedupeKey')
  requiredString(value.createdAt, 'source.createdAt')
  if (value.meta !== undefined && !isObject(value.meta)) throw new Error('source.meta must be an object')
}

function validateCandidate(value: unknown): void {
  if (!isObject(value)) throw new Error('candidate record must be an object')
  requiredString(value.setId, 'candidate.setId')
  requiredString(value.sourceId, 'candidate.sourceId')
  requiredEnum(value.verdict, 'candidate.verdict', ['pending', 'kept', 'excluded'])
  requiredString(value.createdAt, 'candidate.createdAt')
  if (value.roundId !== undefined) requiredString(value.roundId, 'candidate.roundId')
  if (value.policyFlags !== undefined
    && (!Array.isArray(value.policyFlags) || value.policyFlags.some(flag => typeof flag !== 'string'))) {
    throw new Error('candidate.policyFlags must be an array of strings')
  }
}

function validateRound(value: unknown): void {
  if (!isObject(value)) throw new Error('round record must be an object')
  requiredString(value.setId, 'round.setId')
  requiredString(value.sessionId, 'round.sessionId')
  if (typeof value.index !== 'number' || !Number.isInteger(value.index) || value.index < 1) {
    throw new Error('round.index must be a positive integer')
  }
  requiredString(value.request, 'round.request')
  requiredString(value.createdAt, 'round.createdAt')
}

function validateFavorite(value: unknown): void {
  if (!isObject(value)) throw new Error('favorite record must be an object')
  requiredString(value.title, 'favorite.title')
  requiredString(value.addedAt, 'favorite.addedAt')
}

function validatePolicy(value: unknown): void {
  if (!isObject(value)) throw new Error('scope policy record must be an object')
  requiredEnum(value.kind, 'policy.kind', ['github', 'web', 'llm-freeform'])
  if (!isObject(value.params)) throw new Error('policy.params must be an object')
  requiredString(value.createdAt, 'policy.createdAt')
  requiredString(value.updatedAt, 'policy.updatedAt')
}

function validateSelection(value: unknown): void {
  if (!isObject(value)) throw new Error('selection record must be an object')
  requiredString(value.setId, 'selection.setId')
  requiredString(value.sessionId, 'selection.sessionId')
  requiredString(value.requestId, 'selection.requestId')
  requiredString(value.submittedAt, 'selection.submittedAt')
  if (!Array.isArray(value.kept)) throw new Error('selection.kept must be an array')
  if (!Array.isArray(value.excluded)) throw new Error('selection.excluded must be an array')
}

function validateSessionActive(value: unknown): void {
  if (!isObject(value)) throw new Error('session_active record must be an object')
  requiredString(value.setId, 'session_active.setId')
}

/** Domain declaration handed to the facility. */
const DOMAIN_SPEC = {
  name: 'source_deck',
  version: 1,
  layout: 'per-record',
  tables: {
    sets: { valueSchema: recordSchema(validateSet) },
    sources: { valueSchema: recordSchema(validateSource) },
    candidates: { valueSchema: recordSchema(validateCandidate) },
    selections: { valueSchema: recordSchema(validateSelection) },
    scope_policies: { valueSchema: recordSchema(validatePolicy) },
    rounds: { valueSchema: recordSchema(validateRound) },
    favorites: { valueSchema: recordSchema(validateFavorite) },
    session_active: { valueSchema: recordSchema(validateSessionActive) },
  },
} as const

/** An opened deck store plus its close hook. */
export interface OpenDeck {
  readonly store: DeckStore
  close(): Promise<void>
}

/**
 * Open the deck domain and adapt it to the operation store surface.
 * @param ctx - Host context carrying the storage-domain facility.
 * @returns the store and a close hook.
 */
export async function openDeck(ctx: Context): Promise<OpenDeck> {
  const facility = ctx.get('storageDomain') as unknown as DomainFacility | undefined
  if (facility === undefined) throw new Error('source-deck requires the storageDomain service')
  const domain = await facility.open(DOMAIN_SPEC)
  const table = (name: string) => domain.table(name)
  const store: DeckStore = {
    get: (name, key) => table(name).get(key),
    entries: name => table(name).entries(),
    put: (name, key, value) => table(name).put(key, value),
    delete: (name, key) => table(name).delete(key),
  }
  return { store, close: () => domain.close() }
}
