import { describe, expect, it } from 'vitest'

import { END_MARKER, mergeBody, mergeWithin, renderBlock, startMarker } from '../src/body'

const HEAD = 'e65cd4b9b78ca281a090e129b50b1dd38572b5b3'
const START_MARKER = startMarker(HEAD)

describe('mergeWithin', () => {
  const release = (tag: string) => ({ tag, url: `https://r/${tag}`, bullets: [`- ${'x'.repeat(80)}`] })
  const long = {
    service: 'charms',
    environment: 'prod',
    from: '1.200',
    to: '1.203',
    releases: [release('charms-1.203'), release('charms-1.202'), release('charms-1.201')],
  }

  it('keeps every note when the description fits', () => {
    expect(mergeWithin('', [long], HEAD)).toBe(mergeBody('', renderBlock([long], HEAD)))
  })

  it('leaves out the notes of the oldest releases first to fit the description', () => {
    const full = mergeBody('', renderBlock([long], HEAD))
    const merged = mergeWithin('', [long], HEAD, full.length - 50)
    expect(merged.length).toBeLessThanOrEqual(full.length - 50)
    expect(merged).toContain('_The notes of the oldest releases are left out')
    expect(merged).toContain(`### [charms-1.201](https://r/charms-1.201)\n${END_MARKER}`)
    expect(merged).toContain(`### [charms-1.203](https://r/charms-1.203)\n- ${'x'.repeat(80)}`)
  })
})

const section = {
  service: 'charms',
  environment: 'preprod',
  from: '1.205',
  to: '1.206',
  releases: [{ tag: 'charms-1.206', url: 'https://r/charms-1.206', bullets: ['- fix: a'] }],
  history: { label: 'charms commits since charms-1.205', url: 'https://h' },
}

describe('renderBlock', () => {
  it('renders one section per deployment between the markers, naming the commit', () => {
    expect(renderBlock([section], HEAD)).toBe(
      [
        `<!-- deploy-changelog:start head=${HEAD} -->`,
        '## charms 1.205 → 1.206 (preprod)',
        '',
        '### [charms-1.206](https://r/charms-1.206)',
        '- fix: a',
        '',
        '[charms commits since charms-1.205](https://h)',
        END_MARKER,
      ].join('\n'),
    )
  })

  it('renders nothing without deployment', () => {
    expect(renderBlock([], HEAD)).toBeUndefined()
  })
})

describe('mergeBody', () => {
  const block = `${START_MARKER}\nnew\n${END_MARKER}`

  it('appends the block after the text of the author', () => {
    expect(mergeBody('Deploys the fix.', block)).toBe(`Deploys the fix.\n\n${block}`)
    expect(mergeBody('', block)).toBe(block)
  })

  it('replaces the previous block, computed for another commit, and keeps the text around it', () => {
    const body = `Before.\r\n\r\n${startMarker('0123abc')}\r\nold\r\n${END_MARKER}\r\n\r\nAfter.`
    expect(mergeBody(body, block)).toBe(`Before.\n\nAfter.\n\n${block}`)
  })

  it('keeps the blank lines of the author', () => {
    const text = 'Before.\n\n\n```\na\n\n\nb\n```'
    expect(mergeBody(`${text}\n\n${START_MARKER}\nold\n${END_MARKER}`, block)).toBe(`${text}\n\n${block}`)
  })

  it('keeps the indentation of the first line of the author', () => {
    const text = '    indented code'
    expect(mergeBody(`\n${text}\n\n${START_MARKER}\nold\n${END_MARKER}`, block)).toBe(`${text}\n\n${block}`)
  })

  it('removes the block when nothing is deployed anymore', () => {
    expect(mergeBody(`Text.\n\n${START_MARKER}\nold\n${END_MARKER}`, undefined)).toBe('Text.')
  })

  it('keeps the text when an edit removed a marker', () => {
    expect(mergeBody(`${START_MARKER}\nold\nText the author kept.`, block)).toBe(
      `old\nText the author kept.\n\n${block}`,
    )
  })
})
