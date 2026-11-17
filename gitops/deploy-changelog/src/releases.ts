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
