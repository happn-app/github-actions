import { getInput } from '@actions/core'

const inputDryRun = 'dry_run'
const inputEnableGhRelease = 'enable_github_release'
const inputEnableSlack = 'enable_slack_message'
const inputTagPattern = 'tag_pattern'
const inputChannel = 'channel'
const inputUsername = 'username'
const inputIconEmoji = 'icon_emoji'
const inputIconURL = 'icon_url'

function getString(key: string, defaultValue?: string): string | undefined {
    const input = getInput(key);
    if (input.length == 0) {
        return defaultValue;
    }
    return input;
}

function getBoolean(key: string, defaultValue: boolean): boolean {
    const input = getInput(key);
    if (input.length == 0) {
        return defaultValue;
    }
    return input === 'true';
}

export interface ActionConfig {
    dryRun: boolean,
    tagPattern: string,
    github: {
        enabled: boolean
    },
    slack: {
        enabled: boolean
        channel: string
        username?: string | undefined
        iconEmoji?: string | undefined
        iconURL?: string | undefined
    }
}


export function parseInputs(): ActionConfig {
    return {
        tagPattern: getString(inputTagPattern, "[0-9]*.[0-9]*") as string,
        dryRun: getBoolean(inputDryRun, false),
        github: {
            enabled: getBoolean(inputEnableGhRelease, true)
        },
        slack: {
            enabled: getBoolean(inputEnableSlack, true),
            channel: getString(inputChannel, "dev_back_ci") as string,
            username: getString(inputUsername),
            iconEmoji: getString(inputIconEmoji),
            iconURL: getString(inputIconURL),
        }
    }
}

