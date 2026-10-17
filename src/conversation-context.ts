/**
 * Recent conversation context for a deck round.
 *
 * The deck is session-bound: when a round starts, the Host reads the session
 * log and gives the model a short recap of what the user and assistant were
 * discussing. That is what makes the deck feel like part of the chat instead
 * of a separate search box: a request like "continue with these" has a referent.
 */
import type { Session } from '@deepseek-ai/dsh-session'

/** The narrow Session read surface this module needs. */
interface SessionReader {
  readonly seq: number
  eventAt(seq: number): { readonly type: string; readonly data: unknown } | undefined
}

/** Extract plain text from a message content array. */
function textOf(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined
  const parts: string[] = []
  for (const part of content) {
    if (typeof part !== 'object' || part === null) continue
    const block = part as Record<string, unknown>
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
  }
  const text = parts.join('').trim()
  return text === '' ? undefined : text
}

/** One readable message from the tail of the session. */
interface RecapLine {
  readonly role: '用户' | '助手'
  readonly text: string
}

/** Skip the deck's own machinery so a round does not quote itself. */
function isDeckNoise(text: string): boolean {
  return text.startsWith('请帮我找资料')
    || text.startsWith('用户已筛选资料集')
    || text.startsWith('资料台第')
}

/** The runtime appends host context as user-role text; it is not conversation. */
function isRuntimeNoise(text: string): boolean {
  return text.includes('Current runtime context')
    || text.includes('Current working directory:')
    || text.includes('Current DSH file policy')
    || text.includes('Current DeepSeek Harness')
    || text.includes('<system-reminder>')
    || text.includes('A skill is a reusable')
    || text.includes('Approval policy:')
    || text.startsWith('Time sampled while preparing turn')
    || text.includes('Browser time zone for this request')
    || text.startsWith('Elapsed since the preceding')
}

/**
 * Read a compact recap of the session's recent user/assistant messages.
 * @param session - the owning DSH session.
 * @param maxChars - upper bound of the returned text.
 * @returns the recap, or undefined when the session has no readable messages.
 */
export function recentConversation(session: Session, maxChars = 1200): string | undefined {
  const reader = session as unknown as SessionReader
  const lines: RecapLine[] = []
  const start = Math.max(0, reader.seq - 160)
  for (let index = start; index < reader.seq; index++) {
    const event = reader.eventAt(index)
    if (event === undefined) continue
    let role: '用户' | '助手' | undefined
    let content: unknown
    if (event.type === 'user/message') {
      role = '用户'
      content = (event.data as { content?: unknown }).content
    } else if (event.type === 'assistant/message') {
      role = '助手'
      content = ((event.data as { message?: { content?: unknown } }).message)?.content
    }
    if (role === undefined) continue
    const text = textOf(content)
    if (text === undefined || isDeckNoise(text) || isRuntimeNoise(text)) continue
    lines.push({ role, text: text.length > 400 ? `${text.slice(0, 400)}…` : text })
  }
  if (lines.length === 0) return undefined
  const tail = lines.slice(-5)
  let recap = tail.map(line => `${line.role}：${line.text}`).join('\n')
  if (recap.length > maxChars) recap = `${recap.slice(0, maxChars)}…`
  return recap
}
