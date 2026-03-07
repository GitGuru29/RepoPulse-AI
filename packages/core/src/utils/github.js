"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubClient = void 0;
const rest_1 = require("@octokit/rest");
const graphql_1 = require("@octokit/graphql");
class GitHubClient {
    rest;
    graphql;
    constructor(config) {
        const auth = config?.token || process.env.GITHUB_TOKEN;
        this.rest = new rest_1.Octokit({ auth });
        this.graphql = graphql_1.graphql.defaults({
            headers: {
                authorization: auth ? `token ${auth}` : '',
            },
        });
    }
    /**
     * Parses a raw GitHub URL or owner/repo string into owner and repo constituents
     */
    static parseRepoString(input) {
        let cleanInput = input.replace(/^(https?:\/\/)?github\.com\//, '');
        cleanInput = cleanInput.replace(/\.git$/, '');
        const parts = cleanInput.split('/');
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
        throw new Error(`Invalid repository format: ${input}. Expected owner/repo or a GitHub URL.`);
    }
}
exports.GitHubClient = GitHubClient;
