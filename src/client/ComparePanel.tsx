import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { useMemo } from 'react'
import type { CandidateView } from '../ops.ts'
import { formatSourceFacts, safeWebUrl } from './source-presentation.ts'
import css from './ComparePanel.module.css'

const dimensions = ['source.note', 'source.description', 'source.stars', 'source.updated', 'source.language', 'source.license', 'source.reason'] as const

export function ComparePanel({ entries, t, remove }: { entries: readonly CandidateView[]; t: TranslateNS<'sourceDeck'>; remove(sourceId: string): void }) {
  const locale = document.documentElement.lang || navigator.language || 'zh-CN'
  const columns = useMemo(() => entries.map(entry => {
    const facts = formatSourceFacts(entry.source, locale)
    return { entry, values: [entry.source.note?.trim(), entry.source.meta?.description?.trim() || entry.source.snippet?.trim(), facts.stars, facts.updated, entry.source.meta?.language, entry.source.meta?.license, entry.candidate.reason] }
  }), [entries, locale])
  return <section className={css.panel} aria-label={t('compare.title')}>
    <h3>{t('compare.title')} · {entries.length}</h3>
    {entries.length < 2 ? <p>{t('compare.hint')}</p> : null}
    <div className={css.scroll}><table role="table" aria-label={t('compare.title')}><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">{t('compare.dimension')}</th>{entries.map(entry => <th role="columnheader" scope="col" key={entry.candidate.sourceId}>{entry.source.title}<button type="button" onClick={() => remove(entry.candidate.sourceId)} aria-label={`${t('compare.remove')} · ${entry.source.title}`}>×</button></th>)}</tr></thead>
      <tbody role="rowgroup">{dimensions.map((key, index) => <tr role="row" key={key}><th role="rowheader" scope="row">{t(key)}</th>{columns.map(({ entry, values }) => {
        return <td role="cell" key={entry.candidate.sourceId}><span className={css.sourceLabel} aria-hidden="true">{entry.source.title}</span>{values[index]?.trim() || '—'}</td>
      })}</tr>)}<tr role="row"><th role="rowheader" scope="row">URL</th>{entries.map(entry => <td role="cell" key={entry.candidate.sourceId}><span className={css.sourceLabel} aria-hidden="true">{entry.source.title}</span>{safeWebUrl(entry.source.url) ? <a href={safeWebUrl(entry.source.url)} target="_blank" rel="noreferrer">{entry.source.url}</a> : '—'}</td>)}</tr></tbody>
    </table></div>
  </section>
}
