import { setFailed } from '@actions/core'
import { context } from '@actions/github'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import type { Context } from '@actions/github/lib/context'
import { parseInputs } from '../utils/inputs'
import { getMessageState } from '../utils/state'

const client = new WebClient(process.env.SLACK_TOKEN)

function getMessageByStatus() {
  const {
    reactionRunning,
    reactionFailure,
    reactionSuccess,
    reactionCancel,
    messageCancel,
    messageFailure,
    messageSuccess,
    status,
  } = parseInputs()

  switch (status) {
    case 'failure':
      return {
        message: messageFailure,
        addReaction: reactionFailure,
        removeReaction: reactionRunning,
      }

    case 'cancel':
      return {
        message: messageCancel,
        addReaction: reactionCancel,
        removeReaction: reactionRunning,
      }

    case 'success':
      return {
        message: messageSuccess,
        addReaction: reactionSuccess,
        removeReaction: reactionRunning,
      }
    default:
      throw new Error(`Unrecognized status of the workflow - ${status}`)
  }
}

async function run(ctx: Context): Promise<void> {
  const { username, iconURL, iconEmoji } = parseInputs()
  const { message, addReaction, removeReaction } = getMessageByStatus()
  const { ts, channel } = getMessageState()

  const { runId } = ctx
  const { owner, repo } = ctx.repo
  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const workflowURL = `${repositoryURL}/actions/runs/${runId}`

  if (addReaction) {
    await client.reactions.add({
      name: addReaction,
      timestamp: ts,
      channel,
    })
  }
  if (removeReaction) {
    await client.reactions.remove({
      name: removeReaction,
      timestamp: ts,
      channel,
    })
  }

  if (message) {
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
    if (ts) {
      params.thread_ts = ts
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

    await client.chat.postMessage(params)
  }
}

run(context).catch(error => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
