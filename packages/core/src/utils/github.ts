import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

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
        let cleanInput = input.replace(/^(https?:\/\/)?github\.com\//, '');
        cleanInput = cleanInput.replace(/\.git$/, '');
        const parts = cleanInput.split('/');
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
        throw new Error(`Invalid repository format: ${input}. Expected owner/repo or a GitHub URL.`);
    }
}
