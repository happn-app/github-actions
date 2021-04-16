import { isDebug } from '@actions/core'
import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { requestLog } from '@octokit/plugin-request-log'

const GitHub = Octokit.plugin(restEndpointMethods, requestLog).defaults({
  baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
})

export type API = InstanceType<typeof GitHub>

/**
 * creates an GitHub API client that authorizes requests using provided token.
 *
 * @param token GitHub token to authenticate requests
 * @param options selection of configuration parameters used in client initialization
 */
export default function(token: string, options?: { fetch?: any }): API {
  return new GitHub({
    request: { fetch: options && options.fetch },
    auth: `token ${token}`,
    log: {
      info(msg: string) {
        return console.info(msg)
      },
      debug(msg: string) {
        if (!isDebug()) return
        return console.debug(msg)
      },
      warn(msg: string) {
        return console.warn(msg)
      },
      error(msg: string) {
        return console.error(msg)
      },
    },
  })
}
