import { getOctokit } from '@actions/github'

import { serviceCandidates } from './releases'

type Octokit = ReturnType<typeof getOctokit>

interface Repository {
  owner: string
  repo: string
}

export function repository(fullName: string): Repository {
  const [owner, repo] = fullName.split('/')
  return { owner, repo }
}

function isNotFound(error: unknown): boolean {
  return (error as { status?: number }).status === 404
}

export class Gitops {
  constructor(private readonly octokit: Octokit, private readonly repository: Repository) {}

  async changedFiles(pullRequest: number): Promise<string[]> {
    const files = await this.octokit.paginate(this.octokit.rest.pulls.listFiles, {
      ...this.repository,
      pull_number: pullRequest,
      per_page: 100,
    })
    return files.filter((f) => f.status !== 'removed').map((f) => f.filename)
  }

  // Undefined when the file does not exist at that commit.
  async fileAt(ref: string, path: string): Promise<string | undefined> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        ...this.repository,
        path,
        ref,
        mediaType: { format: 'raw' },
      })
      return response.data as unknown as string
    } catch (error) {
      if (isNotFound(error)) {
        return undefined
      }
      throw error
    }
  }

  // The commit the head branched from: the base branch may have moved on since.
  async mergeBase(base: string, head: string): Promise<string> {
    const response = await this.octokit.rest.repos.compareCommitsWithBasehead({
      ...this.repository,
      basehead: `${base}...${head}`,
      per_page: 1,
    })
    return response.data.merge_base_commit.sha
  }

  async body(pullRequest: number): Promise<string> {
    const response = await this.octokit.rest.pulls.get({ ...this.repository, pull_number: pullRequest })
    return response.data.body ?? ''
  }

  async setBody(pullRequest: number, body: string): Promise<void> {
    await this.octokit.rest.pulls.update({ ...this.repository, pull_number: pullRequest, body })
  }
}

export class Backend {
  constructor(private readonly octokit: Octokit, readonly repository: Repository) {}

  get url(): string {
    return `https://github.com/${this.repository.owner}/${this.repository.repo}`
  }

  // GitHub answers 404 for a repository the token cannot read, which would make
  // every image look untagged and wipe the changelog: fail instead.
  async checkReadable(): Promise<void> {
    await this.octokit.rest.repos.get({ ...this.repository })
  }

  async tagExists(tag: string): Promise<boolean> {
    try {
      await this.octokit.rest.git.getRef({ ...this.repository, ref: `tags/${tag}` })
      return true
    } catch (error) {
      if (isNotFound(error)) {
        return false
      }
      throw error
    }
  }

  // The backend service an image belongs to: images are named after their
  // service, sometimes with a suffix (`shop-v2-worker` for `shop-v2`).
  async serviceOf(image: string, version: string): Promise<string | undefined> {
    const candidates = serviceCandidates(image)
    const exists = await Promise.all(candidates.map((candidate) => this.tagExists(`${candidate}-${version}`)))
    return candidates.find((_, i) => exists[i])
  }

  // The commits of a service in the history of `ref` since a date, newest first.
  async serviceCommits(ref: string, path: string, since: string): Promise<{ sha: string; subject: string }[]> {
    const commits = await this.octokit.paginate(this.octokit.rest.repos.listCommits, {
      ...this.repository,
      sha: ref,
      path,
      since,
      per_page: 100,
    })
    return commits.map((c) => ({ sha: c.sha, subject: c.commit.message.split('\n')[0] }))
  }

  // The committer date of the commit where two histories part, e.g. the master
  // commit a snapshot branch started from. Undefined when either ref does not
  // exist, e.g. a version deployed before the service had tags of its own.
  async mergeBaseDate(base: string, head: string): Promise<string | undefined> {
    try {
      const response = await this.octokit.rest.repos.compareCommitsWithBasehead({
        ...this.repository,
        basehead: `${base}...${head}`,
        per_page: 1,
      })
      const commit = response.data.merge_base_commit.commit
      return commit.committer?.date ?? commit.author?.date
    } catch (error) {
      if (isNotFound(error)) {
        return undefined
      }
      throw error
    }
  }

  // The latest pull request of a branch, whatever its state.
  async pullRequestOf(branch: string): Promise<string | undefined> {
    const response = await this.octokit.rest.pulls.list({
      ...this.repository,
      head: `${this.repository.owner}:${branch}`,
      state: 'all',
      per_page: 1,
    })
    return response.data[0]?.html_url
  }
}
