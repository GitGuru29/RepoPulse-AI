export interface RepoStats {
    owner: string;
    repo: string;
    description: string | null;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    createdAt: string;
    updatedAt: string;
}

export interface LanguageBreakdown {
    [language: string]: {
        bytes: number;
        color: string | null;
    };
}

export interface ContributorActivity {
    totalCommits: number;
    activeContributors: number;
    topContributors: Array<{ login: string; commits: number }>;
}

export interface PRHealth {
    openPRs: number;
    closedPRs: number;
    abandonedPRs: number; // Stale open PRs
    averageTimeToMergeDays: number;
}

export interface IssueHealth {
    openIssues: number;
    closedIssues: number;
    staleIssues: number;
}

export interface RiskSummary {
    dependencyRiskScore: number; // 0-100
    busFactorRisk: boolean; // Are most commits from 1-2 people?
    staleCodeRisk: boolean; // No commits in recent timeframe
    documentationRisk: boolean; // Missing README, etc
}

export interface RepoPulseAnalysisResult {
    stats: RepoStats;
    languages: LanguageBreakdown;
    contributors: ContributorActivity;
    pullRequests: PRHealth;
    issues: IssueHealth;
    risks: RiskSummary;
    healthScore: number; // 0-100 overall
    recommendations: string[];
}
