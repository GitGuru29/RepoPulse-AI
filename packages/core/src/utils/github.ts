import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { InvalidRepoInputError } from '../errors';

export interface GitHubClientConfig {
    token?: string;
}

export class GitHubClient {
    public rest: Octokit;
    public graphql: typeof graphql;

    constructor(config?: GitHubClientConfig) {
        const auth = config?.token || process.env.GITHUB_TOKEN;

        this.rest = new Octokit({ auth });
        this.graphql = graphql.defaults({
            headers: {
                authorization: auth ? `token ${auth}` : '',
            },
        });
    }

    /**
     * Parses a raw GitHub URL or owner/repo string into owner and repo constituents
     */
    static parseRepoString(input: string): { owner: string; repo: string } {
        const trimmed = input?.trim();
        if (!trimmed) {
            throw new InvalidRepoInputError(input);
        }

        let cleanInput = trimmed
            .replace(/^(https?:\/\/)?github\.com\//i, '')
            .replace(/[#?].*$/, '')
            .replace(/\.git$/i, '')
            .replace(/\/+$/, '');

        const parts = cleanInput.split('/').filter(Boolean);
        if (parts.length !== 2) {
            throw new InvalidRepoInputError(input);
        }

        const [owner, repo] = parts;
        const segmentPattern = /^[A-Za-z0-9._-]+$/;
        if (!segmentPattern.test(owner) || !segmentPattern.test(repo)) {
            throw new InvalidRepoInputError(input);
        }

        return { owner, repo };
    }
}
