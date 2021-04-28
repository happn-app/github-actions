import { getInput } from '@actions/core'
import type { Context } from '@actions/github/lib/context'
import { extractFormulaName, extractTag, getTagCommitRevision } from './utils'
import type { API } from './api'
import { promises as fs } from 'fs'

export const CommitMessage = 'commit_message'
export const FormulaTag = 'formula_tag'
export const FormulaTemplate = 'formula_template'
export const FormulaTemplateFile = 'formula_template_file'
export const TapFormulaPath = 'tap_formula_path'
export const TapOwner = 'tap_owner'
export const TapRepository = 'tap_repository'
export const TapBranch = 'tap_branch'

/**
 * parseInput parses all provided inputs of a workflow runner.
 *
 * @param ctx context of a workflow runner
 * @param apiSelf GitHub API client of the repository that triggered a workflow
 */
export async function parseInputs(ctx: Context, apiSelf: API) {
  const owner = getInput(TapOwner)
  const repo = getInput(TapRepository)
  const filePath = getInput(TapFormulaPath)
  const branch = getInput(TapBranch)
  const formulaTemplateContents = getInput(FormulaTemplate)
  const formulaTemplateFile = getInput(FormulaTemplateFile)
  if (formulaTemplateContents && formulaTemplateFile) {
    throw new Error(`Both ${FormulaTemplateFile} and ${FormulaTemplate} were supplied, please choose one`)
  }
  const formulaTemplate = formulaTemplateContents
    ? formulaTemplateContents
    : await readFormulaFile(formulaTemplateFile)
  if (!formulaTemplate) {
    throw new Error(`You must provide value to ${FormulaTemplateFile} or ${FormulaTemplate}`)
  }

  const commitMessageTemplate = getInput(CommitMessage)

  const tag = extractTag(getInput(FormulaTag) || process.env.GITHUB_REF as string)
  const revision = await getTagCommitRevision(ctx, apiSelf, tag)

  const formulaName = extractFormulaName(filePath)

  return {
    branch,
    commitMessageTemplate,
    filePath,
    formulaName,
    formulaTemplate,
    owner,
    repo,
    revision,
    tag,
  }
}

async function readFormulaFile(filePath: string) {
  const data = await fs.readFile(filePath, 'utf8')
  return new Buffer(data).toString()
}
