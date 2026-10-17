/**
 * Source identity helpers: URL normalization and the dedupe key stored on
 * every source record. Pure functions with no Cordis or storage dependency.
 */

/** Query keys that never identify a document. */
const TRACKING_PARAMETER = /^(?:utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid)$/i

/**
 * Normalize an absolute HTTP(S) URL for identity comparison.
 * @param raw - candidate URL.
 * @returns the normalized URL, or null when it is not a valid HTTP(S) URL.
 */
export function normalizeUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = ''
  }
  const parameters = [...url.searchParams.entries()]
    .filter(([name]) => !TRACKING_PARAMETER.test(name))
    .sort(([leftName, leftValue], [rightName, rightValue]) =>
      leftName === rightName ? leftValue.localeCompare(rightValue) : leftName.localeCompare(rightName))
  const search = parameters.length === 0
    ? ''
    : `?${parameters.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&')}`
  const pathname = url.pathname.length > 1 && url.pathname.endsWith('/')
    ? url.pathname.slice(0, -1)
    : url.pathname
  return `${url.protocol}//${url.host}${pathname}${search}`
}

/** One source's identifying fields. */
export interface SourceIdentity {
  readonly url?: string | undefined
  readonly title?: string | undefined
}

/**
 * Compute the durable dedupe key for one source.
 * @param source - source title and optional URL.
 * @returns `url:<normalized>` when a valid URL exists, otherwise `title:<normalized>`.
 * @throws when the source has neither a usable URL nor a non-empty title.
 */
export function dedupeKey(source: SourceIdentity): string {
  if (source.url !== undefined && source.url.trim() !== '') {
    const normalized = normalizeUrl(source.url)
    if (normalized !== null) return `url:${normalized}`
  }
  const title = (source.title ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
  if (title === '') throw new Error('source needs a title or url')
  return `title:${title}`
}
