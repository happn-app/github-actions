// `shop-v2-worker` → `shop-v2-worker`, `shop-v2`, `shop`: the backend tag prefix is
// the longest of these for which `<prefix>-<version>` exists.
export function serviceCandidates(image: string): string[] {
  const parts = image.split('-')
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('-'))
}

// Release versions only (`1.206`): snapshots and third-party tags have no backend release.
export const RELEASE_VERSION = /^[0-9]+(\.[0-9]+)+$/
// Snapshots built from a branch, e.g. `feat-shop-v2-metrics-logs-1793711562-SNAPSHOT`.
export const SNAPSHOT = /-SNAPSHOT$/

const versionParts = (version: string): number[] => version.split('.').map(Number)

// Compares two release versions as numbers: `1.10` comes after `1.9`.
export function compareVersions(a: string, b: string): number {
  const [pa, pb] = [versionParts(a), versionParts(b)]
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

// The release tags of a service strictly between two release versions, oldest first:
// `users-traits-1.113` between `1.112` and `1.114`.
export function releasesBetween(tags: string[], service: string, from: string, to: string): string[] {
  return tags
    .filter((tag) => tag.startsWith(`${service}-`))
    .map((tag) => tag.slice(service.length + 1))
    .filter((version) => RELEASE_VERSION.test(version))
    .filter((version) => compareVersions(version, from) > 0 && compareVersions(version, to) < 0)
    .sort(compareVersions)
    .map((version) => `${service}-${version}`)
}

// The branch a snapshot was built from: `feat-shop-v2-metrics-logs-1793711562-SNAPSHOT` → `feat-shop-v2-metrics-logs`.
export function snapshotBranch(snapshot: string): string {
  return snapshot.replace(/-[0-9]+-SNAPSHOT$/, '')
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
