import { Block, ChatPostMessageArguments, KnownBlock, WebClient } from '@slack/web-api'
import slackifyMarkdown from 'slackify-markdown'

// @ts-ignore
const slack = new WebClient(process.env.SLACK_TOKEN)

type StartThreadParams = {
  message: string
  release: any
  repositoryURL: string
  repo: string

  channel: string
  chatArgs: { [K in keyof ChatPostMessageArguments]+?: ChatPostMessageArguments[K] }
}

export async function startThread(
  {
    message,
    release,
    repositoryURL,
    repo,
    channel,
    chatArgs,
  }: StartThreadParams,
) {
  const text = slackifyMarkdown(
    message
      .replace(/{{.?tag.?}}/, release.data.tag_name)
      .replace(/{{.?release.?}}/, release.data.name || release.data.tag_name),
  )
  let params: ChatPostMessageArguments = {
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
    ...chatArgs,
  }
  return await slack.chat.postMessage(params)
}

type PostChangelogParams = {
  releaseName: string
  releaseURL: string
  changelog: string
  diffURL: string | undefined
  baseTag: string | undefined
  tag: string

  channel: string
  chatArgs: { [K in keyof ChatPostMessageArguments]+?: ChatPostMessageArguments[K] }
}

export async function postChangelog(
  {
    releaseName,
    releaseURL,
    changelog,
    diffURL,
    baseTag,
    tag,
    channel,
    chatArgs,
  }: PostChangelogParams,
) {
  let blocks: (Block | KnownBlock)[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Changelog of ${releaseName || tag}`,
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
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: diffURL && baseTag
            ? `See also <${releaseURL}}|full release notes on GitHub> or a <${diffURL}|diff between ${baseTag} and ${tag}>.`
            : `See also <${releaseURL}}|full release notes on GitHub>.`,
        },
      ],
    },
  ]

  let params: ChatPostMessageArguments = {
    channel,
    text: `Changelog of ${releaseName}`,
    blocks: blocks,
    ...chatArgs,
  }

  return await slack.chat.postMessage(params)
}