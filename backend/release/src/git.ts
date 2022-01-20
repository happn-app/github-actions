import * as core from '@actions/core';
import { context } from '@actions/github'
import simpleGit, { SimpleGit } from 'simple-git';
import { extractTag } from "./utils";
import { ActionConfig } from "./inputs";

const git: SimpleGit = simpleGit();

export interface GitCommitsResponse {
    from: string,
    to: string,
    messages: string[]
}

async function getPreviousTagOrCommit(currentTag: string, config: ActionConfig) {
    core.info("Fetching tags");
    await git.fetch({"--tags": null});

    const tags = await git.tags([config.tagPattern,'--sort=-creatordate']);

    const previousTags = tags.all.filter(t => t !== currentTag);
    if (previousTags.length > 0) {
        return previousTags[0];
    }

    core.info("Did not find any previous tag, getting first commit instead");
    return git.revparse("HEAD");
}

async function getDiffMessages(currentTag: string, previousTag: string): Promise<string[]> {
    const logs = await git.log({from: previousTag, to: currentTag, format: { message: "%s"}, symmetric: false});
    return logs.all.map(m => m.message) as (string[]);
}

export async function getCommitMessages(config: ActionConfig): Promise<GitCommitsResponse> {
    core.startGroup("Fetching git informations");

    const currentTag = extractTag(context.ref);
    const previousTag = await getPreviousTagOrCommit(currentTag, config);

    core.info(`Fetching commit messages between ${previousTag} and ${currentTag}`);
    const messages = await getDiffMessages(currentTag, previousTag);
    core.info(`Found ${messages.length} commits`);

    core.info(`Stripping ci skip tags`);
    const messagesStripped = messages.map(m => m.replace("[happn-ci-skip]", ""));
    core.endGroup();

    return {
        from: previousTag,
        to: currentTag,
        messages: messagesStripped
    };
}
