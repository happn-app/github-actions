import { describe, expect, it } from 'vitest'

import { section } from '../src/changelog'
import { Backend } from '../src/github'

type Commit = { sha: string; subject: string }

function backend(histories: Record<string, Commit[]>, tagged = true): Backend {
  return {
    url: 'https://github.com/happn-app/backend',
    mergeBaseDate: async () => (tagged ? '2026-10-01T00:00:00Z' : undefined),
    serviceCommits: async (ref: string) => histories[ref] ?? [],
    pullRequestOf: async () => undefined,
  } as unknown as Backend
}

const a = { sha: 'a', subject: 'fix(charms): a (#1)' }
const b = { sha: 'b', subject: 'feat(charms): b' }

describe('section', () => {
  it('lists the commits the new version adds', async () => {
    const result = await section(backend({ 'charms-1.206': [b, a], 'charms-1.205': [a] }), {
      service: 'charms',
      environment: 'preprod',
      from: '1.205',
      to: '1.206',
    })
    expect(result.note).toBeUndefined()
    expect(result.releases).toEqual([
      {
        tag: 'charms-1.206',
        url: 'https://github.com/happn-app/backend/releases/tag/charms-1.206',
        bullets: ['- feat(charms): b'],
      },
    ])
  })

  it('flags a rollback', async () => {
    const result = await section(backend({ 'charms-1.206': [b, a], 'charms-1.205': [a] }), {
      service: 'charms',
      environment: 'prod',
      from: '1.206',
      to: '1.205',
    })
    expect(result.note).toBe('Rollback: charms-1.205 drops changes of charms-1.206, nothing new is deployed.')
    expect(result.releases[0].bullets).toEqual([])
  })

  it('notes a deployed version without tag instead of failing', async () => {
    const result = await section(backend({}, false), {
      service: 'charms',
      environment: 'prod',
      from: '1.100',
      to: '1.206',
    })
    expect(result.note).toBe('charms-1.100 has no tag, the changes cannot be listed.')
    expect(result.releases[0].bullets).toEqual([])
  })
})
