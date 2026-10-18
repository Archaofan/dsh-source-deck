/**
 * Stage one of the deck's registration: what the `sourcedeck` tab type IS.
 *
 * A page type: it claims no resource address and is opened by kind. The band is
 * `extension`, the band for a type from outside the product, which also outranks
 * every viewer shipped with the sidebar.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightTabParamsMap {
    sourcedeck: { readonly setId?: string; readonly roundId?: string }
  }
}

/** Type discriminator: what tabs of this type are, and what `openTab` names. */
export const DECK_KIND = 'sourcedeck'

/** This implementation's identity in the tab system, and the key its body registers under. */
export const DECK_ID = 'dsh-source-deck'

/**
 * The deck type's registry definition.
 * @param t - namespace-bound translate, read fresh on every label call.
 * @returns the definition to register.
 */
export function deckDefinition(t: TranslateNS<'sourceDeck'>): SidebarRightTabDefinition {
  return {
    id: DECK_ID,
    kind: DECK_KIND,
    priority: 'extension',
    title: () => t('type.label'),
    guide: [{
      id: 'deck',
      order: 10,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
    }],
  }
}
