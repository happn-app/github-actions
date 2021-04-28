import { getInput, setFailed, setOutput } from '@actions/core'
import { context } from '@actions/github'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import type { Context } from '@actions/github/lib/context'

// @ts-ignore
const slack = new WebClient(process.env.SLACK_TOKEN)

const Channel = 'channel'
const ReactionAdd = 'reaction_add'
const RepositoryName = 'repository_name'
const Message = 'message'
const Username = 'username'
const IconEmoji = 'icon_emoji'
const IconURL = 'icon_url'

function extractTag(ref: string): string {
  if (!ref) {
    throw new Error('provided ref is empty or not provided at all')
  }
  if (ref.startsWith('refs/tags/')) {
    return ref.replace('refs/tags/', '')
  }
  return ref
}

async function run(ctx: Context): Promise<void> {
  const channel = getInput(Channel)
  const addReaction = getInput(ReactionAdd)
  const repositoryName = getInput(RepositoryName)
  const message = getInput(Message)
  const username = getInput(Username)
  const iconEmoji = getInput(IconEmoji)
  const iconURL = getInput(IconURL)

  const { ref, runId } = ctx
  const { owner, repo } = ctx.repo

  const tagName = extractTag(ref)
  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const releaseURL = `${repositoryURL}/releases/tag/${tagName}`
  const workflowURL = `${repositoryURL}/actions/runs/${runId}`

  const text = message || `*${repo}* ${tagName}`

  let params: ChatPostMessageArguments = {
    channel,
    text: text.replace(/{{?tag?}}/, tagName),
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: text,
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
            text: `<${releaseURL}|${tagName}>`,
          },
          {
            type: 'mrkdwn',
            text: `<${repositoryURL}|${repositoryName || repo}>`,
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

  if (addReaction) {
    await slack.reactions.add({
      name: addReaction,
      timestamp: result.ts as string,
      channel: result.channel as string,
    })
  }

  setOutput('ts', result.ts)
  setOutput('channel', result.channel)
}

run(context).catch(error => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
