## About

GitHub action to publish a changelog as a message on Slack.

This action will read the GitHub release to fetch release body (if it was not provided explicitly),
try to parse it as [Slack markdown](https://api.slack.com/reference/surfaces/formatting) and publish
to configured Slack channel.

It could be used in conjunction with `release-start` GitHub Action to post release notes into thread
message.

## Usage

> If you have not ever configured any Slack bot, please take at the [Slack documentation for developers](https://api.slack.com/authentication/basics).

### Prerequisites

1. Obtain a Slack token for bot. You will likely need to create a new private Slack App and find the
   token in `Features` > `OAuth & Permissions` > `OAuth Tokens for Your Workspace` section of a app
   configuration. Please ensure it has following scopes authorized:

    * `incomming:webhook`
    * `chat:write` - allow writing to your Slack as a bot.
    * `chat:write.customize` (optional) - if you would like to configure the name and look (an
      avatar) of a bot.

2. Persist Slack token as a secret - in the example presented below it was saved as
   a `SLACK_BOT_TOKEN`.

3. Configure a release workflow that is triggered on tag creation.

### Sample workflow definition

Below is an example of GitHub workflow that will publish a body of release into a thread started
by `release-start` action:

```yaml
name: Release

on:
  push:
    tags:
      - '*'

env:
  SLACK_CHANNEL_NAME: "testing"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: Notify workflow start
        id: notify-start
        uses: happn-tech/github-actions/slack/release-start@master
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: ${{ env.SLACK_CHANNEL_NAME }}

      - name: Notify release notes
        id: notify-release-notes
        uses: happn-tech/github-actions/slack/release-notes@master
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: ${{ steps.notify-start.outputs.channel }}
          thread_ts: ${{ steps.notify-start.outputs.ts }}
```

### Generate release notes during workflow run

If you have some pipeline to automate changelog generation you can define it in the `release_body`
parameter, i.e.:

```yaml
# ...

jobs:
  release:
    steps:
      - name: Notify workflow start
        id: notify-start
        uses: happn-tech/github-actions/slack/release-start@master
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: ${{ env.SLACK_CHANNEL_NAME }}

      # ...

      - name: Extract tag from ref
        id: extract-tag
        run: |
          printf "::set-output name=%s::%s\n" tag-name "${GITHUB_REF#refs/tags/}"

      - name: Generate changelog
        id: generate-changelog
        run: |
          printf "::set-output name=%s::%s\n" changelog "# ${{ steps.extract-tag.outputs.tag-name }}\n\n- feat: Add dashboard" 

      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.generate-changelog.outputs.changelog }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify release notes
        id: notify-release-notes
        uses: happn-tech/github-actions/slack/release-notes@master
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: ${{ steps.notify-start.outputs.channel }}
          thread_ts: ${{ steps.notify-start.outputs.ts }}
          release_body: ${{ steps.generate-changelog.outputs.changelog }}
          username: release-bot
          icon_emoji: robot_face
```

## Customizing

### Parameters

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `channel` | String | Mandatory | Name of a slack channel (ex: general) or a channel identifier when sending in thread. |
| `thread_ts` | String | Optional | Timestamp of message used as a reference to reply in thread. |
| `release_body` | String | Optional | A content of release body (e.g. a changelog). |
| `username` | String | Optional | Customize the name of the bot - sender of a message. Remember to `authorize chat:write.customize` scope. |
| `icon_emoji` | String | Optional | Customize an avatar by using an emoji. Remember to authorize `chat:write.customize scope`. |
| `icon_url` | String | Optional | Customize bot avatar by providing avatar URL. Remember to authorize `chat:write.customize scope`. |

## Limitations

Action has dozens of known limitations:

- This action MUST be used only in release pipelines - workflows triggered when tag has been
  created.
- If you would like to skip some lines (e.g. a header) you have to done it manually and supply the
  changelog in `release_body` parameter.

## Contributing

When you have made some changes to this action, you MUST provide a transpiled JavaScript file. For
this purpose, the `package.json` includes a `build` script, which takes care of transpiling
TypeScript and generating a single file as an output must be pushed within this repository.

```shell
npm run build
```
