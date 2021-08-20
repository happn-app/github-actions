import { Block, ChatPostMessageArguments, KnownBlock, WebClient } from '@slack/web-api'

// @ts-ignore
const slack = new WebClient(process.env.SLACK_TOKEN)

type StartThreadParams = {
  message: string
  releaseName: string
  releaseURL: string,
  repo: string
  repositoryURL: string
  tagName: string

  channel: string
  chatArgs: { [K in keyof ChatPostMessageArguments]+?: ChatPostMessageArguments[K] }
}

export async function startThread(
  {
    message,
    releaseName,
    releaseURL,
    repo,
    repositoryURL,
    tagName,
    channel,
    chatArgs,
  }: StartThreadParams,
) {
  const text = message
    .replace(/{{.?tag.?}}/, tagName)
    .replace(/{{.?release.?}}/, releaseName || tagName)

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
            text: `<${releaseURL}|${tagName}>`,
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
  baseTag: string | undefined
  changelog: string
  diffURL: string | undefined
  releaseName: string
  releaseURL: string
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
            ? `See also <${releaseURL}|full release notes on GitHub> or a <${diffURL}|diff between ${baseTag} and ${tag}>.`
            : `See also <${releaseURL}|full release notes on GitHub>.`,
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

  // Wait an additional second in order to make sure multi-message changelog is sent in correct order.
  await sleep(1000)

  return await slack.chat.postMessage(params)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
