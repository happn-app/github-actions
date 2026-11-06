import * as core from '@actions/core';
import { context } from '@actions/github'
import * as fs from 'fs';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { extractTag, extractTagPrefix } from "./utils";
import { ActionConfig } from "./inputs";

const git: SimpleGit = simpleGit();

export interface GitCommitsResponse {
    from: string,
    to: string,
    messages: string[],
    // Set in a monorepo, where a compare between two tags spans every service:
    // null when the release has no commit in the service, so nothing to link.
    history?: ServiceHistory | null
}

export interface ServiceHistory {
    path: string,
    since?: string
}

async function getPreviousTagOrCommit(currentTag: string, config: ActionConfig) {
    core.info("Fetching tags");
    await git.fetch({"--tags": null});

    const prefix = extractTagPrefix(currentTag);
    const pattern = `${prefix}${config.tagPattern}`;
    const tags = await git.tags([pattern, '--sort=-creatordate']);

    const previousTags = tags.all.filter(t => t !== currentTag);
    if (previousTags.length > 0) {
        return { ref: previousTags[0], isTag: true };
    }

    core.info("Did not find any previous tag, getting first commit instead");
    return { ref: await git.revparse("HEAD"), isTag: false };
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

    // Relative to the repository root (the working directory), as it also ends up in a URL:
    // `./services/` or `${{ github.workspace }}/services` must give `services/<service>`.
    const servicePath = path.relative(process.cwd(), path.resolve(config.servicesDir, service))
        .split(path.sep).join('/');
    if (!fs.existsSync(servicePath)) {
        core.warning(`Service directory "${servicePath}" not found, changelog will include commits from the whole repository`);
        return undefined;
    }

    return servicePath;
}

interface Commit {
    date: string,
    subject: string
}

async function getDiffCommits(currentTag: string, previousTag: string, servicePath?: string): Promise<Commit[]> {
    // Using raw rather than git.log({file}) because the latter forces --follow,
    // which is meant for a single file and behaves inconsistently with a directory.
    const args = ['log', '--format=%cI%x09%s', `${previousTag}..${currentTag}`];
    if (servicePath) {
        args.push('--', servicePath);
    }
    const output = await git.raw(args);
    return output.split('\n')
        .filter(line => line.length > 0)
        .map(line => {
            const separator = line.indexOf('\t');
            return { date: line.slice(0, separator), subject: line.slice(separator + 1) };
        });
}

const utcDay = (isoDate: string): string => new Date(isoDate).toISOString().slice(0, 10);

// The service's history page can only be narrowed by day, read in UTC: start on
// the day of the earliest service commit of the release, so none is hidden even
// when commit dates are out of order. That day may show a few commits of the
// previous release.
function getHistorySince(commits: Commit[]): string {
    return commits.map(c => utcDay(c.date)).reduce((a, b) => (a < b ? a : b));
}

export async function getCommitMessages(config: ActionConfig): Promise<GitCommitsResponse> {
    core.startGroup("Fetching git informations");

    const currentTag = extractTag(context.ref);
    const previous = await getPreviousTagOrCommit(currentTag, config);
    const previousTag = previous.ref;

    const servicePath = resolveServicePath(currentTag, config);
    if (servicePath) {
        core.info(`Scoping changelog to "${servicePath}"`);
    }

    core.info(`Fetching commit messages between ${previousTag} and ${currentTag}`);
    const commits = await getDiffCommits(currentTag, previousTag, servicePath);
    core.info(`Found ${commits.length} commits`);

    core.info(`Stripping ci skip tags`);
    const messagesStripped = commits.map(c => c.subject.replace("[happn-ci-skip]", ""));

    // A release without any service commit gets no link at all. The first release
    // of a service has no previous tag: its whole history is the release.
    const history = servicePath
        ? (commits.length > 0 ? { path: servicePath, since: previous.isTag ? getHistorySince(commits) : undefined } : null)
        : undefined;
    core.endGroup();

    return {
        from: previousTag,
        to: currentTag,
        messages: messagesStripped,
        history
    };
}
