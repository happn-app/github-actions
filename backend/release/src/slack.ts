import { IncomingWebhook } from '@slack/webhook'
import { getJiraUrl, getPRUrl } from "./utils";
import { endGroup, info, startGroup } from "@actions/core";
import { IncomingWebhookSendArguments } from "@slack/webhook/dist/IncomingWebhook";
import { ActionConfig } from "./inputs";
import { context } from "@actions/github";

// @ts-ignore
const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

export function getSlackChangelog(messages: string[]): string {
    const replaceJira = (text: string): string =>
        text.replace(
            /([A-Z]+-[0-9]+)/g,
            `<${getJiraUrl("$1")}|$1>`
        )
    const replaceGithubPr = (text: string): string =>
        text.replace(
            /#([0-9]+)/g,
            `<${getPRUrl("$1")}|#$1>`
        )
    return messages
        .map(m => '• ' + m)
        .map(replaceJira)
        .map(replaceGithubPr)
        .join("\n");
}

function getUsername(config: ActionConfig) {
    return config.slack.username || `${context.actor} (Bot)`;
}

function getIconUrl(config: ActionConfig) {
    return config.slack.iconURL || `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${context.actor}.png`;
}

function getBody(tagName: string, changeLog: string, releaseUrl: string | undefined) {
    const releaseName = releaseUrl ? `<${releaseUrl}|${tagName}>` : tagName;
    return `*${context.repo.repo} ${releaseName}* 
    ${changeLog}
    `;
}

function getSlackMessage(config: ActionConfig, tagName: string, changeLog: string, releaseUrl: string | undefined): IncomingWebhookSendArguments {
    return {
        channel: config.slack.channel,
        username: getUsername(config),
        icon_url: getIconUrl(config),
        icon_emoji: config.slack.iconEmoji,
        text: getBody(tagName, changeLog, releaseUrl)
    }
}

export async function sendSlackMessage(config: ActionConfig, tagName: string, changeLog: string, releaseUrl?: string) {
    if (!config.slack.enabled) {
        info("Slack disabled");
        return;
    }
    startGroup("💌 Sending Slack message");
    const message = getSlackMessage(config, tagName, changeLog, releaseUrl);

    if (config.dryRun) {
        info(`[DRYRUN] Send slack message:
    ${JSON.stringify(message, null, 2)}
    `);
        return;
    }

    const result = await webhook.send(message);
    endGroup()
    return result;
}
