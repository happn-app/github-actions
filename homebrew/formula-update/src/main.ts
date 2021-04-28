import type { API } from './api'
import { parseInputs } from './inputs'
import { context } from '@actions/github'
import renderFormula from './formula'
import { commitFormula, renderCommitMessage } from './commit'
import api from "./api";
import { setFailed } from "@actions/core";

async function run(api: (token: string) => API): Promise<void> {
  const apiSelf = api(process.env.GITHUB_TOKEN || '')
  const apiTap = api(process.env.HOMEBREW_TAP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '')

  const {
    branch,
    commitMessageTemplate,
    filePath,
    formulaName,
    formulaTemplate,
    owner,
    repo,
    revision,
    tag,
  } = await parseInputs(context, apiSelf)

  const formula = await renderFormula(formulaTemplate, {
    formula: formulaName,
    revision,
    tag,
  })

  const commitMessage = renderCommitMessage(commitMessageTemplate, {
    formula: formulaName,
    tag,
  })

  await commitFormula(apiTap, formula, {
    branch,
    filePath,
    message: commitMessage,
    owner,
    repo,
  })
}

run(api).catch((error: Error) => {
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
