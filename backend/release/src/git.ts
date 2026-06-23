import * as core from '@actions/core';
import { context } from '@actions/github'
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { extractTag, extractTagPrefix } from "./utils";
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

    const prefix = extractTagPrefix(currentTag);
    const pattern = `${prefix}${config.tagPattern}`;
    const tags = await git.tags([pattern, '--sort=-creatordate']);

    const previousTags = tags.all.filter(t => t !== currentTag);
    if (previousTags.length > 0) {
        return previousTags[0];
    }

    core.info("Did not find any previous tag, getting first commit instead");
    return git.revparse("HEAD");
}

// In a monorepo, the tag prefix (e.g. "front-api-") maps to a service directory
// under config.servicesDir. We scope the changelog to that directory so commits
// from other services are not picked up. Returns undefined for unprefixed tags or
// when the directory is missing, so the changelog falls back to all commits.
function resolveServicePath(currentTag: string, config: ActionConfig): string | undefined {
    const service = extractTagPrefix(currentTag).replace(/-$/, '');
    if (!service) {
        return undefined;
    }

    const servicePath = `${config.servicesDir}/${service}`;
    if (!fs.existsSync(servicePath)) {
        core.warning(`Service directory "${servicePath}" not found, changelog will include commits from the whole repository`);
        return undefined;
    }

    return servicePath;
}

async function getDiffMessages(currentTag: string, previousTag: string, servicePath?: string): Promise<string[]> {
    // Using raw rather than git.log({file}) because the latter forces --follow,
    // which is meant for a single file and behaves inconsistently with a directory.
    const args = ['log', '--format=%s', `${previousTag}..${currentTag}`];
    if (servicePath) {
        args.push('--', servicePath);
    }
    const output = await git.raw(args);
    return output.split('\n').filter(line => line.length > 0);
}

export async function getCommitMessages(config: ActionConfig): Promise<GitCommitsResponse> {
    core.startGroup("Fetching git informations");

    const currentTag = extractTag(context.ref);
    const previousTag = await getPreviousTagOrCommit(currentTag, config);

    const servicePath = resolveServicePath(currentTag, config);
    if (servicePath) {
        core.info(`Scoping changelog to "${servicePath}"`);
    }

    core.info(`Fetching commit messages between ${previousTag} and ${currentTag}`);
    const messages = await getDiffMessages(currentTag, previousTag, servicePath);
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
