import * as core from '@actions/core';
import { context } from '@actions/github'
import simpleGit, { SimpleGit } from 'simple-git';
import { extractTag } from "./utils";

const git: SimpleGit = simpleGit();

async function getPreviousTagOrCommit(currentTag: string) {
    core.info("Fetching tags");
    await git.fetch({"--tags": null});

    const tags = await git.tags(['[0-9]*.[0-9]*','--sort=-creatordate']);

    const previousTags = tags.all.filter(t => t !== currentTag);
    if (previousTags.length > 0) {
        return previousTags[0];
    }

    core.info("Did not find any previous tag, getting first commit instead");
    return git.revparse("HEAD", {"--max-parents": 0});
}

async function getDiffMessages(currentTag: string, previousTag: string): Promise<string[]> {
    const logs = await git.log({from: previousTag, to: currentTag, format: { message: "%s"}, symmetric: false});
    return logs.all.map(m => m.message) as (string[]);
}

export async function getCommitMessages(): Promise<string[]> {
    core.startGroup("Fetching git informations");

    const currentTag = extractTag(context.ref);
    const previousTag = await getPreviousTagOrCommit(currentTag);

    core.info(`Fetching commit messages between ${previousTag} and ${currentTag}`);
    const messages = await getDiffMessages(currentTag, previousTag);
    
    core.endGroup();
    return messages;
}
