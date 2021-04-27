import type { Context } from '@actions/github/lib/context'
import { API } from './api'
import { basename } from 'path'

/**
 * extractTag is an util function to extract a tag name from the ref that
 * could be provided in `refs/tags/1.0.0` form (`$GITHUB_REF`), instead
 * of preferred 1.0.0.
 *
 * @param ref a tag (in long or short form)
 */
export function extractTag(ref: string): string {
  if (!ref) {
    throw new Error('provided ref is empty or not provided at all')
  }
  if (ref.startsWith('refs/tags/')) {
    return ref.replace('refs/tags/', '')
  }
  return ref
}

/**
 * getTagCommitRevision extracts from the action runner or obtains using
 * GitHub API a revision SHA of the the provided tag name.
 *
 * @param ctx context of a workflow runner
 * @param api GitHub API client authorized to making request on a behalf repository that is triggering a workflow
 * @param tagName name of a tag
 */
export async function getTagCommitRevision(ctx: Context, api: API, tagName: string): Promise<string> {
  if (ctx.ref == `refs/tags/${tagName}`) {
    return ctx.sha
  }
  const res = await api.rest.git.getRef({
    ...ctx.repo,
    ref: `tags/${tagName}`,
  })
  return res.data.object.sha
}

/**
 * extractFormulaName attempts to guess the recipe name from the provided
 * file path to the formula.
 *
 * @param filePath
 */
export function extractFormulaName(filePath: string): string {
  return basename(filePath, '.rb')
}
