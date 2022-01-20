import { setFailed } from '@actions/core'
import { context } from '@actions/github'
import type { Context } from '@actions/github/lib/context'
import { getCommitMessages } from './git'
import { extractTag } from './utils'
import { getSlackChangelog, sendSlackMessage } from './slack'
import { setChangeLog, setChangeLogMd, setChangeLogSlack } from "./outputs";
import { createRelease, getMdChangelog } from "./github";
import { parseInputs } from "./inputs";

async function run(ctx: Context): Promise<void> {
    let config = parseInputs();
    const messages = await getCommitMessages(config);

    setChangeLog(messages.join("\n"));

    const slackChangelog = getSlackChangelog(messages);
    setChangeLogSlack(slackChangelog);

    const mdChangelog = getMdChangelog(messages);
    setChangeLogMd(mdChangelog);

    const tagName = extractTag(ctx.ref);

    const release = await createRelease(config, tagName, mdChangelog);

    sendSlackMessage(config, tagName, slackChangelog, release?.html_url);
}

run(context).catch(error => {
    setFailed(error.toString())
    if (process.env.GITHUB_ACTIONS == undefined) {
        console.error(error.stack)
    }
})
