import { getInput } from '@actions/core'

const Channel = 'channel'
const ThreadTimestamp = 'thread_ts'
const ReleaseBody = 'release_body'
const Username = 'username'
const IconEmoji = 'icon_emoji'
const IconURL = 'icon_url'
const TagName = 'tag_name'
const Message = 'message'

export function parseInputs() {
  return {
    channel: getInput(Channel),
    threadTS: getInput(ThreadTimestamp),
    releaseBody: getInput(ReleaseBody),
    username: getInput(Username),
    iconEmoji: getInput(IconEmoji),
    iconURL: getInput(IconURL),
    message: getInput(Message),
    tagName: getInput(TagName),
  }
}

