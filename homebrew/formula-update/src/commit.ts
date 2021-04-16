import { API } from './api'
import { compile } from 'handlebars'

export type CommitMessageParams = {
  formulaFile: string
  tag: string
}


/**
 * renderCommitMessage generates a processed and formatted commit message that
 * went through the template engine pipeline to include custom variables.
 *
 * @param template template of a commit message
 * @param params variables usable in rendering commit message
 */
export function renderCommitMessage(template: string, params: CommitMessageParams): string {
  const render = compile(template)
  return render({
    ...params,

    // aliases
    formula: params.formulaFile,
    version: params.tag,
  })
}

export type CommitParams = {
  /**
   * owner provides an organization name.
   * Example: kubernetes
   */
  owner: string

  /**
   *  repo stands for repository name.
   *  Example: kubectl
   */
  repo: string

  /**
   * message keeps the formatted commit message.
   * Example: Bump version of my-app to 1.2.0
   */
  message: string

  /**
   * filePath is a relative path, where the formula file is located.
   * Example: Formula/my-app.rb
   */
  filePath: string

  /**
   * branch is a name of the branch (without the refs/... prefix) of the tap
   * repository, where change should be committed.
   * Example: master
   */
  branch: string
}

/**
 * commitFormula is responsible for pushing a commit to the tap repository, in
 * order to replace current contents of formula with new one.
 *
 * @param api GitHub API client of the tap repository
 * @param formulaContent a content of formatted formula
 * @param params additional options to configure the commit operation
 */
export async function commitFormula(api: API, formulaContent: string, params: CommitParams) {
  const { owner, repo, message, filePath, branch } = params

  // Ensure the target file path to the tap repository is not an directory
  // and the commit will provide any change to the source code.
  const fileRes = await api.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  })
  const fileData = fileRes.data
  if (Array.isArray(fileData)) {
    throw new Error(`expected '${filePath}' is a file, got a directory`)
  }

  const content = ('content' in fileData && fileData.content) || ''
  const contentBuf = Buffer.from(content, 'base64')

  const oldContent = contentBuf.toString('utf8')
  if (formulaContent == oldContent) {
    throw new Error('no replacements occurred')
  }

  // Make a direct change to the formula file in the tap repository.
  return await api.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message,
    branch: branch,

    content: Buffer.from(formulaContent).toString('base64'),
    sha: fileData.sha,
  })
}
