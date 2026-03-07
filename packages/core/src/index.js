"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoPulseAnalyzer = void 0;
const github_1 = require("../utils/github");
class RepoPulseAnalyzer {
    client;
    constructor(token) {
        this.client = new github_1.GitHubClient({ token });
    }
    async analyze(repoInput) {
        const { owner, repo } = github_1.GitHubClient.parseRepoString(repoInput);
        // Fetch all required data concurrently
        const [stats, languages, contributors, pullRequests, issues] = await Promise.all([
            this.fetchRepoStats(owner, repo),
            this.fetchLanguages(owner, repo),
            this.fetchContributors(owner, repo),
            this.fetchPRHealth(owner, repo),
            this.fetchIssueHealth(owner, repo)
        ]);
        const risks = this.calculateRisks(stats, contributors, pullRequests, issues);
        const healthScore = this.calculateHealthScore(stats, contributors, pullRequests, issues, risks);
        const recommendations = this.generateRecommendations(healthScore, risks, pullRequests, issues);
        return {
            stats,
            languages,
            contributors,
            pullRequests,
            issues,
            risks,
            healthScore,
            recommendations
        };
    }
    async fetchRepoStats(owner, repo) {
        const { data } = await this.client.rest.repos.get({ owner, repo });
        return {
            owner: data.owner.login,
            repo: data.name,
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            watchers: data.watchers_count,
            openIssues: data.open_issues_count,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }
    async fetchLanguages(owner, repo) {
        const { data } = await this.client.rest.repos.listLanguages({ owner, repo });
        const breakdown = {};
        for (const [lang, bytes] of Object.entries(data)) {
            breakdown[lang] = { bytes, color: null }; // Would map colors in a real implementation
        }
        return breakdown;
    }
    // Stubs for future implementation
    async fetchContributors(owner, repo) {
        return { totalCommits: 0, activeContributors: 0, topContributors: [] };
    }
    async fetchPRHealth(owner, repo) {
        return { openPRs: 0, closedPRs: 0, abandonedPRs: 0, averageTimeToMergeDays: 0 };
    }
    async fetchIssueHealth(owner, repo) {
        return { openIssues: 0, closedIssues: 0, staleIssues: 0 };
    }
    calculateRisks(stats, contributors, prs, issues) {
        return {
            dependencyRiskScore: 50, // Stub
            busFactorRisk: contributors.activeContributors < 2,
            staleCodeRisk: false, // Would check last commit date
            documentationRisk: !stats.description
        };
    }
    calculateHealthScore(stats, contributors, prs, issues, risks) {
        let score = 100;
        if (risks.busFactorRisk)
            score -= 20;
        if (risks.documentationRisk)
            score -= 10;
        if (prs.abandonedPRs > 10)
            score -= 15;
        if (issues.staleIssues > 20)
            score -= 15;
        return Math.max(0, score);
    }
    generateRecommendations(score, risks, prs, issues) {
        const recs = [];
        if (risks.busFactorRisk)
            recs.push("High Bus Factor: Encourage more developers to contribute to bus-critical areas.");
        if (risks.documentationRisk)
            recs.push("Documentation Risk: Add a comprehensive README and description.");
        if (prs.abandonedPRs > 0)
            recs.push(`Clean up ${prs.abandonedPRs} abandoned Pull Requests.`);
        if (issues.staleIssues > 0)
            recs.push(`Triage ${issues.staleIssues} stale issues.`);
        if (recs.length === 0)
            recs.push("Repository is in great health!");
        return recs;
    }
}
exports.RepoPulseAnalyzer = RepoPulseAnalyzer;
