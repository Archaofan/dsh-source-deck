import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { CandidateView } from '../ops.ts'
import { formatSourceFacts, safeWebUrl } from './source-presentation.ts'
import css from './ComparePanel.module.css'

export function ComparePanel({ entries, t, remove }: { entries: readonly CandidateView[]; t: TranslateNS<'sourceDeck'>; remove(sourceId: string): void }) {
  return <section className={css.panel} aria-label={t('compare.title')}>
    <h3>{t('compare.title')} · {entries.length}</h3>
    {entries.length < 2 ? <p>{t('compare.hint')}</p> : null}
    <div className={css.scroll}><table><thead><tr><th>{t('compare.dimension')}</th>{entries.map(entry => <th key={entry.candidate.sourceId}>{entry.source.title}<button type="button" onClick={() => remove(entry.candidate.sourceId)} aria-label={t('compare.remove')}>×</button></th>)}</tr></thead>
      <tbody>{['source.description', 'source.stars', 'source.updated', 'source.language', 'source.license', 'source.reason'].map((key, index) => <tr key={key}><th>{t(key as 'source.description')}</th>{entries.map(entry => {
        const facts = formatSourceFacts(entry.source, document.documentElement.lang || navigator.language || 'zh-CN')
        const values = [entry.source.meta?.description ?? entry.source.note, facts.stars, facts.updated, entry.source.meta?.language, entry.source.meta?.license, entry.candidate.reason]
        return <td key={entry.candidate.sourceId}>{values[index] || '—'}</td>
      })}</tr>)}<tr><th>URL</th>{entries.map(entry => <td key={entry.candidate.sourceId}>{safeWebUrl(entry.source.url) ? <a href={safeWebUrl(entry.source.url)} target="_blank" rel="noreferrer">{entry.source.url}</a> : '—'}</td>)}</tr></tbody>
    </table></div>
  </section>
}
