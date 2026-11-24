## About

GitHub action for the gitops repository. While a pull request deploying backend services is open,
it writes in its description the changelog of what the pull request deploys. Once the pull request
is merged, it posts that changelog to the Slack channel of each environment it deploys to.

For every image whose `newTag` changes in a `kustomization.yaml`, the action finds the backend
service by trimming the image name until a `<prefix>-<version>` tag exists in the backend
repository: image `shop-v2-worker` at `1.75` resolves to `shop-v2-1.75`. Images without such a tag
(sidecars, third-party images) are ignored. The environment is the directory holding the
`kustomization.yaml` (`preprod`, `prod`).

Each deployment gets one section, listing the commits of the service the new version holds and the
deployed one does not, written as backend/release writes its notes: tickets link to JIRA and pull
request numbers to the pull request. They are read from the tags, so the changelog is right as soon
as the version is tagged, before its release is published. The same goes for a release, a snapshot,
or going back to an older version, which adds nothing and is flagged as a rollback. A deployed
version without tag gets a note instead of its changes. The version links to its release, or for a
snapshot to the pull request of its branch. When the pull request skips releases, from 1.112 to 1.114,
each release gets its own block, newest first, with the commits it brought.

```markdown
## charms 1.205 → 1.206 (preprod)

### [charms-1.206](https://github.com/happn-app/backend/releases/tag/charms-1.206)
- fix(charms): use jakarta PreDestroy instead of javax ([#679](https://github.com/happn-app/backend/pull/679))
```

The changelog sits between `<!-- deploy-changelog:start head=<sha> -->` and
`<!-- deploy-changelog:end -->`. The rest of the description is left untouched and never posted. The
block is rewritten on every push, so it follows the versions when the pull request changes.

Once merged, each deployed service is announced with the service and the version in bold, the
version linking to the release, who deployed it, then its changes. The releases a deployment skips
follow, each in its own block with its changes.

> **spots [1.161](https://github.com/happn-app/backend/releases/tag/spots-1.161)** deployed by EtiPlas ([gitops#6201](https://github.com/happn-app/gitops/pull/6201))
> • [[BCK-1927](https://happnapp.atlassian.net/browse/BCK-1927)] Cover every spots endpoint with OpenAPI ([#819](https://github.com/happn-app/backend/pull/819))
> • build(spots): drop unused mockserver test dependencies

The block names the commit it was computed for. When it is not the merged commit, because the last
run failed or had not finished, it may announce other versions than the merged ones: nothing is
posted.

The changelog is a convenience: it never blocks a deployment. On any error, the description is left
as it was, or nothing is posted, with a warning, and the run succeeds.

## Usage

```yaml
name: Deploy changelog

on:
  pull_request:
    branches: [master]
    paths:
      - apps/microservices/**/kustomization.yaml
    types:
      - opened
      - synchronize
      - reopened
      - closed

# A slower run on an older push must not overwrite the changelog of a newer one.
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  describe:
    name: Write the changelog in the pull request
    if: github.event.action != 'closed'
    runs-on: [ arc-runner-tiny ]
    steps:
      - name: Mint a token reading the backend repository
        id: backend-token
        continue-on-error: true
        uses: actions/create-github-app-token@v3
        with:
          app-id: ${{ vars.GH_HAPPN_APP_ID }}
          private-key: ${{ secrets.GH_HAPPN_APP_PRIVATE_KEY }}
          repositories: backend
          permission-contents: read
          permission-pull-requests: read

      - name: Write the changelog from the backend commits
        uses: happn-app/github-actions/gitops/deploy-changelog@master
        with:
          mode: describe
          backend_token: ${{ steps.backend-token.outputs.token }}

  announce:
    name: Post the changelog to Slack
    if: github.event.action == 'closed' && github.event.pull_request.merged
    runs-on: [ arc-runner-tiny ]
    steps:
      - name: Post the changelog to Slack
        uses: happn-app/github-actions/gitops/deploy-changelog@master
        with:
          mode: announce
          slack_token: ${{ secrets.SLACK_BOT_TOKEN }}
          preprod_channel: C70UFJ927
          prod_channel: C026T6TJSJW
```

| Input | Type | Required | Description |
|---|---|---|---|
| `mode` | String | Required | `describe` writes the changelog in the pull request description, `announce` posts it to Slack once merged |
| `backend_token` | String | To describe | Token reading the tags, commits and pull requests of `backend_repository` |
| `slack_token` | String | To announce | Slack bot token, member of the channels below |
| `preprod_channel` | String | Optional | Channel identifier for preprod deployments |
| `prod_channel` | String | Optional | Channel identifier for prod deployments |
| `github_token` | String | Optional | Token reading and editing the pull request (default: `github.token`) |
| `backend_repository` | String | Optional | Repository holding the services (default: `happn-app/backend`) |
| `pull_request` | Number | Optional | Pull request to describe (default: the event's) |
| `base_sha` | String | Optional | Commit holding the deployed versions (default: the event's base) |
| `head_sha` | String | Optional | Commit holding the versions to deploy (default: the event's head) |

The action reads everything through the GitHub API: it needs no checkout.

## Development

```bash
npm ci
npm test
npm run build   # dist/ is committed: rebuild it with every change of src/
```

## Limitations

- A pull request merged before its changelog is written, as automated flows may do, is not
  announced.
- Commits are told apart by their date from where the two versions part: it assumes squash merges,
  where a commit date is its merge date.
