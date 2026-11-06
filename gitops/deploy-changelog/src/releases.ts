// `shop-v2-worker` → `shop-v2-worker`, `shop-v2`, `shop`: the backend tag prefix is
// the longest of these for which `<prefix>-<version>` exists.
export function serviceCandidates(image: string): string[] {
  const parts = image.split('-')
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('-'))
}

// The release tags deployed, from `to` down to, but excluding, `from`, newest
// first; undefined for a rollback. `releases` is the list of the service's release
// tags, newest version first, which holds `to`: its tag was found to resolve the service.
export function releaseRange(releases: string[], fromTag: string, toTag: string): string[] | undefined {
  const to = releases.indexOf(toTag)
  const from = releases.indexOf(fromTag)
  if (from === -1) {
    return [toTag]
  }
  return from > to ? releases.slice(to, from) : undefined
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

// The link closing the notes of a release, to a compare or to the service history.
const LINK_LINE = /^\[(Compare .* and .*|.* commits since .*|.* history)\]\(/

// The changes of a release, as written by backend/release, without its link
// line: the title of the release already links to its page.
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
