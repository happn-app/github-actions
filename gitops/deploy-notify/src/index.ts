import * as core from '@actions/core'
import { context } from '@actions/github'

import { changelogOf, message } from './message'

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

async function run(): Promise<void> {
  const pullRequest = context.payload.pull_request
  // A pull request closed without being merged deploys nothing.
  if (!pullRequest?.merged) {
    core.info('The pull request is not merged, nothing was deployed.')
    return
  }

  const channels = new Map([
    ['preprod', core.getInput('preprod_channel')],
    ['prod', core.getInput('prod_channel')],
  ])
  const dryRun = core.getBooleanInput('dry_run')

  const { head, sections } = changelogOf(pullRequest.body ?? '')
  if (sections.size === 0) {
    core.info('No deploy changelog in the pull request description, nothing to post.')
    return
  }
  // A run of deploy-changelog that failed on the last push leaves the changelog
  // of an earlier commit, which may announce other versions than the merged ones.
  const mergedHead = pullRequest.head?.sha as string | undefined
  if (!head || head !== mergedHead) {
    core.warning(
      `The deploy changelog was computed for ${head ?? 'an unknown commit'}, not for the merged ${mergedHead}: nothing posted.`,
    )
    return
  }

  for (const [environment, environmentSections] of sections) {
    const channel = channels.get(environment)
    if (!channel) {
      core.info(`No channel configured for ${environment}, skipped.`)
      continue
    }
    const text = message(environmentSections)
    if (dryRun) {
      core.info(`[DRYRUN] ${channel}:\n${text}`)
      continue
    }
    // The announcement is a convenience: a failure is reported as a warning, and the
    // other environments are still announced.
    try {
      await post(core.getInput('slack_token', { required: true }), channel, text)
      core.info(`Changelog posted to ${channel} for ${environment}.`)
    } catch (error) {
      core.warning(`Changelog not posted to ${channel} for ${environment}: ${error instanceof Error ? error.message : error}`)
    }
  }
}

run().catch((error) => {
  core.warning(`Deploy changelog not posted: ${error instanceof Error ? error.message : error}`)
})
