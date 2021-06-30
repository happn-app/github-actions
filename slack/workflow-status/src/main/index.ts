import { setFailed, setOutput } from '@actions/core'
import { context } from '@actions/github'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import type { Context } from '@actions/github/lib/context'
import GitHubAPI from '../utils/api'
import { parseInputs } from '../utils/inputs'
import { saveMessageState } from '../utils/state'

// @ts-ignore
const slack = new WebClient(process.env.SLACK_TOKEN)

// @ts-ignore
const gh = GitHubAPI(process.env.GITHUB_TOKEN)

function extractTag(ref: string): string {
  if (!ref) {
    throw new Error('provided ref is empty or not provided at all')
  }
  if (ref.startsWith('refs/tags/')) {
    return ref.replace('refs/tags/', '')
  }
  return ref
}

function getWorkflowType(ref: string) {
  if (ref.startsWith('refs/tags/')) {
    // Pushed on tag creation
    return 'tag'
  }
  if (ref.startsWith('refs/heads/')) {
    // Pushed to merge 2 branches
    return 'branch'
  }
  if (ref.startsWith('refs/pull/')) {
    // Pull request opened, synchronized, opened
    return 'pull_request'
  }
  throw new Error('could not recognize type of the workflow')
}

async function run(ctx: Context): Promise<void> {
  const {
    channel,
    reactionRunning,
    message,
    username,
    iconEmoji,
    iconURL,
    tagName,
  } = parseInputs()

  const { runId, ref, sha } = ctx
  const { owner, repo } = ctx.repo

  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const workflowURL = `${repositoryURL}/actions/runs/${runId}`

  const tag = extractTag(tagName || ref)
  const shaShort = sha.substr(0, 7)
  const releaseURL = `${repositoryURL}/releases/tag/${tag}`
  const commitURL = `${repositoryURL}/commit/${sha}`

  const commit = await gh.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
  })

  const isReleaseWorkflow = getWorkflowType(ref) == 'tag' || tagName != ''

  const mdRef = isReleaseWorkflow
    ? `<${releaseURL}|${tag}>`
    : `<${commitURL}|${shaShort}>`

  const text = (message || `*${repo}* ${isReleaseWorkflow ? tag : shaShort} \n\n ${commit.data.commit.message}`)
    .replace(/{{.?tag.?}}/, tag)
    .replace(/{{.?sha.?}}/, shaShort)
    .replace(/{{.?commit.?}}/, commit.data.commit.message)

  let params: ChatPostMessageArguments = {
    channel,
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'See run details',
            emoji: true,
          },
          value: 'click_me_123',
          url: workflowURL,
          action_id: 'button-action',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: mdRef,
          },
          {
            type: 'mrkdwn',
            text: `<${repositoryURL}|${repo}>`,
          },
        ],
      },
    ],
  }
  if (username) {
    params.username = username
  }
  if (iconURL) {
    params.icon_url = iconURL
  }
  if (iconEmoji) {
    params.icon_emoji = iconEmoji
  }

  const result = await slack.chat.postMessage(params)

  if (reactionRunning) {
    await slack.reactions.add({
      name: reactionRunning,
      timestamp: result.ts as string,
      channel: result.channel as string,
    })
  }

  setOutput('ts', result.ts)
  setOutput('channel', result.channel)

  saveMessageState(result.channel as string, result.ts as string)
}

run(context).catch(error => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
