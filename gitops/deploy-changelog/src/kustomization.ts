import { parse } from 'yaml'

import { RELEASE_VERSION, SNAPSHOT } from './releases'

export interface Image {
  name: string
  // Last segment of `newName`, e.g. `shop-v2-worker` for `eu.gcr.io/happn-infra/happn/shop-v2-worker`.
  image: string
  tag: string
}

export interface ImageChange {
  image: string
  from: string
  to: string
}

interface KustomizationImage {
  name?: string
  newName?: string
  newTag?: string
}

export function parseImages(content: string | undefined): Image[] {
  if (!content) {
    return []
  }
  // Every scalar is read as written: an unquoted `newTag: 1.20` is version `1.20`, not the number 1.2.
  const images: KustomizationImage[] = parse(content, { schema: 'failsafe' })?.images ?? []
  return images
    .filter((i) => i.name && i.newTag)
    .map((i) => ({
      name: i.name as string,
      image: (i.newName || (i.name as string)).split('/').pop() as string,
      tag: i.newTag as string,
    }))
}

// Images whose tag the pull request changes, keyed by the image name of the
// kustomization: sidecars stay untouched, so they never show up. Moving from a
// snapshot back to a release deploys nothing new, so it is left out.
// `branchPoint` holds the tags the pull request started from: an image bumped on
// the base branch since then, but not by the pull request, is not deployed by it.
export function changedImages(base: Image[], head: Image[], branchPoint: Image[] = base): ImageChange[] {
  const deployed = new Map(base.map((i) => [i.name, i.tag]))
  const started = new Map(branchPoint.map((i) => [i.name, i.tag]))
  return head
    .filter((i) => {
      const from = deployed.get(i.name)
      if (from === undefined || from === i.tag || started.get(i.name) === i.tag) {
        return false
      }
      if (RELEASE_VERSION.test(i.tag)) {
        return RELEASE_VERSION.test(from)
      }
      return SNAPSHOT.test(i.tag)
    })
    .map((i) => ({ image: i.image, from: deployed.get(i.name) as string, to: i.tag }))
}

// The environment is the directory holding the kustomization: `apps/microservices/happn-charms/preprod/kustomization.yaml`.
export function environmentOf(file: string): string {
  const parts = file.split('/')
  return parts[parts.length - 2]
}

export const KUSTOMIZATION_FILE = /^apps\/.+\/kustomization\.ya?ml$/
