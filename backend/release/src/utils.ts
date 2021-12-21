import { context } from "@actions/github";

export function extractTag(ref: string): string {
    if (!ref || !ref.startsWith('refs/tags/')) {
        throw new Error('provided ref is empty or not provided at all')
    }
    if (ref.startsWith('refs/tags/')) {
        return ref.replace('refs/tags/', '')
    }
    return ref
}

export function getJiraUrl(jiraKey: string): string {
    return `https://happnapp.atlassian.net/browse/${jiraKey}`;
}

export function getCveUrl(cveKey: string): string {
    return `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cveKey}`;
}


export function getPRUrl(prId: string): string {
    const githubUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const githubRepository = process.env.GITHUB_REPOSITORY || `${context.repo.owner}/${context.repo.repo}`;
    return `${githubUrl}/${githubRepository}/pull/${prId}`;
}


export function makeChunks(body: string, size: number) {
    let chunks = []

    if (body.length < size) {
        return [body]
    }

    const lines = body.split('\n')
    let chunk: string[] = []
    let chunkSize = 0
    lines.forEach((line) => {
        if (chunkSize + line.length >= size) {
            chunks.push(chunk.join('\n'))

            chunk = []
            chunkSize = 0
        }

        chunk.push(line)
        chunkSize += line.length + '\n'.length
    })
    if (chunk.length > 0) {
        chunks.push(chunk.join('\n'))
    }

    return chunks
}
