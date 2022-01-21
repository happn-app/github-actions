import { GitHub } from "@actions/github/lib/utils";
import { context, getOctokit } from "@actions/github";
import * as core from "@actions/core";
import { getDiffUrl, getJiraUrl, getPRUrl } from "./utils";
import { ActionConfig } from "./inputs";
import { GitCommitsResponse } from "./git";

type GitHub = InstanceType<typeof GitHub>;

export interface Release {
    id: number;
    html_url: string;
    tag_name: string;
    name: string | null;
    body?: string | null | undefined;
    target_commitish: string;
    draft: boolean;
    prerelease: boolean;
    assets: Array<{ id: number; name: string }>;
}

export interface Releaser {

    createRelease(params: {
        owner: string;
        repo: string;
        tag_name: string;
        name: string;
        body: string | undefined;
        draft: boolean | undefined;
        prerelease: boolean | undefined;
        target_commitish: string | undefined;
        discussion_category_name: string | undefined;
        generate_release_notes: boolean | undefined;
    }): Promise<{ data: Release }>;

}

class DryRunReleaser implements Releaser {
    createRelease(params: {
        owner: string;
        repo: string;
        tag_name: string;
        name: string;
        body: string | undefined;
        draft: boolean | undefined;
        prerelease: boolean | undefined;
        target_commitish: string | undefined;
        discussion_category_name: string | undefined;
        generate_release_notes: boolean | undefined;
    }): Promise<{ data: Release }> {
        core.info(`[DRYRUN] Create Release ${params.tag_name} on ${params.owner}/${params.repo} with params:
            ${JSON.stringify(params, null, 2)}
        `);
        return Promise.resolve({
            data: {
                id: 1,
                name: params.name,
                html_url: `http://happn.com/fake-release/${params.name}`,
                assets: [],
                target_commitish: params.target_commitish || "fakesha",
                draft: params.draft || false,
                prerelease: params.prerelease || false,
                tag_name: params.tag_name,
                body: params.body
            }
        });
    }
}

class GitHubReleaser implements Releaser {
    github: GitHub;

    constructor(github: GitHub) {
        this.github = github;
    }

    createRelease(params: {
        owner: string;
        repo: string;
        tag_name: string;
        name: string;
        body: string | undefined;
        draft: boolean | undefined;
        prerelease: boolean | undefined;
        target_commitish: string | undefined;
        discussion_category_name: string | undefined;
        generate_release_notes: boolean | undefined;
    }): Promise<{ data: Release }> {
        return this.github.rest.repos.createRelease(params);
    }
}

export function getMdChangelog(gitCommits: GitCommitsResponse): string {
    const replaceJira = (text: string): string =>
        text.replace(
            /([A-Z]+-[0-9]+(?![0-9-]))/g,
            `[$1](${getJiraUrl("$1")})`
        )

    const replaceGithubPr = (text: string): string =>
        text.replace(
            /#([0-9]+)/g,
            `[#$1](${getPRUrl("$1")})`
        )
     const commitMessages = gitCommits.messages
        .map(m => '-️ ' + m)
        .map(replaceJira)
        .map(replaceGithubPr)
        .join("\n");
    
    return `${commitMessages}\n[Compare ${gitCommits.from} and ${gitCommits.to}](${getDiffUrl(gitCommits.from, gitCommits.to)})`;
}

export async function createRelease(config: ActionConfig, tagName: string, changelog: string): Promise<Release | void> {
    if (!config.github.enabled) {
        core.info("Github release disabled");
        return;
    }
    core.startGroup("🚀 Create Github Release");
    const releaser = config.dryRun ? new DryRunReleaser()
        : new GitHubReleaser(getOctokit(process.env.GITHUB_TOKEN || "", {
            log: {
                error: core.error,
                info: core.info,
                warn: core.warning,
                debug: core.debug
            }
        }));
    const releaseData = await releaser.createRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        tag_name: tagName,
        name: tagName,
        body: changelog,
        draft: false,
        prerelease: false,
        generate_release_notes: false,
        discussion_category_name: undefined,
        target_commitish: undefined
    });
    core.info(`Created release ${tagName}`);

    core.endGroup();
    return releaseData.data;
}
