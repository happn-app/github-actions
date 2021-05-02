import { getState, saveState } from '@actions/core'

export function saveMessageState(channel: string, ts: string) {
  saveState('channel', channel)
  saveState('ts', ts)
}

export function getMessageState() {
  return {
    channel: getState('channel'),
    ts: getState('ts'),
  }
}
