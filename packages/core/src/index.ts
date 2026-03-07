import { RepoStats, LanguageBreakdown, ContributorActivity, PRHealth, IssueHealth, RiskSummary, RepoPulseAnalysisResult } from './types/index';
import { GitHubClient } from './utils/github';
import moment from 'moment';

export class RepoPulseAnalyzer {
    private client: GitHubClient;

    constructor(token?: string) {
        this.client = new GitHubClient({ token });
    }

    public async analyze(repoInput: string): Promise<RepoPulseAnalysisResult> {
        const { owner, repo } = GitHubClient.parseRepoString(repoInput);

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

    private async fetchRepoStats(owner: string, repo: string): Promise<RepoStats> {
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

    private async fetchLanguages(owner: string, repo: string): Promise<LanguageBreakdown> {
        const { data } = await this.client.rest.repos.listLanguages({ owner, repo });
        const breakdown: LanguageBreakdown = {};
        for (const [lang, bytes] of Object.entries(data)) {
            breakdown[lang] = { bytes, color: null }; // Would map colors in a real implementation
        }
        return breakdown;
    }

    private async fetchContributors(owner: string, repo: string): Promise<ContributorActivity> {
        try {
            // Get top 100 contributors
            const { data } = await this.client.rest.repos.listContributors({ owner, repo, per_page: 100 });

            let totalCommits = 0;
            const topContributors = [];

            for (const c of data) {
                const commits = c.contributions;
                totalCommits += commits;
                topContributors.push({ login: c.login || 'Unknown', commits });
            }

            return {
                totalCommits,
                activeContributors: data.length,
                topContributors: topContributors.slice(0, 5)
            };
        } catch {
            return { totalCommits: 0, activeContributors: 0, topContributors: [] };
        }
    }

    private async fetchPRHealth(owner: string, repo: string): Promise<PRHealth> {
        const thirtyDaysAgo = moment().subtract(30, 'days').toISOString();

        // Use GraphQL to efficiently get open, closed, and "stale" (updated before 30 days ago) PR counts
        const query = `
        query repositoryData($owner: String!, $repo: String!, $staleDate: String!) {
          repository(owner: $owner, name: $repo) {
            openPRs: pullRequests(states: OPEN) { totalCount }
            closedPRs: pullRequests(states: [CLOSED, MERGED]) { totalCount }
            stalePRs: pullRequests(states: OPEN, filterBy: { updatedBefore: $staleDate }) { totalCount }
          }
        }
        `;

        try {
            const data: any = await this.client.graphql(query, { owner, repo, staleDate: thirtyDaysAgo });
            const repoData = data.repository;

            return {
                openPRs: repoData.openPRs.totalCount,
                closedPRs: repoData.closedPRs.totalCount,
                abandonedPRs: repoData.stalePRs.totalCount,
                averageTimeToMergeDays: -1 // Stubbed for now, requires deep pagination 
            };
        } catch (e) {
            console.error("GraphQL PR Error: ", e);
            return { openPRs: 0, closedPRs: 0, abandonedPRs: 0, averageTimeToMergeDays: 0 };
        }
    }

    private async fetchIssueHealth(owner: string, repo: string): Promise<IssueHealth> {
        const thirtyDaysAgo = moment().subtract(30, 'days').toISOString();

        const query = `
        query repositoryData($owner: String!, $repo: String!, $staleDate: String!) {
          repository(owner: $owner, name: $repo) {
            openIssues: issues(states: OPEN) { totalCount }
            closedIssues: issues(states: CLOSED) { totalCount }
            staleIssues: issues(states: OPEN, filterBy: { updatedBefore: $staleDate }) { totalCount }
          }
        }
        `;

        try {
            const data: any = await this.client.graphql(query, { owner, repo, staleDate: thirtyDaysAgo });
            const repoData = data.repository;
            return {
                openIssues: repoData.openIssues.totalCount,
                closedIssues: repoData.closedIssues.totalCount,
                staleIssues: repoData.staleIssues.totalCount
            };
        } catch {
            return { openIssues: 0, closedIssues: 0, staleIssues: 0 };
        }
    }

    private calculateRisks(stats: RepoStats, contributors: ContributorActivity, prs: PRHealth, issues: IssueHealth): RiskSummary {
        // Calculate bus factor: If the top contributor has > 60% of total commits AND there are few overall contributors.
        let busFactorRisk = false;
        if (contributors.topContributors.length > 0 && contributors.totalCommits > 0) {
            const topPercent = (contributors.topContributors[0].commits / contributors.totalCommits) * 100;
            if (topPercent > 60 && contributors.activeContributors < 5) busFactorRisk = true;
        }

        const lastUpdated = moment(stats.updatedAt);
        const staleCodeRisk = moment().diff(lastUpdated, 'months') > 6;

        return {
            dependencyRiskScore: 50, // Future feature
            busFactorRisk,
            staleCodeRisk,
            documentationRisk: !stats.description
        };
    }

    private calculateHealthScore(stats: RepoStats, contributors: ContributorActivity, prs: PRHealth, issues: IssueHealth, risks: RiskSummary): number {
        let score = 100;
        if (risks.busFactorRisk) score -= 20;
        if (risks.documentationRisk) score -= 10;
        if (prs.abandonedPRs > 10) score -= 15;
        if (issues.staleIssues > 20) score -= 15;
        return Math.max(0, score);
    }

    private generateRecommendations(score: number, risks: RiskSummary, prs: PRHealth, issues: IssueHealth): string[] {
        const recs: string[] = [];
        if (risks.busFactorRisk) recs.push("High Bus Factor: Encourage more developers to contribute to bus-critical areas.");
        if (risks.documentationRisk) recs.push("Documentation Risk: Add a comprehensive README and description.");
        if (prs.abandonedPRs > 0) recs.push(`Clean up ${prs.abandonedPRs} abandoned Pull Requests.`);
        if (issues.staleIssues > 0) recs.push(`Triage ${issues.staleIssues} stale issues.`);
        if (recs.length === 0) recs.push("Repository is in great health!");
        return recs;
    }
}
