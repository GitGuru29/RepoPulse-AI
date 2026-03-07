import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
export interface GitHubClientConfig {
    token?: string;
}
export declare class GitHubClient {
    rest: Octokit;
    graphql: typeof graphql;
    constructor(config?: GitHubClientConfig);
    /**
     * Parses a raw GitHub URL or owner/repo string into owner and repo constituents
     */
    static parseRepoString(input: string): {
        owner: string;
        repo: string;
    };
}
