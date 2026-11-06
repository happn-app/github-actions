import * as core from '@actions/core'

import { changelogOf, message } from './slack'

const SLACK_TIMEOUT_MS = 30_000

async function post(token: string, channel: string, text: string): Promise<void> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel, text, unfurl_links: false, unfurl_media: false }),
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
  })
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) {
    throw new Error(`Slack refused the message: ${result.error}`)
  }
}

// Posts the changelog of a merged pull request to the channel of each environment it deploys to.
export async function announce(body: string, mergedHead: string): Promise<void> {
  const { head, sections } = changelogOf(body)
  if (sections.size === 0) {
    core.info('No deploy changelog in the pull request description, nothing to post.')
    return
  }
  // A run that failed on the last push leaves the changelog of an earlier
  // commit, which may announce other versions than the merged ones.
  if (head !== mergedHead) {
    core.warning(
      `The deploy changelog was computed for ${head ?? 'an unknown commit'}, not for the merged ${mergedHead}: nothing posted.`,
    )
    return
  }

  const channels = new Map([
    ['preprod', core.getInput('preprod_channel')],
    ['prod', core.getInput('prod_channel')],
  ])
  const token = core.getInput('slack_token', { required: true })
  for (const [environment, environmentSections] of sections) {
    const channel = channels.get(environment)
    if (!channel) {
      core.info(`No channel configured for ${environment}, skipped.`)
      continue
    }
    // A failure is reported as a warning, and the other environments are still announced.
    try {
      await post(token, channel, message(environmentSections))
      core.info(`Changelog posted to ${channel} for ${environment}.`)
    } catch (error) {
      core.warning(`Changelog not posted to ${channel} for ${environment}: ${error instanceof Error ? error.message : error}`)
    }
  }
}
