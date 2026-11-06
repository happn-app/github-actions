## About

GitHub action for the gitops repository: when a pull request deploying backend services is
merged, posts its changelog to the Slack channel of each environment it deploys to.

It reads the block written by [deploy-changelog](../deploy-changelog) in the pull request
description. Each section names its environment (`## charms 1.205 → 1.206 (preprod)`) and is posted
to the channel configured for it, as one message per environment. An environment without a channel
is skipped, and a description without the block, or a pull request closed without being merged,
posts nothing.

Each release is announced the way backend/release announced it until now: the service and the
version in bold, the version linking to the release, then its changes, with their tickets and pull
requests linked.

> **spots [1.161](https://github.com/happn-app/backend/releases/tag/spots-1.161)**
> • [[BCK-1927](https://happnapp.atlassian.net/browse/BCK-1927)] Cover every spots endpoint with OpenAPI ([#819](https://github.com/happn-app/backend/pull/819))
> • build(spots): drop unused mockserver test dependencies

The block names the commit it was computed for. When it is not the merged commit, because the run
of deploy-changelog on the last push failed, the changelog may announce other versions than the
merged ones: the action posts nothing and reports a warning.

The announcement is a convenience: when Slack refuses a message, the action reports a warning,
still announces the other environments, and succeeds.

## Usage

```yaml
name: Deploy notify

on:
  pull_request:
    types:
      - closed

jobs:
  notify:
    if: github.event.pull_request.merged
    runs-on: [ arc-runner-tiny ]
    steps:
      - uses: happn-app/github-actions/gitops/deploy-notify@master
        with:
          slack_token: ${{ secrets.SLACK_BOT_TOKEN }}
          preprod_channel: C70UFJ927
          prod_channel: C026T6TJSJW
```

| Input | Type | Required | Description |
|---|---|---|---|
| `slack_token` | String | Required | Slack bot token, member of the channels below |
| `preprod_channel` | String | Optional | Channel identifier for preprod deployments |
| `prod_channel` | String | Optional | Channel identifier for prod deployments |
| `dry_run` | Boolean | Optional | Print the messages instead of posting them (default: false) |

## Development

```bash
npm ci
npm test
npm run build   # dist/ is committed: rebuild it with every change of src/
```
