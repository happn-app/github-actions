## About

GitHub action for the gitops repository. While a pull request deploying backend services is open,
it writes in its description the changelog of what the pull request deploys. Once the pull request
is merged, it posts that changelog to the Slack channel of each environment it deploys to.

For every image whose `newTag` changes in a `kustomization.yaml`, the action finds the backend
service by trimming the image name until a `<prefix>-<version>` tag exists in the backend
repository: image `shop-v2-worker` at `1.75` resolves to `shop-v2-1.75`. Images without such a tag
(sidecars, third-party images) are ignored. The environment is the directory holding the
`kustomization.yaml` (`preprod`, `prod`).

Each deployment gets one section:
- **a release** lists the notes of every release from the deployed version, excluded, to the new
  one, read from the tags of the service ordered by version;
- **a snapshot** has no release notes: it lists the commits of the service it adds to the deployed
  version, and links the pull request of its branch;
- **a release after a snapshot** lists the releases after the one the snapshot was built on.

```markdown
## charms 1.205 → 1.206 (preprod)

### [charms-1.206](https://github.com/happn-app/backend/releases/tag/charms-1.206)
- fix(charms): use jakarta PreDestroy instead of javax ([#679](https://github.com/happn-app/backend/pull/679))
```

The changelog sits between `<!-- deploy-changelog:start head=<sha> -->` and
`<!-- deploy-changelog:end -->`. The rest of the description is left untouched and never posted. The
block is rewritten on every push, so it follows the versions when the pull request changes.

Once merged, each release is announced the way backend/release announced it until now: the service
and the version in bold, the version linking to the release, then its changes, with their tickets and
pull requests linked.

> **spots [1.161](https://github.com/happn-app/backend/releases/tag/spots-1.161)**
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
      - name: Mint a token reading the backend releases
        id: backend-token
        continue-on-error: true
        uses: actions/create-github-app-token@v3
        with:
          app-id: ${{ vars.GH_HAPPN_APP_ID }}
          private-key: ${{ secrets.GH_HAPPN_APP_PRIVATE_KEY }}
          repositories: backend
          permission-contents: read
          permission-pull-requests: read

      - name: Write the changelog from the backend releases
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
| `backend_token` | String | To describe | Token reading the tags, releases and pull requests of `backend_repository` |
| `slack_token` | String | To announce | Slack bot token, member of the channels below |
| `preprod_channel` | String | Optional | Channel identifier for preprod deployments |
| `prod_channel` | String | Optional | Channel identifier for prod deployments |
| `github_token` | String | Optional | Token reading and editing the pull request (default: `github.token`) |
| `backend_repository` | String | Optional | Repository holding the releases (default: `happn-app/backend`) |
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

- Release notes are read when the workflow runs. A pull request opened before the CI published them
  gets a placeholder: push to it, or re-run the workflow, to fill it.
- A pull request merged before its changelog is written, as automated flows may do, is not
  announced.
- A tag without published release, such as one imported with the history of a repository integrated
  into the monorepo, is listed without notes.
