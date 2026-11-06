// `shop-v2-worker` → `shop-v2-worker`, `shop-v2`, `shop`: the backend tag prefix is
// the longest of these for which `<prefix>-<version>` exists.
export function serviceCandidates(image: string): string[] {
  const parts = image.split('-')
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('-'))
}

export type ReleaseRange =
  | { kind: 'unpublished' }
  | { kind: 'rollback' }
  // `from` is not a release tag (a snapshot): only `to` is listed.
  | { kind: 'partial'; tags: string[] }
  | { kind: 'complete'; tags: string[] }

// `releases` is the list of the service's release tags, newest version first. The range
// goes from `to` down to, but excluding, `from`.
export function releaseRange(releases: string[], fromTag: string, toTag: string): ReleaseRange {
  const to = releases.indexOf(toTag)
  const from = releases.indexOf(fromTag)
  if (to === -1) {
    return { kind: 'unpublished' }
  }
  if (from === -1) {
    return { kind: 'partial', tags: [toTag] }
  }
  if (from < to) {
    return { kind: 'rollback' }
  }
  return { kind: 'complete', tags: releases.slice(to, from) }
}

// Release versions only (`1.206`): snapshots and third-party tags have no backend release.
export const RELEASE_VERSION = /^[0-9]+(\.[0-9]+)+$/
// Snapshots built from a branch, e.g. `feat-shop-v2-metrics-logs-1793711562-SNAPSHOT`.
export const SNAPSHOT = /-SNAPSHOT$/

// The branch a snapshot was built from: `feat-shop-v2-metrics-logs-1793711562-SNAPSHOT` → `feat-shop-v2-metrics-logs`.
export function snapshotBranch(snapshot: string): string {
  return snapshot.replace(/-[0-9]+-SNAPSHOT$/, '')
}

// Release tags, newest version first: `charms-1.10` comes after `charms-1.9`.
export function sortByVersion(tags: string[]): string[] {
  const version = (tag: string) => (tag.match(/[0-9]+(\.[0-9]+)+$/)?.[0] ?? '').split('.').map(Number)
  return [...tags].sort((a, b) => {
    const [va, vb] = [version(a), version(b)]
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const diff = (vb[i] ?? 0) - (va[i] ?? 0)
      if (diff !== 0) {
        return diff
      }
    }
    return 0
  })
}

export function isReleaseOf(service: string, tag: string): boolean {
  return tag.startsWith(`${service}-`) && RELEASE_VERSION.test(tag.slice(service.length + 1))
}

const HISTORY_LINK = /^\[.* commits since .*\]\(.*\?since=([0-9]{4}-[0-9]{2}-[0-9]{2})\)$/
const COMPARE_LINK = /^\[Compare .* and .*\]\(/
const LINK_LINE = /^\[(Compare .* and .*|.* commits since .*|.* history)\]\(/

// Where the history of a release starts, as backend/release computes it:
// - a day, from its history link;
// - `none` when it has no link, as it holds no commit of the service;
// - undefined when it predates the history links and carries a compare link.
export function releaseSince(body: string): string | 'none' | undefined {
  const lines = body.split('\n').map((line) => line.trim())
  for (const line of lines) {
    const match = HISTORY_LINK.exec(line)
    if (match) {
      return match[1]
    }
  }
  return lines.some((line) => COMPARE_LINK.test(line)) ? undefined : 'none'
}

// The changes of a release, as written by backend/release. Its link line is
// dropped, as each section ends with one link covering the whole range.
export function releaseBullets(body: string): string[] {
  return body
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0 && !LINK_LINE.test(line))
    .map((line) => line.replace(/^-️\s*/, '- '))
}

// A commit subject written as backend/release writes its notes: tickets link to
// JIRA and pull request numbers to the pull request.
export function commitBullet(subject: string, repositoryUrl: string): string {
  const text = subject
    .replace('[happn-ci-skip]', '')
    .trim()
    .replace(/([A-Z]+-[0-9]+(?![0-9-]))/g, '[$1](https://happnapp.atlassian.net/browse/$1)')
    .replace(/#([0-9]+)/g, `[#$1](${repositoryUrl}/pull/$1)`)
  return `- ${text}`
}

export function earliest(days: string[]): string {
  return days.reduce((a, b) => (a < b ? a : b))
}
