import { endGroup, info, startGroup, } from '@actions/core';
import { context } from '@actions/github'
import simpleGit, { SimpleGit } from 'simple-git';
import { extractTag } from "./utils";

const git: SimpleGit = simpleGit();

async function getPreviousTagOrCommit(currentTag: string) {
    info("Fetching tags");
    await git.fetch({"--tags": null});

    const tags = await git.tags({
        "--sort": '-creatordate',
        '-l': '[0-9]*.[0-9]*',
    });

    const previousTags = tags.all.filter(t => t !== currentTag);
    if (previousTags.length > 0) {
        return previousTags[0];
    }

    info("Did not find any previous tag, getting first commit instead");
    return git.revparse("HEAD", {"--max-parents": 0});
}

async function getDiffMessages(currentTag: string, previousTag: string): Promise<string[]> {
    const logs = await git.log({from: previousTag, to: currentTag, format: "%s"});
    return logs.all as (string[]);
}

export async function getCommitMessages(): Promise<string[]> {
    startGroup("Fetching git informations");

    const currentTag = extractTag(context.ref);
    const previousTag = await getPreviousTagOrCommit(currentTag);

    info(`Fetching commit messages between ${previousTag} and ${currentTag}`);
    const messages = await getDiffMessages(currentTag, previousTag);
    
    endGroup();
    return messages;
}
