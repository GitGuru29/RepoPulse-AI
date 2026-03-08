import { RepoPulseAnalysisResult } from '../types';
export declare class RepoPulseAnalyzer {
    private client;
    constructor(optionsOrToken?: {
        token?: string;
        cacheTtlMs?: number;
        requestTimeoutMs?: number;
        retryCount?: number;
        retryDelayMs?: number;
        logger?: (level: 'debug' | 'info' | 'warn' | 'error', entry: Record<string, unknown>) => void;
    } | string);
    analyze(repoInput: string, ref?: string): Promise<RepoPulseAnalysisResult>;
    private fetchRepoStats;
    private fetchLanguages;
    private fetchContributors;
    private fetchPRHealth;
    private fetchIssueHealth;
    private calculateRisks;
    private calculateHealthScore;
    private generateRecommendations;
}
