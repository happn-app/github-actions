import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { mergeWithin, trimBlankLines } from './body'
import { deployments, section } from './changelog'
import { Backend, Gitops, repository } from './github'

async function run(): Promise<void> {
  const pullRequest = Number(core.getInput('pull_request', { required: true }))
  const baseSha = core.getInput('base_sha', { required: true })
  const headSha = core.getInput('head_sha', { required: true })
  const dryRun = core.getBooleanInput('dry_run')

  const gitops = new Gitops(getOctokit(core.getInput('github_token', { required: true })), context.repo)
  const backend = new Backend(
    getOctokit(core.getInput('backend_token', { required: true })),
    repository(core.getInput('backend_repository', { required: true })),
  )

  await backend.checkReadable()
  const deployed = await deployments(gitops, backend, pullRequest, baseSha, headSha, core.info)
  const sections = await Promise.all(deployed.map((deployment) => section(backend, deployment)))

  const body = await gitops.body(pullRequest)
  const newBody = mergeWithin(body, sections, headSha)
  if (dryRun) {
    core.info(newBody)
  } else if (newBody !== trimBlankLines(body.replace(/\r/g, ''))) {
    await gitops.setBody(pullRequest, newBody)
    core.info(`Changelog written to pull request #${pullRequest}.`)
  } else {
    core.info(`Changelog of pull request #${pullRequest} already up to date.`)
  }
}

// The changelog is a convenience: it must never block a deployment. On any
// error, the description is left as it was and the run still succeeds.
run().catch((error) => {
  core.warning(`Deploy changelog not updated: ${error instanceof Error ? error.message : error}`)
  if (error instanceof Error && error.stack) {
    core.debug(error.stack)
  }
})
