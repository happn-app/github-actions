import {setOutput} from '@actions/core'

export function setChangeLog(changelog: string) {
    setOutput("changelog", changelog);
}

export function setChangeLogSlack(changelog: string) {
    setOutput("changelog_slack", changelog);
}

export function setChangeLogMd(changelog: string) {
    setOutput("changelog_md", changelog);
}
