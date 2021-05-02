## About

GitHub action can be used to inform about the state of workflow by publishing a message.

This action will publish a message to dedicated channel (or a thread). It might also add or remove a
reaction to decorate a message with an emoji as a representation of workflow state.

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

```yaml
jobs:
  release:
    steps:
      - name: Notify workflow status
        uses: happn-tech/github-actions/slack/workflow-status@master
        env:
           SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
           status: ${{ job.status }}
           channel: testing
           username: release-bot
           icon_emoji: rocket
           message: "*Hello App* {{sha}}\n\n{{commit}}"
           message_cancel: 'Workflow has been cancelled :coffin:'
           message_success: 'Workflow has passed successfully :tada:'
           message_failure: 'Workflow has failed :cry:'
           reaction_failure: skull_and_crossbones
           reaction_cancel: hand
           reaction_running: loading
           reaction_success: white_check_mark
```

## Customizing

### Parameters

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `channel` | String | Mandatory | Name of a slack channel (ex: general) or a channel identifier when sending in thread. |
| `status` | String | Mandatory | Status of the workflow job. Please use `${{ job.status }}` in place of a parameter value. |
| `tag_name` | String | Optional | Name of the tag (ex: 1.1.0). Useful, whether workflow is responsible for creating a release. |
| `message` | String | Optional | Text of a message that will be published to `channel`. |
| `message_success` | String | Optional | Text of a reply that will be published in thread, whether workflow will succeed. |
| `message_cancel` | String | Optional | Text of a reply that will be published in thread, whether workflow will be cancelled. |
| `message_failure` | String | Optional | Text of a reply that will be published in thread, whether workflow will fail. |
| `reaction_running` | String | Optional | Name of emoji (without semicolons) that will be used for a reaction, informing workflow is still running. |
| `reaction_success` | String | Optional | Name of emoji (without semicolons) that will be used for a reaction, informing workflow has succeeded. |
| `reaction_failure` | String | Optional | Name of emoji (without semicolons) that will be used for a reaction, informing workflow has failed. |
| `reaction_cancel` | String | Optional | Name of emoji (without semicolons) that will be used for a reaction, informing workflow has been cancelled. |
| `username` | String | Optional | Customize the name of the bot - sender of a message. Remember to authorize `chat:write.customize scope`. |
| `icon_emoji` | String | Optional | Customize an avatar by using an emoji. Remember to authorize `chat:write.customize scope`. |
| `icon_url` | String | Optional | Customize bot avatar by providing an URL to image. Remember to authorize `chat:write.customize scope`. |

## Contributing

When you have made some changes to this action, you MUST provide a transpiled JavaScript file. For
this purpose, the `package.json` includes a `build` script, which takes care of transpiling
TypeScript and generating a single file as an output must be pushed within this repository.

```shell
npm run build
```
