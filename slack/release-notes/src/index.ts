import { getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import {
  Block,
  ChatPostMessageArguments,
  KnownBlock,
  WebClient,
} from '@slack/web-api'
import type { Context } from '@actions/github/lib/context'
import GitHubAPI from './api'
import slackifyMarkdown from 'slackify-markdown'

// @ts-ignore
const slack = new WebClient(process.env.SLACK_TOKEN)

// @ts-ignore
const gh = GitHubAPI(process.env.GITHUB_TOKEN)

const Channel = 'channel'
const ThreadTimestamp = 'thread_ts'
const RepositoryName = 'repository_name'
const ReleaseBody = 'release_body'
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
  const threadTS = getInput(ThreadTimestamp)
  const repositoryName = getInput(RepositoryName)
  const releaseBody = getInput(ReleaseBody)
  const username = getInput(Username)
  const iconEmoji = getInput(IconEmoji)
  const iconURL = getInput(IconURL)

  const { ref } = ctx
  const { owner, repo } = ctx.repo

  const tagName = extractTag(ref)
  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const releaseURL = `${repositoryURL}/releases/tag/${tagName}`

  const release = await gh.repos.getReleaseByTag({
    owner,
    repo,
    tag: tagName,
  })

  const releaseName = release.data.name || tagName
  const changelog = slackifyMarkdown(releaseBody || release.data.body || 'No changelog provided')

  let blocks: (Block | KnownBlock)[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Changelog`,
        emoji: true,
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
    {
      type: 'divider',
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
      head: tagName,
    })
    const diffURL = compare.data.html_url

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `See also <${releaseURL}}|full release notes on GitHub> or a <${diffURL}|diff bettween ${baseTag} and ${tagName}>.`,
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
    thread_ts: threadTS,
    text: `Changelog of ${releaseName}`,
    blocks: blocks,
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
