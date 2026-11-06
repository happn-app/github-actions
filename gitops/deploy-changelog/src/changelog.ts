import { Section } from './body'
import { Backend, Gitops } from './github'
import { KUSTOMIZATION_FILE, changedImages, environmentOf, parseImages } from './kustomization'
import {
  RELEASE_VERSION,
  commitBullet,
  snapshotBranch,
  earliest,
  releaseBullets,
  releaseRange,
  releaseSince,
} from './releases'

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
  const [added, deployed, pullRequest] = await Promise.all([
    backend.serviceCommits(toTag, path),
    backend.serviceCommits(fromTag, path),
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
  const fromTag = `${service}-${from}`
  const toTag = `${service}-${to}`
  const result: Section = { ...deployment, releases: [] }

  const range = releaseRange(await backend.releasesOf(service), fromTag, toTag)
  if (range.kind === 'unpublished') {
    return { ...result, note: `${toTag} is not a release tag.` }
  }
  if (range.kind === 'rollback') {
    return { ...result, note: `Rollback: ${toTag} is older than ${fromTag}, nothing new is deployed.` }
  }

  const bodies = await Promise.all(range.tags.map((tag) => backend.releaseBody(tag)))
  // The CI publishes the release once the image is built: a pull request opened
  // right after the tag is pushed comes before it.
  if (bodies[0] === undefined) {
    return { ...result, note: `The release notes of ${toTag} are not published yet.` }
  }
  if (range.kind === 'partial') {
    result.note = `${fromTag} is not a release, only the changes of ${toTag} are listed.`
  }
  result.releases = range.tags.map((tag, i) => ({
    tag,
    url: `${backend.url}/releases/tag/${tag}`,
    bullets: releaseBullets(bodies[i] ?? ''),
  }))
  if (range.kind === 'partial') {
    return result
  }

  // The range's history starts at the earliest start of its releases. Releases
  // without any commit of the service have no start. A release published before
  // backend/release linked the service history, or a tag without release, leaves
  // the start unknown: the range then gets no link, as does a range without start.
  const starts = bodies.map((body) => (body === undefined ? undefined : releaseSince(body)))
  const days = starts.filter((s): s is string => s !== undefined && s !== 'none')
  if (starts.includes(undefined) || days.length === 0) {
    return result
  }
  const since = earliest(days)
  result.history = {
    label: `${service} commits since ${fromTag}`,
    url: `${backend.url}/commits/${toTag}/services/${service}?since=${since}`,
  }
  return result
}
