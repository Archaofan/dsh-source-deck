/**
 * The `sourceDeck` namespace dictionaries, and the namespace declaration.
 *
 * The namespace merge lives with its key set so any module naming
 * `TranslateNS<'sourceDeck'>` or `PropsLocale<'sourceDeck'>` needs only this
 * file, whichever entry a program loads first.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Deck tab type label, panel copy, and submission states. */
    sourceDeck: DeckKey
  }
}

/** Simplified Chinese dictionary and key-set source of truth. */
export const zh = {
  'type.label': '资料台',
  'guide.title': '资料筛选台',
  'guide.description': '收集候选资料，逐条筛选后交回 Agent',
  'empty.title': '资料台已就绪',
  'empty.note': '候选资料会出现在这里。Agent 提交或手动添加后即可筛选。',
  'add.title': '标题',
  'add.url': '链接（可选）',
  'add.note': '备注（可选）',
  'add.button': '加入候选',
  'add.invalid': '请至少填写标题或链接',
  'group.pending': '待处理',
  'group.kept': '保留',
  'group.excluded': '排除',
  'action.keep': '保留',
  'action.exclude': '排除',
  'action.undo': '撤销',
  'submit.button': '提交给 Agent',
  'submit.busy': '提交中…',
  'submit.done': '已提交，Agent 会收到筛选摘要。',
  'submit.continue': '继续筛选',
  'submit.none': '先保留或排除至少一条资料',
  'summary': '保留 {kept} · 排除 {excluded} · 待处理 {pending}',
  'source.open': '打开链接',
  'card.title': '候选资料集',
  'card.more': '另有 {count} 条，在资料台查看',
  'card.open': '在资料台打开',
  'card.verdict.pending': '待处理',
  'card.verdict.kept': '保留',
  'card.verdict.excluded': '排除',
  'error.prefix': '操作失败：',
} satisfies Record<string, string>

/** Deck dictionary key union. */
export type DeckKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
export const en = {
  'type.label': 'Deck',
  'guide.title': 'Source deck',
  'guide.description': 'Collect candidate sources, screen them one by one, and hand the selection back to the Agent',
  'empty.title': 'Deck is ready',
  'empty.note': 'Candidate sources will appear here. Screen them once the Agent submits or you add one.',
  'add.title': 'Title',
  'add.url': 'URL (optional)',
  'add.note': 'Note (optional)',
  'add.button': 'Add candidate',
  'add.invalid': 'Enter a title or a URL',
  'group.pending': 'Pending',
  'group.kept': 'Kept',
  'group.excluded': 'Excluded',
  'action.keep': 'Keep',
  'action.exclude': 'Exclude',
  'action.undo': 'Undo',
  'submit.button': 'Submit to Agent',
  'submit.busy': 'Submitting…',
  'submit.done': 'Submitted. The Agent will receive the selection summary.',
  'submit.continue': 'Keep screening',
  'submit.none': 'Keep or exclude at least one source first',
  'summary': 'Kept {kept} · Excluded {excluded} · Pending {pending}',
  'source.open': 'Open link',
  'card.title': 'Candidate sources',
  'card.more': '{count} more in the deck',
  'card.open': 'Open in deck',
  'card.verdict.pending': 'Pending',
  'card.verdict.kept': 'Kept',
  'card.verdict.excluded': 'Excluded',
  'error.prefix': 'Operation failed: ',
} satisfies Record<DeckKey, string>
