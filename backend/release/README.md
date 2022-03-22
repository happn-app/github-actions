## About

GitHub action to create release notes, create a release & post slackMessage

## Usage

> If you have not ever configured any Slack bot, please take at the [Slack documentation for developers](https://api.slack.com/authentication/basics).

### Sample workflow definition

Below is an example of GitHub workflow that will create a GH Release & post slack message to preprod

```yaml
name: Release

on:
  push:
    tags:
      - '*'

jobs:
  release:
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: Create Release
        id: release
        uses: happn-app/github-actions/backend/release@master
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: "preprod"
```

## Customizing

### Parameters

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `dry_run` | Boolean | Optional | Only log |
| `enable_github_release` | Boolean | Optional | Create a GH release (default: true) |
| `enable_slack_message` | Boolean | Optional | Send a message to slack (default: true) |
| `tag_pattern` | String | Optional | Custom tag pattern to fetch diff (default: "[0-9]*.[0-9]*") |
| `channel` | String | Optional | Slack channel to post message (default: preprod) |
| `username` | String | Optional | Slack username to use (default: github actor) |
| `icon_emoji` | String | Optional | Customize an avatar by using an emoji. (default: null) |
| `icon_url` | String | Optional | Customize bot avatar by providing avatar URL. (default: github actor profile picture) |

## Limitations

Action has dozens of known limitations:

- This action MUST be only used in pipelines where the tag is created (it is utilized to create
  links to diff and release details).

## Contributing

When you have made some changes to this action, you MUST provide a transpiled JavaScript file. For
this purpose, the `package.json` includes a `build` script, which takes care of transpiling
TypeScript and generating a single file as an output must be pushed within this repository.

```shell
npm run build
```
