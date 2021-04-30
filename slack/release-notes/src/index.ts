import { setFailed } from '@actions/core'
import { context } from '@actions/github'
import type { Context } from '@actions/github/lib/context'
import GitHubAPI from './api'
import slackifyMarkdown from 'slackify-markdown'
import { extractTag, makeChunks } from './utils'
import { parseInputs } from './inputs'
import { postChangelog, startThread } from './slack'

// @ts-ignore
const gh = GitHubAPI(process.env.GITHUB_TOKEN)

async function compareReleases({ owner, repo, tag }: any) {
  const releases = await gh.repos.listReleases({
    owner,
    repo,
    per_page: 2,
  })

  if (releases.data.length < 2) {
    return {}
  }

  const compare = await gh.repos.compareCommits({
    owner,
    repo,
    per_page: 1,
    base: releases.data[1].tag_name,
    head: tag,
  })
  return {
    baseTag: releases.data[1].tag_name,
    diffURL: compare.data.html_url,
  }
}

async function run(ctx: Context): Promise<void> {
  const {
    channel: channelName,
    threadTS,
    releaseBody,
    username,
    iconEmoji: icon_emoji,
    iconURL: icon_url,
    message,
    tagName,
  } = parseInputs()

  let channel = channelName
  let thread_ts = threadTS

  const { ref } = ctx
  const { owner, repo } = ctx.repo

  const tag = extractTag(tagName || ref)
  const repositoryURL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${owner}/${repo}`
  const releaseURL = `${repositoryURL}/releases/tag/${tag}`

  // Note: it will fail when only tag is created without a release.
  const release = await gh.repos.getReleaseByTag({ owner, repo, tag })

  const releaseName = release.data.name || tag
  const changelog = slackifyMarkdown(releaseBody || release.data.body || 'No changelog provided')

  if (message) {
    const result = await startThread({
      channel, message, releaseURL, releaseName, repositoryURL, repo,
      tagName: tag,
      chatArgs: { username, icon_emoji, icon_url },
    })
    thread_ts = result.ts as string
    channel = result.channel as string
  }

  const { diffURL, baseTag } = await compareReleases({ owner, repo, tag })

  makeChunks(changelog, 8000).forEach((chunk) => {
    postChangelog({
      diffURL,
      baseTag,
      releaseName,
      releaseURL,
      tag,
      channel,
      changelog: chunk,
      chatArgs: { thread_ts, icon_url, icon_emoji, username },
    }).then(
      (result) => {
        if (!channel) {
          channel = result.channel as string
        }
      },
      (err) => {
        throw err
      },
    )
  })
}

run(context).catch(error => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
