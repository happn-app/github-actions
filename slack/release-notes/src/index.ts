import { getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { Block, ChatPostMessageArguments, KnownBlock, WebClient } from '@slack/web-api'
import type { Context } from '@actions/github/lib/context'
import GitHubAPI from './api'
import slackifyMarkdown from 'slackify-markdown'

// @ts-ignore
const slack = new WebClient(process.env.SLACK_TOKEN)

// @ts-ignore
const gh = GitHubAPI(process.env.GITHUB_TOKEN)

const Channel = 'channel'
const ThreadTimestamp = 'thread_ts'
const ReleaseBody = 'release_body'
const Username = 'username'
const IconEmoji = 'icon_emoji'
const IconURL = 'icon_url'
const TagName = 'tag_name'
const Message = 'message'

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
  const threadTS = getInput(ThreadTimestamp)
  const releaseBody = getInput(ReleaseBody)
  const username = getInput(Username)
  const iconEmoji = getInput(IconEmoji)
  const iconURL = getInput(IconURL)
  const message = getInput(Message)
  const tagName = getInput(TagName)

  const { ref } = ctx
  const { owner, repo } = ctx.repo

  const tag = extractTag(tagName || ref)
  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const releaseURL = `${repositoryURL}/releases/tag/${tag}`

  // Note: it will fail when only tag is created without a release.
  const release = await gh.repos.getReleaseByTag({
    owner,
    repo,
    tag,
  })

  const releaseName = release.data.name || tag
  const changelog = slackifyMarkdown(releaseBody || release.data.body || 'No changelog provided')

  let thread_ts = threadTS
  if (message) {
    const text = message
      .replace(/{{.?tag.?}}/, release.data.tag_name)
      .replace(/{{.?release.?}}/, release.data.name || release.data.tag_name)

    const result = await slack.chat.postMessage({
      channel: channel,
      mrkdwn: true,
      text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `<${release.data.html_url}|${release.data.tag_name}>`,
            },
            {
              type: 'mrkdwn',
              text: `<${repositoryURL}|${repo}>`,
            },
          ],
        },
      ],
    })
    thread_ts = result.thread_ts as string
  }

  let blocks: (Block | KnownBlock)[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Changelog of ${release.data.name || tag}`,
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: changelog,
        },
      ],
    },
    {
      type: 'divider',
    },
  ]

  const releases = await gh.repos.listReleases({
    owner,
    repo,
    per_page: 2,
  })

  if (releases.data.length == 2) {
    const baseTag = releases.data[1].tag_name
    const compare = await gh.repos.compareCommits({
      owner,
      repo,
      per_page: 1,
      base: baseTag,
      head: tag,
    })
    const diffURL = compare.data.html_url

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `See also <${releaseURL}}|full release notes on GitHub> or a <${diffURL}|diff bettween ${baseTag} and ${tag}>.`,
        },
      ],
    })
  } else {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `See also <${releaseURL}}|full release notes on GitHub>.`,
        },
      ],
    })
  }

  let params: ChatPostMessageArguments = {
    channel: channel,
    text: `Changelog of ${releaseName}`,
    blocks: blocks,
  }
  if (thread_ts) {
    params.thread_ts = thread_ts
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

  await slack.chat.postMessage(params)
}


run(context).catch(error => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
