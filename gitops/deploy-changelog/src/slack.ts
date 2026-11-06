import { END_MARKER, START_MARKER } from './body'

// `## charms 1.205 → 1.206 (preprod)`
const SECTION_TITLE = /^## (\S+) .+ \(([^)]+)\)$/
// `### [charms-1.206](https://github.com/happn-app/backend/releases/tag/charms-1.206)`
const RELEASE_TITLE = /^### \[([^\]]+)\]\(([^)]+)\)$/

// A section of the changelog block, as written in the pull request description.
export interface WrittenSection {
  service: string
  lines: string[]
}

export interface Changelog {
  // The commit the changelog was computed for.
  head?: string
  sections: Map<string, WrittenSection[]>
}

// The sections of the changelog block of a description, grouped by environment, in order.
export function changelogOf(body: string): Changelog {
  const lines = body.replace(/\r/g, '').split('\n')
  const start = lines.findIndex((line) => START_MARKER.test(line))
  const end = lines.indexOf(END_MARKER, start + 1)
  const sections = new Map<string, WrittenSection[]>()
  if (start === -1 || end === -1) {
    return { sections }
  }
  const head = START_MARKER.exec(lines[start])?.[1]
  let current: WrittenSection | undefined
  for (const line of lines.slice(start + 1, end)) {
    const title = SECTION_TITLE.exec(line)
    if (title) {
      current = { service: title[1], lines: [] }
      sections.set(title[2], [...(sections.get(title[2]) ?? []), current])
    } else {
      current?.lines.push(line)
    }
  }
  return { head, sections }
}

// Slack reads `&`, `<` and `>` as control characters.
const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Markdown links become Slack links. The innermost links are converted, so a
// ticket written `[[BCK-1938](url)]` keeps its brackets, as in the release message.
export function toMrkdwn(line: string): string {
  const text = escape(line).replace(/\[([^[\]]+)\]\(([^)]+)\)/g, '<$2|$1>')
  return text.startsWith('- ') ? `• ${text.slice(2)}` : text
}

// One block per release, as backend/release announces it: the service and the
// version in bold, the version linking to the release, then its changes.
function releases(section: WrittenSection): string[] {
  const blocks: string[][] = []
  for (const line of section.lines) {
    const release = RELEASE_TITLE.exec(line)
    if (release) {
      const version = release[1].startsWith(`${section.service}-`)
        ? release[1].slice(section.service.length + 1)
        : release[1]
      blocks.push([`*${escape(section.service)} <${release[2]}|${escape(version)}>*`])
    } else if (line.trim()) {
      // A note before the first release, e.g. a rollback, has a block of its own.
      if (blocks.length === 0) {
        blocks.push([`*${escape(section.service)}*`])
      }
      blocks[blocks.length - 1].push(toMrkdwn(line))
    }
  }
  return blocks.map((block) => block.join('\n'))
}

export function message(sections: WrittenSection[]): string {
  return sections.flatMap(releases).join('\n\n')
}
