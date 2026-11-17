import { Section } from './body'
import { Backend, Gitops } from './github'
import { KUSTOMIZATION_FILE, changedImages, environmentOf, parseImages } from './kustomization'
import { RELEASE_VERSION, commitBullet, snapshotBranch } from './releases'

export interface Deployment {
  service: string
  environment: string
  from: string
  to: string
}

// The backend releases a pull request deploys. A service whose api and worker
// share a version shows up once.
export async function deployments(
  gitops: Gitops,
  backend: Backend,
  pullRequest: number,
  baseSha: string,
  headSha: string,
  log: (message: string) => void,
): Promise<Deployment[]> {
  const files = (await gitops.changedFiles(pullRequest)).filter((f) => KUSTOMIZATION_FILE.test(f))
  if (files.length === 0) {
    return []
  }
  const mergeBase = await gitops.mergeBase(baseSha, headSha)
  const perFile = await Promise.all(
    files.map(async (file) => {
      const [base, head, branchPoint] = await Promise.all([
        gitops.fileAt(baseSha, file),
        gitops.fileAt(headSha, file),
        mergeBase === baseSha ? undefined : gitops.fileAt(mergeBase, file),
      ])
      const baseImages = parseImages(base)
      const startImages = mergeBase === baseSha ? baseImages : parseImages(branchPoint)
      const changes = changedImages(baseImages, parseImages(head), startImages)
      const services = await Promise.all(changes.map((change) => backend.serviceOf(change.image, change.to)))
      return changes.flatMap((change, i) => {
        const service = services[i]
        if (!service) {
          log(`No ${backend.repository.repo} tag for image ${change.image} ${change.to}, ignored.`)
          return []
        }
        return [{ service, environment: environmentOf(file), from: change.from, to: change.to }]
      })
    }),
  )
  const found = new Map<string, Deployment>()
  for (const deployment of perFile.flat()) {
    found.set(JSON.stringify(deployment), deployment)
  }
  return [...found.values()]
}

// A release links to its release, a snapshot to the pull request of its branch.
async function releaseUrl(backend: Backend, toTag: string, to: string): Promise<string> {
  if (RELEASE_VERSION.test(to)) {
    return `${backend.url}/releases/tag/${toTag}`
  }
  return (await backend.pullRequestOf(snapshotBranch(to))) ?? `${backend.url}/tree/${toTag}`
}

// The commits of the service the new version holds and the deployed one does
// not, read from the tags: they exist as soon as the version is tagged, before
// its release is published. The same goes for a release, a snapshot, or going
// back to an older version, which adds nothing.
export async function section(backend: Backend, deployment: Deployment): Promise<Section> {
  const { service, from, to } = deployment
  const fromTag = `${service}-${from}`
  const toTag = `${service}-${to}`
  const path = `services/${service}`
  // Both histories are read from where they part, so they stay short.
  const since = await backend.mergeBaseDate(fromTag, toTag)
  if (since === undefined) {
    // The deployed version has no tag, e.g. it predates the service's own tags:
    // its changes cannot be listed, but the other services still are.
    const url = await releaseUrl(backend, toTag, to)
    return {
      ...deployment,
      note: `${fromTag} has no tag, the changes cannot be listed.`,
      releases: [{ tag: toTag, url, bullets: [] }],
    }
  }
  const [added, deployed, url] = await Promise.all([
    backend.serviceCommits(toTag, path, since),
    backend.serviceCommits(fromTag, path, since),
    releaseUrl(backend, toTag, to),
  ])
  const addedShas = new Set(added.map((c) => c.sha))
  const shipped = new Set(deployed.map((c) => c.sha))
  const bullets = added.filter((c) => !shipped.has(c.sha)).map((c) => commitBullet(c.subject, backend.url))
  // Going back to an older version adds nothing but drops commits: say so, as the
  // announcement only shows the new version.
  const rollback = deployed.some((c) => !addedShas.has(c.sha))
  const note =
    bullets.length > 0
      ? undefined
      : rollback
        ? `Rollback: ${toTag} drops changes of ${fromTag}, nothing new is deployed.`
        : `Nothing new compared with ${fromTag}.`
  return { ...deployment, note, releases: [{ tag: toTag, url, bullets }] }
}
