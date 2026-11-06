import { describe, expect, it } from 'vitest'

import { changedImages, environmentOf, parseImages } from '../src/kustomization'

const kustomization = (shopTag: string, sidecarTag = '0.28') => `
resources:
  - ../base
images:
  - name: happn-shop-v2-worker
    newName: eu.gcr.io/happn-infra/happn/shop-v2-worker
    newTag: '${shopTag}'
  - name: happn-shop-v2-api
    newName: eu.gcr.io/happn-infra/happn/shop-v2-api
    newTag: "${shopTag}"
  - name: statsd-exporter
    newTag: v${sidecarTag}
`

describe('parseImages', () => {
  it('reads the image name from newName and the tag as a string', () => {
    expect(parseImages('images:\n  - name: happn-charms\n    newName: eu.gcr.io/happn/charms\n    newTag: 1.20\n')).toEqual([
      { name: 'happn-charms', image: 'charms', tag: '1.20' },
    ])
    expect(parseImages(kustomization('1.75'))[0]).toEqual({
      name: 'happn-shop-v2-worker',
      image: 'shop-v2-worker',
      tag: '1.75',
    })
  })

  it('has no image for a missing file or a file without images', () => {
    expect(parseImages(undefined)).toEqual([])
    expect(parseImages('resources: []\n')).toEqual([])
  })
})

describe('changedImages', () => {
  it('keeps the images whose tag moves to a release version', () => {
    expect(changedImages(parseImages(kustomization('1.75')), parseImages(kustomization('1.76', '0.29')))).toEqual([
      { image: 'shop-v2-worker', from: '1.75', to: '1.76' },
      { image: 'shop-v2-api', from: '1.75', to: '1.76' },
    ])
  })

  it('ignores the images bumped on the base branch after the pull request branched', () => {
    const branchPoint = parseImages(kustomization('1.75', '0.28'))
    const base = parseImages(kustomization('1.76', '0.28'))
    const head = parseImages(kustomization('1.75', '0.29'))
    expect(changedImages(base, head, branchPoint)).toEqual([])
    expect(changedImages(base, parseImages(kustomization('1.77')), branchPoint)).toEqual([
      { image: 'shop-v2-worker', from: '1.76', to: '1.77' },
      { image: 'shop-v2-api', from: '1.76', to: '1.77' },
    ])
  })

  it('keeps a snapshot deployed over a release, to show what it adds', () => {
    const snapshot = 'feat-x-1793711562-SNAPSHOT'
    expect(changedImages(parseImages(kustomization('1.75')), parseImages(kustomization(snapshot)))).toEqual([
      { image: 'shop-v2-worker', from: '1.75', to: snapshot },
      { image: 'shop-v2-api', from: '1.75', to: snapshot },
    ])
  })

  it('ignores going back from a snapshot to a release, unchanged tags and new images', () => {
    const base = parseImages(kustomization('1.75'))
    expect(changedImages(parseImages(kustomization('feat-x-1793711562-SNAPSHOT')), base)).toEqual([])
    expect(changedImages(base, base)).toEqual([])
    expect(changedImages([], base)).toEqual([])
  })
})

describe('environmentOf', () => {
  it('is the directory holding the kustomization', () => {
    expect(environmentOf('apps/microservices/happn-charms/preprod/kustomization.yaml')).toBe('preprod')
  })
})
