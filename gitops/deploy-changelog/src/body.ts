// The start marker names the commit the changelog was computed for, so that
// deploy-notify can tell a changelog left behind by a failed run.
export const startMarker = (head: string): string => `<!-- deploy-changelog:start head=${head} -->`
const isStartMarker = (line: string): boolean => /^<!-- deploy-changelog:start( head=[0-9a-f]+)? -->$/.test(line)
export const END_MARKER = '<!-- deploy-changelog:end -->'

export interface Section {
  service: string
  environment: string
  from: string
  to: string
  // A note shown under the title, e.g. for a rollback.
  note?: string
  // `omitted` releases are listed without their notes, to fit the description.
  releases: { tag: string; url: string; bullets: string[]; omitted?: boolean }[]
  history?: { label: string; url: string }
}

export function renderSection(section: Section): string {
  const lines = [`## ${section.service} ${section.from} → ${section.to} (${section.environment})`]
  if (section.note) {
    lines.push('', `_${section.note}_`)
  }
  if (section.releases.some((r) => r.omitted)) {
    lines.push('', '_The notes of the oldest releases are left out to fit the description: see their release pages._')
  }
  for (const release of section.releases) {
    lines.push('', `### [${release.tag}](${release.url})`)
    if (!release.omitted) {
      lines.push(...(release.bullets.length > 0 ? release.bullets : ['_No release notes._']))
    }
  }
  if (section.history) {
    lines.push('', `[${section.history.label}](${section.history.url})`)
  }
  return lines.join('\n')
}

export function renderBlock(sections: Section[], head: string): string | undefined {
  if (sections.length === 0) {
    return undefined
  }
  return [startMarker(head), sections.map(renderSection).join('\n\n'), END_MARKER].join('\n')
}

// Drops the leading and trailing blank lines only: the indentation of the first
// line, e.g. of an indented code block, is part of the author's text.
export function trimBlankLines(text: string): string {
  return text.replace(/^(?:[ \t]*\n)+/, '').trimEnd()
}

// Replaces the changelog block of a description, leaving the rest untouched.
// When an edit removed one of its markers, only the marker left is dropped, so
// the text around it survives.
export function mergeBody(body: string, block: string | undefined): string {
  const lines = body.replace(/\r/g, '').split('\n')
  const start = lines.findIndex(isStartMarker)
  const end = lines.indexOf(END_MARKER, start + 1)
  // Only the blank lines around the removed block are trimmed: the author's own text is kept as written.
  const text =
    start !== -1 && end !== -1
      ? [trimBlankLines(lines.slice(0, start).join('\n')), trimBlankLines(lines.slice(end + 1).join('\n'))]
          .filter(Boolean)
          .join('\n\n')
      : trimBlankLines(lines.filter((line) => !isStartMarker(line) && line !== END_MARKER).join('\n'))
  if (!block) {
    return text
  }
  return text ? `${text}\n\n${block}` : block
}

// GitHub refuses a pull request description longer than that.
export const MAX_BODY_LENGTH = 65536

// The description with the changelog of `sections`. When it is too long, the
// notes of the oldest releases are left out, one release at a time: their
// titles and the history link still cover the whole range.
export function mergeWithin(body: string, sections: Section[], head: string, maxLength = MAX_BODY_LENGTH): string {
  const fitted = sections.map((s) => ({ ...s, releases: s.releases.map((r) => ({ ...r })) }))
  // Oldest first: releases are listed newest first in each section.
  const oldestFirst = fitted.flatMap((s) => [...s.releases].reverse())
  let merged = mergeBody(body, renderBlock(fitted, head))
  for (const release of oldestFirst) {
    if (merged.length <= maxLength) {
      break
    }
    release.omitted = true
    merged = mergeBody(body, renderBlock(fitted, head))
  }
  return merged
}
