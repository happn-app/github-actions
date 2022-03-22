## About

GitHub action can be used to inform about the state of workflow by publishing a message.

This action will publish a message to dedicated channel (or a thread). It might also add or remove a
reaction to decorate a message with an emoji as a representation of workflow state.

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
    * `reactions:add` (optional) - whether you would like add a reaction to message starting a
      thread.
    * `reactions:remove` (optional) - whether you would like remove a reaction from message starting
      a thread.

2. Persist Slack token as a secret - in the example presented below it was saved as
   a `SLACK_BOT_TOKEN`.

3. Configure a release workflow that is triggered on tag creation.

### Sample workflow definition

Below is an example of GitHub workflow that will publish a body of release into a thread started
by `release-start` action:

```yaml
# ...

jobs:
  release:
    steps:
      - name: Notify workflow start
        id: notify-start
        uses: happn-app/github-actions/slack/release-start@master
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          channel: ${{ env.SLACK_CHANNEL_NAME }}

      # ...

      - name: Notify workflow success
        id: notify-success
        uses: happn-app/github-actions/slack/release-status@master
        if: ${{ success() }}
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
        with:
          channel: ${{ steps.notify-start.outputs.channel }}
          thread_ts: ${{ steps.notify-start.outputs.ts }}
          reaction_add: ${{ env.SLACK_SUCCESS_EMOJI }}
          reaction_remove: ${{ env.SLACK_LOADING_EMOJI }}
          message: 'Workflow `${{ github.workflow }}` has passed successfully :tada:'

      - name: Notify workflow cancellation
        id: notify-cancel
        uses: happn-app/github-actions/slack/release-status@master
        if: ${{ cancelled() }}
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
        with:
          channel: ${{ steps.notify-start.outputs.channel }}
          thread_ts: ${{ steps.notify-start.outputs.ts }}
          reaction_remove: ${{ env.SLACK_LOADING_EMOJI }}
          message: 'Workflow `${{ github.workflow }}` has been cancelled :coffin:'

      - name: Notify workflow failure
        id: notify-failure
        uses: happn-app/github-actions/slack/release-status@master
        if: ${{ failure() }}
        env:
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
        with:
          channel: ${{ steps.notify-start.outputs.channel }}
          thread_ts: ${{ steps.notify-start.outputs.ts }}
          reaction_add: ${{ env.SLACK_FAILURE_EMOJI }}
          reaction_remove: ${{ env.SLACK_LOADING_EMOJI }}
          message: 'Workflow `${{ github.workflow }}` has failed :cry:'
```

## Customizing

### Parameters

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `channel` | String | Mandatory | Name of a slack channel (ex: general) or a channel identifier when sending in thread. |
| `thread_ts` | String | Optional | Timestamp of message used as a reference to reply in thread. |
| `message` | String | Optional | A text of a message that is going to be published. |
| `reaction_add` | String | Optional | Name of emoji (without semicolons) that will be added from a message (thread_ts argument must be provided). |
| `reaction_remove` | String | Optional | Name of emoji (without semicolons) that will be removed from a message (thread_ts argument must be provided). |
| `username` | String | Optional | Customize the name of the bot - sender of a message. Remember to `authorize chat:write.customize` scope. |
| `icon_emoji` | String | Optional | Customize an avatar by using an emoji. Remember to authorize `chat:write.customize scope`. |
| `icon_url` | String | Optional | Customize bot avatar by providing avatar URL. Remember to authorize `chat:write.customize scope`. |

## Limitations

Action has dozens of known limitations:

- This action MUST be used only in release pipelines - workflows triggered when tag has been
  created.

## Contributing

When you have made some changes to this action, you MUST provide a transpiled JavaScript file. For
this purpose, the `package.json` includes a `build` script, which takes care of transpiling
TypeScript and generating a single file as an output must be pushed within this repository.

```shell
npm run build
```
