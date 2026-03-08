export interface RepoStats {
    owner: string;
    repo: string;
    description: string | null;
    visibility: string;
    defaultBranch: string;
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
    topContributors: Array<{
        login: string;
        commits: number;
    }>;
}
export interface PRHealth {
    openPRs: number;
    closedPRs: number;
    abandonedPRs: number;
    averageTimeToMergeDays: number;
}
export interface IssueHealth {
    openIssues: number;
    closedIssues: number;
    staleIssues: number;
}
export interface RiskSummary {
    dependencyRiskScore: number;
    busFactorRisk: boolean;
    staleCodeRisk: boolean;
    documentationRisk: boolean;
}
export interface ArchitectureInsights {
    projectStructureQuality: "strong" | "moderate" | "weak";
    detectedFramework: string;
    missingTests: boolean;
    largeFiles: string[];
    godModules: string[];
    ciCdPresent: boolean;
    docsPresent: boolean;
    possibleDeadCodeZones: string[];
}
export interface RepoPulseAnalysisResult {
    stats: RepoStats;
    languages: LanguageBreakdown;
    contributors: ContributorActivity;
    pullRequests: PRHealth;
    issues: IssueHealth;
    risks: RiskSummary;
    architecture: ArchitectureInsights;
    healthScore: number;
    recommendations: string[];
}
