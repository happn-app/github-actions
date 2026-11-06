import { describe, expect, it } from 'vitest'

import {
  commitBullet,
  isReleaseOf,
  releaseBullets,
  releaseRange,
  serviceCandidates,
  snapshotBranch,
  sortByVersion,
} from '../src/releases'

describe('serviceCandidates', () => {
  it('trims the image name one segment at a time', () => {
    expect(serviceCandidates('shop-v2-worker')).toEqual(['shop-v2-worker', 'shop-v2', 'shop'])
    expect(serviceCandidates('charms')).toEqual(['charms'])
  })
})

describe('sortByVersion', () => {
  it('orders by version, not as text, newest first', () => {
    expect(sortByVersion(['charms-1.9', 'charms-1.10', 'charms-1.10.1', 'charms-2.0'])).toEqual([
      'charms-2.0',
      'charms-1.10.1',
      'charms-1.10',
      'charms-1.9',
    ])
  })
})

describe('isReleaseOf', () => {
  it('matches the release tags of the service only', () => {
    expect(isReleaseOf('users', 'users-1.495')).toBe(true)
    expect(isReleaseOf('users', 'users-traits-1.12')).toBe(false)
    expect(isReleaseOf('users', 'users-feat-x-SNAPSHOT')).toBe(false)
  })
})

describe('releaseRange', () => {
  const releases = ['charms-1.207', 'charms-1.206', 'charms-1.205', 'charms-1.204']

  it('lists the releases after from, up to to, newest first', () => {
    expect(releaseRange(releases, 'charms-1.204', 'charms-1.206')).toEqual(['charms-1.206', 'charms-1.205'])
  })

  it('is undefined for a rollback', () => {
    expect(releaseRange(releases, 'charms-1.206', 'charms-1.205')).toBeUndefined()
  })

  it('lists only to when from has no tag', () => {
    expect(releaseRange(releases, 'charms-1.100', 'charms-1.206')).toEqual(['charms-1.206'])
  })
})

const body = [
  '-️ fix(charms): use jakarta PreDestroy instead of javax ([#679](https://github.com/happn-app/backend/pull/679))',
  '',
  '[services/charms commits since charms-1.205](https://github.com/happn-app/backend/commits/charms-1.206/services/charms?since=2026-10-12)',
].join('\r\n')

describe('releaseBullets', () => {
  it('keeps the changes and drops the link line', () => {
    expect(releaseBullets(body)).toEqual([
      '- fix(charms): use jakarta PreDestroy instead of javax ([#679](https://github.com/happn-app/backend/pull/679))',
    ])
    expect(releaseBullets('-️ a\n[Compare charms-1.204 and charms-1.205](https://github.com/x)')).toEqual(['- a'])
  })
})

describe('snapshotBranch', () => {
  it('drops the build timestamp and the suffix', () => {
    expect(snapshotBranch('feat-shop-v2-metrics-logs-1793711562-SNAPSHOT')).toBe('feat-shop-v2-metrics-logs')
  })
})

describe('commitBullet', () => {
  it('links the ticket to JIRA and the number to the pull request', () => {
    expect(commitBullet('[BCK-1938] Appeler orders v3 avec le client généré (#823)', 'https://github.com/happn-app/backend')).toBe(
      '- [[BCK-1938](https://happnapp.atlassian.net/browse/BCK-1938)] Appeler orders v3 avec le client généré ([#823](https://github.com/happn-app/backend/pull/823))',
    )
    expect(commitBullet('fix(shop-v2): adapt to mockserver 9.2.0 [happn-ci-skip]', 'https://x')).toBe(
      '- fix(shop-v2): adapt to mockserver 9.2.0',
    )
  })
})

