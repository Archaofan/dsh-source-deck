/**
 * Model-facing selection summary. The text is bounded structured fact only:
 * kept entries (ordinal, title, URL) and excluded entries with reasons.
 */

/** One kept source in the summary. */
export interface PromptKept {
  readonly title: string
  readonly url?: string
}

/** One excluded source in the summary. */
export interface PromptExcluded {
  readonly title: string
  readonly reason?: string
}

/** Inputs the summary needs. */
export interface PromptInput {
  readonly total: number
  readonly kept: readonly PromptKept[]
  readonly excluded: readonly PromptExcluded[]
}

/**
 * Build the user message sent back to the agent after a deck submission.
 * @param input - counts and bounded source facts.
 * @returns the Chinese summary text.
 */
export function buildPrompt(input: PromptInput): string {
  const lines = [`用户已筛选资料集（共 ${input.total} 条候选）：`]
  if (input.kept.length > 0) {
    lines.push(`保留 ${input.kept.length} 条：`)
    input.kept.forEach((source, index) => {
      lines.push(`${index + 1}）《${source.title}》${source.url === undefined ? '' : source.url}`)
    })
  } else {
    lines.push('保留 0 条。')
  }
  if (input.excluded.length > 0) {
    lines.push(`排除 ${input.excluded.length} 条：`)
    input.excluded.forEach((source, index) => {
      lines.push(`${index + 1}）《${source.title}》${source.reason === undefined ? '' : `（理由：${source.reason}）`}`)
    })
  }
  lines.push('请基于保留资料继续。')
  return lines.join('\n')
}
