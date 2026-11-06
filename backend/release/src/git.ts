import * as core from '@actions/core';
import { context } from '@actions/github'
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { extractTag, extractTagPrefix } from "./utils";
import { ActionConfig } from "./inputs";

const git: SimpleGit = simpleGit();

// The link closing the release notes.
export type ReleaseLink =
    // A compare between the previous tag and this one, outside a monorepo.
    | { kind: 'compare' }
    // In a monorepo, where a compare between two tags spans every service: the
    // history of the service, from the day of the previous tag, or all of it for
    // the first release.
    | { kind: 'history', path: string, since?: string }
    // Nothing to link: a first release outside a monorepo, or no commit in the service.
    | { kind: 'none' }

export interface GitCommitsResponse {
    // Undefined for the first release.
    from?: string,
    to: string,
    messages: string[],
    link: ReleaseLink
}

async function getPreviousTag(currentTag: string, config: ActionConfig): Promise<string | undefined> {
    core.info("Fetching tags");
    await git.fetch({"--tags": null});

    const prefix = extractTagPrefix(currentTag);
    const pattern = `${prefix}${config.tagPattern}`;
    const tags = await git.tags([pattern, '--sort=-creatordate']);

    const previousTags = tags.all.filter(t => t !== currentTag);
    if (previousTags.length > 0) {
        return previousTags[0];
    }

    core.info("Did not find any previous tag, the changelog starts from the first commit");
    return undefined;
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

async function getDiffMessages(currentTag: string, previousTag?: string, servicePath?: string): Promise<string[]> {
    // Using raw rather than git.log({file}) because the latter forces --follow,
    // which is meant for a single file and behaves inconsistently with a directory.
    const args = ['log', '--format=%s', previousTag ? `${previousTag}..${currentTag}` : currentTag];
    if (servicePath) {
        args.push('--', servicePath);
    }
    const output = await git.raw(args);
    return output.split('\n').filter(line => line.length > 0);
}

// The history page of a service can only be narrowed by day, read in UTC: it
// starts on the day of the previous tag, so it may show a few commits of the
// previous release.
async function getDay(ref: string): Promise<string> {
    const date = (await git.raw(['log', '-1', '--format=%cI', ref])).trim();
    return new Date(date).toISOString().slice(0, 10);
}

async function getLink(messages: string[], previousTag?: string, servicePath?: string): Promise<ReleaseLink> {
    if (!servicePath) {
        return previousTag ? { kind: 'compare' } : { kind: 'none' };
    }
    if (messages.length === 0) {
        return { kind: 'none' };
    }
    return { kind: 'history', path: servicePath, since: previousTag ? await getDay(previousTag) : undefined };
}

export async function getCommitMessages(config: ActionConfig): Promise<GitCommitsResponse> {
    core.startGroup("Fetching git informations");

    const currentTag = extractTag(context.ref);
    const previousTag = await getPreviousTag(currentTag, config);

    const servicePath = resolveServicePath(currentTag, config);
    if (servicePath) {
        core.info(`Scoping changelog to "${servicePath}"`);
    }

    core.info(`Fetching commit messages between ${previousTag ?? 'the first commit'} and ${currentTag}`);
    const messages = await getDiffMessages(currentTag, previousTag, servicePath);
    core.info(`Found ${messages.length} commits`);

    core.info(`Stripping ci skip tags`);
    const messagesStripped = messages.map(m => m.replace("[happn-ci-skip]", ""));

    const link = await getLink(messages, previousTag, servicePath);
    core.endGroup();

    return {
        from: previousTag,
        to: currentTag,
        messages: messagesStripped,
        link
    };
}
