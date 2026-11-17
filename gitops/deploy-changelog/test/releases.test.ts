import { describe, expect, it } from 'vitest'

import { commitBullet, serviceCandidates, snapshotBranch } from '../src/releases'

describe('serviceCandidates', () => {
  it('trims the image name one segment at a time', () => {
    expect(serviceCandidates('shop-v2-worker')).toEqual(['shop-v2-worker', 'shop-v2', 'shop'])
    expect(serviceCandidates('charms')).toEqual(['charms'])
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
