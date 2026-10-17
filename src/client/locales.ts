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
    /** Deck tab type label and the stage-one placeholder copy. */
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
} satisfies Record<DeckKey, string>
