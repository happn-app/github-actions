## About

GitHub action for the gitops repository: writes, in the description of a pull request that
deploys backend services, the changelog of the releases it deploys.

For every image whose `newTag` changes in a `kustomization.yaml`, the action finds the backend
release by trimming the image name until a `<prefix>-<version>` tag exists in the backend
repository: image `shop-v2-worker` at `1.75` resolves to `shop-v2-1.75`. Images without such a tag
(sidecars, third-party images) are ignored. The environment is the directory holding the
`kustomization.yaml` (`preprod`, `prod`).

A snapshot has no release notes: its section lists the commits of the service it adds to the
deployed version, and links the pull request of its branch. Going back from a snapshot to a release
deploys nothing new, so it gets no section.

Each deployed range gets one section, built from the published releases only:

```markdown
## charms 1.205 → 1.206 (preprod)

### [charms-1.206](https://github.com/happn-app/backend/releases/tag/charms-1.206)
- fix(charms): use jakarta PreDestroy instead of javax ([#679](https://github.com/happn-app/backend/pull/679))

[charms commits since charms-1.205](https://github.com/happn-app/backend/commits/charms-1.206/services/charms?since=2026-10-12)
```

Two pull requests deploying the same range, to preprod then to prod, therefore carry the same text.

The changelog sits between `<!-- deploy-changelog:start -->` and `<!-- deploy-changelog:end -->`.
The rest of the description is left untouched, and the block is rewritten on every run, so it
follows the versions when the pull request changes.

The changelog is a convenience: it never blocks a deployment. On any error (an unreadable backend
repository, a GitHub outage), the action leaves the description as it was, reports a warning, and
succeeds.

## Usage

```yaml
name: Deploy changelog

on:
  # No `paths` filter: a push that reverts a version change must still clear its changelog.
  pull_request:
    types:
      - opened
      - synchronize
      - reopened

# A slower run on an older push must not overwrite the changelog of a newer one.
concurrency:
  group: deploy-changelog-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  changelog:
    runs-on: [ arc-runner-tiny ]
    steps:
      - name: Mint a token reading the backend releases
        id: backend-token
        uses: actions/create-github-app-token@v3
        with:
          app-id: ${{ vars.GH_HAPPN_APP_ID }}
          private-key: ${{ secrets.GH_HAPPN_APP_PRIVATE_KEY }}
          repositories: backend
          permission-contents: read

      - uses: happn-app/github-actions/gitops/deploy-changelog@master
        with:
          backend_token: ${{ steps.backend-token.outputs.token }}
```

| Input | Type | Required | Description |
|---|---|---|---|
| `backend_token` | String | Required | Token reading the tags and releases of `backend_repository` |
| `github_token` | String | Optional | Token reading and editing the pull request (default: `github.token`) |
| `backend_repository` | String | Optional | Repository holding the releases (default: `happn-app/backend`) |
| `pull_request` | Number | Optional | Pull request to describe (default: the event's) |
| `base_sha` | String | Optional | Commit holding the deployed versions (default: the event's base) |
| `head_sha` | String | Optional | Commit holding the versions to deploy (default: the event's head) |
| `dry_run` | Boolean | Optional | Print the description instead of writing it (default: false) |

The action reads everything through the GitHub API: it needs no checkout.

## Development

```bash
npm ci
npm test
npm run build   # dist/ is committed: rebuild it with every change of src/
```

## Limitations

- The history link is filtered by day only, which is all GitHub offers, and may show a few commits
  of the deployed release. It starts at the earliest start of the history links of the deployed
  releases, as [backend/release](../../backend/release) computes them: a range holding a release
  published before those links existed gets no history link.
- GitHub limits a description to 65536 characters. Past that, the notes of the oldest releases are
  left out, one release at a time: their titles, linked to their release pages, and the history
  link still cover the whole range.
- Release notes are read when the workflow runs. A pull request opened before the CI published them
  gets a placeholder: push to it, or re-run the workflow, to fill it.
- The range is read from the tags of the service, ordered by version. A tag without published
  release, such as one imported with the history of a repository integrated into the monorepo, is
  listed without notes.
