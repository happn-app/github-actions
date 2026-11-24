import { describe, expect, it } from 'vitest'

import { changelogOf, message, toMrkdwn } from '../src/slack'

const body = [
  'Deploys the fix.',
  '',
  '<!-- deploy-changelog:start head=e65cd4b9b78ca281a090e129b50b1dd38572b5b3 -->',
  '## shop-v2 1.74 → 1.76 (preprod)',
  '',
  '### [shop-v2-1.76](https://github.com/happn-app/backend/releases/tag/shop-v2-1.76)',
  '- [[BCK-1938](https://happnapp.atlassian.net/browse/BCK-1938)] Appeler orders v3 avec le client généré ([#823](https://github.com/happn-app/backend/pull/823))',
  '- fix(shop-v2): adapt to mockserver 9.2.0',
  '',
  '## spots 1.160 → 1.161 (prod)',
  '',
  '### [spots-1.161](https://github.com/happn-app/backend/releases/tag/spots-1.161)',
  '- build(spots): drop unused mockserver test dependencies',
  '<!-- deploy-changelog:end -->',
].join('\r\n')

describe('changelogOf', () => {
  it('reads the commit the changelog was computed for', () => {
    expect(changelogOf(body).head).toBe('e65cd4b9b78ca281a090e129b50b1dd38572b5b3')
    expect(
      changelogOf('<!-- deploy-changelog:start -->\n## a 1 → 2 (prod)\n<!-- deploy-changelog:end -->').head,
    ).toBeUndefined()
  })

  it('groups the sections of the block by environment', () => {
    const sections = changelogOf(body).sections
    expect([...sections.keys()]).toEqual(['preprod', 'prod'])
    expect(sections.get('prod')).toEqual([
      {
        service: 'spots',
        lines: [
          '',
          '### [spots-1.161](https://github.com/happn-app/backend/releases/tag/spots-1.161)',
          '- build(spots): drop unused mockserver test dependencies',
        ],
      },
    ])
  })

  it('finds nothing without a complete block', () => {
    expect(changelogOf('Deploys the fix.').sections.size).toBe(0)
    expect(changelogOf('<!-- deploy-changelog:start -->\n## charms 1 → 2 (prod)').sections.size).toBe(0)
  })
})

describe('toMrkdwn', () => {
  it('puts the links on their text, keeps the ticket brackets and escapes control characters', () => {
    expect(toMrkdwn('- [[BCK-1927](https://jira/BCK-1927)] Fix Map<String, X> & co ([#679](https://pr/679))')).toBe(
      '• [<https://jira/BCK-1927|BCK-1927>] Fix Map&lt;String, X&gt; &amp; co (<https://pr/679|#679>)',
    )
  })
})

describe('message', () => {
  const deployer = { login: 'EtiPlas', pullRequestUrl: 'https://github.com/happn-app/gitops/pull/6428', pullRequest: 6428 }
  const deployedBy = 'deployed by EtiPlas (<https://github.com/happn-app/gitops/pull/6428|gitops#6428>)'

  it('titles each service with its version and who deployed it, then lists its changes', () => {
    expect(message(changelogOf(body).sections.get('preprod') ?? [], deployer)).toBe(
      [
        `*shop-v2 <https://github.com/happn-app/backend/releases/tag/shop-v2-1.76|1.76>* ${deployedBy}`,
        '• [<https://happnapp.atlassian.net/browse/BCK-1938|BCK-1938>] Appeler orders v3 avec le client généré (<https://github.com/happn-app/backend/pull/823|#823>)',
        '• fix(shop-v2): adapt to mockserver 9.2.0',
      ].join('\n'),
    )
  })

  it('announces each release of the range, newest first', () => {
    const range = changelogOf(
      [
        '<!-- deploy-changelog:start head=abc -->',
        '## users-traits 1.112 → 1.114 (preprod)',
        '',
        '### [users-traits-1.114](https://r/users-traits-1.114)',
        '- feat: b',
        '',
        '### [users-traits-1.113](https://r/users-traits-1.113)',
        '- fix: a',
        '<!-- deploy-changelog:end -->',
      ].join('\n'),
    ).sections.get('preprod')
    expect(message(range ?? [], deployer)).toBe(
      [
        `*users-traits <https://r/users-traits-1.114|1.114>* ${deployedBy}`,
        '• feat: b',
        '',
        '*users-traits <https://r/users-traits-1.113|1.113>*',
        '• fix: a',
      ].join('\n'),
    )
  })

  it('keeps the note of a deployment that adds nothing', () => {
    const rollback = changelogOf(
      [
        '<!-- deploy-changelog:start head=abc -->',
        '## charms 1.206 → 1.205 (prod)',
        '',
        '_Nothing new compared with charms-1.206._',
        '',
        '### [charms-1.205](https://github.com/happn-app/backend/releases/tag/charms-1.205)',
        '<!-- deploy-changelog:end -->',
      ].join('\n'),
    ).sections.get('prod')
    expect(message(rollback ?? [], deployer)).toBe(
      `*charms <https://github.com/happn-app/backend/releases/tag/charms-1.205|1.205>* ${deployedBy}\n_Nothing new compared with charms-1.206._`,
    )
  })
})
