import type { SourceRecord } from '../model.ts'
const formatters = new Map<string, { date: Intl.DateTimeFormat; number: Intl.NumberFormat }>()
function localeFormatters(locale: string) {
  let cached = formatters.get(locale)
  if (!cached) {
    cached = { date: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }), number: new Intl.NumberFormat(locale) }
    if (formatters.size >= 8) formatters.delete(formatters.keys().next().value!)
    formatters.set(locale, cached)
  }
  return cached
}
export function safeWebUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined } catch { return undefined }
}
export function githubRepo(source: SourceRecord): string | undefined {
  try {
    const url = new URL(source.url ?? '')
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.hostname.toLowerCase() === 'github.com' && parts.length >= 2) return `${parts[0]}/${parts[1]}`
  } catch { /* A title-only source has no repository identity. */ }
  return undefined
}
export function sourceImages(source: SourceRecord): readonly string[] {
  const images: string[] = []
  const explicit = safeWebUrl(source.meta?.image)
  if (explicit) images.push(explicit)
  const owner = source.meta?.owner ?? githubRepo(source)?.split('/')[0]
  if (owner && /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(owner)) images.push(`https://github.com/${encodeURIComponent(owner)}.png?size=160`)
  return [...new Set(images)]
}
export function formatSourceFacts(source: SourceRecord, locale: string): { stars: string; updated: string; checked: string } {
  const unknown = locale.startsWith('zh') ? '未知' : 'Unknown'
  const formatter = localeFormatters(locale)
  const date = (value?: string) => {
    if (!value || !Number.isFinite(Date.parse(value))) return unknown
    return formatter.date.format(new Date(value))
  }
  const stars = source.meta?.stars
  return { stars: typeof stars === 'number' && Number.isFinite(stars) && stars >= 0 ? formatter.number.format(stars) : unknown,
    updated: date(source.meta?.pushedAt), checked: date(source.meta?.metadataFetchedAt) }
}
