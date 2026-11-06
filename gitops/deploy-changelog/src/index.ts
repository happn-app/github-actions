import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { announce } from './announce'
import { mergeBody, renderBlock, trimBlankLines } from './body'
import { deployments, section } from './changelog'
import { Backend, Gitops, repository } from './github'

// Writes the changelog of the backend releases the pull request deploys in its description.
async function describe(): Promise<void> {
  const pullRequest = Number(core.getInput('pull_request', { required: true }))
  const baseSha = core.getInput('base_sha', { required: true })
  const headSha = core.getInput('head_sha', { required: true })

  const gitops = new Gitops(getOctokit(core.getInput('github_token', { required: true })), context.repo)
  const backend = new Backend(
    getOctokit(core.getInput('backend_token', { required: true })),
    repository(core.getInput('backend_repository', { required: true })),
  )

  await backend.checkReadable()
  const deployed = await deployments(gitops, backend, pullRequest, baseSha, headSha, core.info)
  const sections = await Promise.all(deployed.map((deployment) => section(backend, deployment)))

  const body = await gitops.body(pullRequest)
  const newBody = mergeBody(body, renderBlock(sections, headSha))
  if (newBody !== trimBlankLines(body.replace(/\r/g, ''))) {
    await gitops.setBody(pullRequest, newBody)
    core.info(`Changelog written to pull request #${pullRequest}.`)
  } else {
    core.info(`Changelog of pull request #${pullRequest} already up to date.`)
  }
}

// The workflow says what to do: `describe` while the pull request is open,
// `announce` once it is merged.
async function run(): Promise<void> {
  const mode = core.getInput('mode', { required: true })
  switch (mode) {
    case 'describe':
      return describe()
    case 'announce': {
      const pullRequest = context.payload.pull_request
      return announce(pullRequest?.body ?? '', pullRequest?.head?.sha)
    }
    default:
      throw new Error(`Unknown mode '${mode}': expected 'describe' or 'announce'.`)
  }
}

// The changelog is a convenience: it must never block a deployment. On any
// error, the description is left as it was, or nothing is posted, and the run
// still succeeds.
run().catch((error) => {
  core.warning(`Deploy changelog failed: ${error instanceof Error ? error.message : error}`)
  if (error instanceof Error && error.stack) {
    core.debug(error.stack)
  }
})
