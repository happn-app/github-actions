import { getInput } from '@actions/core'

export const Channel = 'channel'
export const IconEmoji = 'icon_emoji'
export const IconURL = 'icon_url'
export const Message = 'message'
export const MessageCancel = 'message_cancel'
export const MessageFailure = 'message_failure'
export const MessageSuccess = 'message_success'
export const ReactionCancel = 'reaction_cancel'
export const ReactionFailure = 'reaction_failure'
export const ReactionRunning = 'reaction_running'
export const ReactionSuccess = 'reaction_success'
export const Status = 'status'
export const TagName = 'tag_name'
export const Username = 'username'

export function parseInputs() {
  return {
    channel: getInput(Channel),
    iconEmoji: getInput(IconEmoji),
    iconURL: getInput(IconURL),
    message: getInput(Message),
    messageCancel: getInput(MessageCancel),
    messageFailure: getInput(MessageFailure),
    messageSuccess: getInput(MessageSuccess),
    reactionCancel: getInput(ReactionCancel),
    reactionFailure: getInput(ReactionFailure),
    reactionRunning: getInput(ReactionRunning),
    reactionSuccess: getInput(ReactionSuccess),
    status: getInput(Status),
    tagName: getInput(TagName),
    username: getInput(Username),
  }
}

