## About

GitHub action to publish a message to Slack when the release workflow starts.

This action will publish a message to configured Slack channel. It may also decorate the mesage with
a reaction (e.g. ⌛️) to present workflow state.

Thanks to `channel` and `ts` outputs it could be used together with other GitHub Actions that target
Slack as a notification center.

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
    * `reaction:add` (optional) - if you would like to use `reaction_add` parameter in order to
      decorate the message with a reaction to present an easy eye-greppable status of workflow.

2. Persist Slack token as a secret - in the example presented below it was saved as
   a `SLACK_BOT_TOKEN`.

3. Configure a release workflow that is triggered on tag creation.

### Sample workflow definition

```yaml
name: Release

on:
  push:
    tags:
      - '*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:

      - name: Notify workflow start
        id: notify-start
        uses: happn-app/github-actions/slack/release-start@master
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: "random"
          message: "Release of *Hello App* - {{tag}}"
          username: "release-bot"
          icon_emoji: rocket
          reaction_add: hourglass

      # ...
```

## Customizing

### Parameters

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `tag_name` | String | Optional | Name of the tag (ex: 1.1.0). Useful, whether workflow is responsible for creating a tag (release). |
| `channel` | String | Mandatory | Name of a slack channel (ex: general). |
| `reaction_add` | String | Optional | Name of the emoji reaction that is going to be added to the first message. |
| `message` | String | Optional | The text of a message that will be posted on Slack. |
| `username` | String | Optional | Customize the name of the bot - sender of a message. Remember to `authorize chat:write.customize` scope. |
| `icon_emoji` | String | Optional | Customize an avatar by using an emoji. Remember to authorize `chat:write.customize scope`. |
| `icon_url` | String | Optional | Customize bot avatar by providing avatar URL. Remember to authorize `chat:write.customize scope`. |

## Contributing

When you have made some changes to this action, you MUST provide a transpiled JavaScript file. For
this purpose, the `package.json` includes a `build` script, which takes care of transpiling
TypeScript and generating a single file as an output must be pushed within this repository.

```shell
npm run build
```
