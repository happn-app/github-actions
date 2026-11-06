import { Section } from './body'
import { Backend, Gitops } from './github'
import { KUSTOMIZATION_FILE, changedImages, environmentOf, parseImages } from './kustomization'
import { RELEASE_VERSION, commitBullet, releaseBullets, releaseRange, snapshotBranch } from './releases'

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

// A snapshot has no release notes: it lists the commits of the service it adds
// to what is deployed, and links the pull request it was built from.
async function snapshotSection(backend: Backend, deployment: Deployment): Promise<Section> {
  const { service, from, to } = deployment
  const fromTag = `${service}-${from}`
  const toTag = `${service}-${to}`
  const path = `services/${service}`
  // Both histories are read from the deployed version on, so they stay short.
  const since = await backend.commitDate(fromTag)
  const [added, deployed, pullRequest] = await Promise.all([
    backend.serviceCommits(toTag, path, since),
    backend.serviceCommits(fromTag, path, since),
    backend.pullRequestOf(snapshotBranch(to)),
  ])
  const shipped = new Set(deployed.map((c) => c.sha))
  return {
    ...deployment,
    releases: [
      {
        tag: toTag,
        url: pullRequest ?? `${backend.url}/tree/${toTag}`,
        bullets: added.filter((c) => !shipped.has(c.sha)).map((c) => commitBullet(c.subject, backend.url)),
      },
    ],
  }
}

export async function section(backend: Backend, deployment: Deployment): Promise<Section> {
  const { service, from, to } = deployment
  if (!RELEASE_VERSION.test(to)) {
    return snapshotSection(backend, deployment)
  }
  const toTag = `${service}-${to}`
  const result: Section = { ...deployment, releases: [] }
  const releases = await backend.releasesOf(service)

  // Going from a snapshot to a release deploys the releases after the one the
  // snapshot was built on: the newest release, up to `to`, it contains.
  let fromTag = `${service}-${from}`
  if (!RELEASE_VERSION.test(from)) {
    const base = await backend.firstContained(releases.slice(releases.indexOf(toTag)), fromTag)
    if (base === toTag) {
      return { ...result, note: `${toTag} is already part of the snapshot, nothing new is deployed.` }
    }
    fromTag = base ?? fromTag
  }

  const range = releaseRange(releases, fromTag, toTag)
  if (!range) {
    return { ...result, note: `Rollback: ${toTag} is older than ${fromTag}, nothing new is deployed.` }
  }

  const bodies = await Promise.all(range.map((tag) => backend.releaseBody(tag)))
  // The CI publishes the release once the image is built: a pull request opened
  // right after the tag is pushed comes before it.
  if (bodies[0] === undefined) {
    return { ...result, note: `The release notes of ${toTag} are not published yet.` }
  }
  result.releases = range.map((tag, i) => ({
    tag,
    url: `${backend.url}/releases/tag/${tag}`,
    bullets: releaseBullets(bodies[i] ?? ''),
  }))
  return result
}
