import { RepoPulseAnalysisResult } from '../types';
export declare class RepoPulseAnalyzer {
    private client;
    constructor(token?: string);
    analyze(repoInput: string): Promise<RepoPulseAnalysisResult>;
    private fetchRepoStats;
    private fetchLanguages;
    private fetchContributors;
    private fetchPRHealth;
    private fetchIssueHealth;
    private calculateRisks;
    private calculateHealthScore;
    private generateRecommendations;
}
