import { getInput, setFailed, setOutput } from '@actions/core'
import { context } from '@actions/github'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import type { Context } from '@actions/github/lib/context'

const client = new WebClient(process.env.SLACK_TOKEN)

const Channel = 'channel'
const ThreadTimestamp = 'thread_ts'
const ReactionAdd = 'reaction_add'
const ReactionRemove = 'reaction_remove'
const Message = 'message'
const Username = 'username'
const IconEmoji = 'icon_emoji'
const IconURL = 'icon_url'

async function run(ctx: Context): Promise<void> {
  const channel = getInput(Channel)
  const threadTS = getInput(ThreadTimestamp)
  const addReaction = getInput(ReactionAdd)
  const removeReaction = getInput(ReactionRemove)
  const message = getInput(Message)
  const username = getInput(Username)
  const iconEmoji = getInput(IconEmoji)
  const iconURL = getInput(IconURL)

  const { runId } = ctx
  const { owner, repo } = ctx.repo
  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const workflowURL = `${repositoryURL}/actions/runs/${runId}`

  let params: ChatPostMessageArguments = {
    channel,
    text: message,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
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

  if (threadTS) {
    if (addReaction) {
      await client.reactions.add({
        name: addReaction,
        timestamp: threadTS,
        channel,
      })
    }
    if (removeReaction) {
      await client.reactions.remove({
        name: removeReaction,
        timestamp: threadTS,
        channel,
      })
    }

    params.thread_ts = threadTS
  }

  const result = await client.chat.postMessage(params)

  setOutput('ts', result.ts)
  setOutput('channel', result.channel)
}

run(context).catch(error => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
