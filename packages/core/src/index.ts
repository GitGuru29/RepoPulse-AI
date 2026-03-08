import { RepoStats, LanguageBreakdown, ContributorActivity, PRHealth, IssueHealth, RiskSummary, RepoPulseAnalysisResult } from './types/index';
import { GitHubClient } from './utils/github';
import { AnalysisError, GitHubApiError } from './errors';
import moment from 'moment';

interface PullRequestHealthQueryResult {
    repository: {
        openPRs: { totalCount: number };
        closedPRs: { totalCount: number };
        stalePRs: { totalCount: number };
        mergedPRs: {
            nodes: Array<{
                createdAt: string;
                mergedAt: string | null;
            } | null>;
        };
    } | null;
}

interface IssueHealthQueryResult {
    repository: {
        openIssues: { totalCount: number };
        closedIssues: { totalCount: number };
        staleIssues: { totalCount: number };
    } | null;
}

interface DependencySignalsQueryResult {
    repository: {
        packageJson: { __typename: string } | null;
        packageLock: { __typename: string } | null;
        yarnLock: { __typename: string } | null;
        pnpmLock: { __typename: string } | null;
        requirementsTxt: { __typename: string } | null;
        pipfile: { __typename: string } | null;
        poetryLock: { __typename: string } | null;
        goMod: { __typename: string } | null;
        cargoToml: { __typename: string } | null;
        pomXml: { __typename: string } | null;
        gradleBuild: { __typename: string } | null;
        gemfile: { __typename: string } | null;
        composerJson: { __typename: string } | null;
        dependabotYml: { __typename: string } | null;
        dependabotYaml: { __typename: string } | null;
    } | null;
}

interface DependencySignals {
    hasLockfile: boolean;
    hasDependabotConfig: boolean;
    ecosystemCount: number;
    manifestCount: number;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    event: string;
    message: string;
    repo?: string;
    durationMs?: number;
    attempt?: number;
    maxAttempts?: number;
    code?: string;
    status?: number;
}

interface RepoPulseAnalyzerOptions {
    token?: string;
    cacheTtlMs?: number;
    requestTimeoutMs?: number;
    retryCount?: number;
    retryDelayMs?: number;
    logger?: (level: LogLevel, entry: LogEntry) => void;
}

export class RepoPulseAnalyzer {
    private static readonly analysisCache = new Map<string, { expiresAt: number; result: RepoPulseAnalysisResult }>();
    private static readonly DEFAULT_CACHE_TTL_MS = 120_000;
    private static readonly DEFAULT_REQUEST_TIMEOUT_MS = 12_000;
    private static readonly DEFAULT_RETRY_COUNT = 2;
    private static readonly DEFAULT_RETRY_DELAY_MS = 300;

    private client: GitHubClient;
    private cacheTtlMs: number;
    private requestTimeoutMs: number;
    private retryCount: number;
    private retryDelayMs: number;
    private logger?: (level: LogLevel, entry: LogEntry) => void;
    private hasAuthToken: boolean;

    constructor(optionsOrToken?: RepoPulseAnalyzerOptions | string) {
        const options: RepoPulseAnalyzerOptions =
            typeof optionsOrToken === 'string'
                ? { token: optionsOrToken }
                : (optionsOrToken || {});
        const resolvedToken = options.token || process.env.GITHUB_TOKEN;

        this.client = new GitHubClient({ token: options.token });
        this.cacheTtlMs = options.cacheTtlMs ?? RepoPulseAnalyzer.DEFAULT_CACHE_TTL_MS;
        this.requestTimeoutMs = options.requestTimeoutMs ?? RepoPulseAnalyzer.DEFAULT_REQUEST_TIMEOUT_MS;
        this.retryCount = options.retryCount ?? RepoPulseAnalyzer.DEFAULT_RETRY_COUNT;
        this.retryDelayMs = options.retryDelayMs ?? RepoPulseAnalyzer.DEFAULT_RETRY_DELAY_MS;
        this.logger = options.logger;
        this.hasAuthToken = Boolean(resolvedToken && resolvedToken.trim());
    }

    public async analyze(repoInput: string): Promise<RepoPulseAnalysisResult> {
        const startedAt = Date.now();
        try {
            const { owner, repo } = GitHubClient.parseRepoString(repoInput);
            const repoKey = `${owner}/${repo}`.toLowerCase();
            const cachedResult = this.getCachedResult(repoKey);
            if (cachedResult) {
                this.log('info', {
                    event: 'analysis.cache_hit',
                    message: 'Returning cached analysis result.',
                    repo: repoKey,
                    durationMs: Date.now() - startedAt
                });
                return cachedResult;
            }

            // Fetch all required data concurrently
            const [stats, languages, contributors, pullRequests, issues, dependencySignals] = await Promise.all([
                this.fetchRepoStats(owner, repo),
                this.fetchLanguages(owner, repo),
                this.fetchContributors(owner, repo),
                this.fetchPRHealth(owner, repo),
                this.fetchIssueHealth(owner, repo),
                this.fetchDependencySignals(owner, repo)
            ]);

            const risks = this.calculateRisks(stats, contributors, pullRequests, issues, dependencySignals);
            const healthScore = this.calculateHealthScore(stats, contributors, pullRequests, issues, risks);
            const recommendations = this.generateRecommendations(healthScore, risks, pullRequests, issues);

            const result: RepoPulseAnalysisResult = {
                stats,
                languages,
                contributors,
                pullRequests,
                issues,
                risks,
                healthScore,
                recommendations
            };
            this.setCachedResult(repoKey, result);
            this.log('info', {
                event: 'analysis.success',
                message: 'Repository analysis completed successfully.',
                repo: repoKey,
                durationMs: Date.now() - startedAt
            });
            return result;
        } catch (error: unknown) {
            this.log('error', {
                event: 'analysis.failure',
                message: 'Repository analysis failed.',
                durationMs: Date.now() - startedAt,
                code: (error as { code?: string })?.code,
                status: (error as { status?: number })?.status
            });
            if (error instanceof AnalysisError || error instanceof GitHubApiError) {
                throw error;
            }
            throw new AnalysisError('Failed to analyze repository.', error);
        }
    }

    private async fetchRepoStats(owner: string, repo: string): Promise<RepoStats> {
        try {
            const { data } = await this.executeGitHubCall(
                `repos.get:${owner}/${repo}`,
                () => this.client.rest.repos.get({ owner, repo })
            );
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
        } catch (error: unknown) {
            throw this.toGitHubApiError(error, `Failed to fetch repository stats for ${owner}/${repo}`);
        }
    }

    private async fetchLanguages(owner: string, repo: string): Promise<LanguageBreakdown> {
        try {
            const { data } = await this.executeGitHubCall(
                `repos.listLanguages:${owner}/${repo}`,
                () => this.client.rest.repos.listLanguages({ owner, repo })
            );
            const breakdown: LanguageBreakdown = {};
            for (const [lang, bytes] of Object.entries(data)) {
                breakdown[lang] = { bytes, color: null };
            }
            return breakdown;
        } catch (error: unknown) {
            throw this.toGitHubApiError(error, `Failed to fetch language data for ${owner}/${repo}`);
        }
    }

    private async fetchContributors(owner: string, repo: string): Promise<ContributorActivity> {
        try {
            // Get top 100 contributors
            const { data } = await this.executeGitHubCall(
                `repos.listContributors:${owner}/${repo}`,
                () => this.client.rest.repos.listContributors({ owner, repo, per_page: 100 })
            );

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

        const query = `
        query pullRequestHealth($owner: String!, $repo: String!, $staleDate: DateTime!) {
          repository(owner: $owner, name: $repo) {
            openPRs: pullRequests(states: OPEN) { totalCount }
            closedPRs: pullRequests(states: [CLOSED, MERGED]) { totalCount }
            stalePRs: pullRequests(states: OPEN, filterBy: { updatedBefore: $staleDate }) { totalCount }
            mergedPRs: pullRequests(
              states: MERGED,
              first: 50,
              orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
              nodes {
                createdAt
                mergedAt
              }
            }
          }
        }
        `;

        try {
            const data = await this.executeGitHubCall(
                `graphql.pullRequestHealth:${owner}/${repo}`,
                () => this.client.graphql<PullRequestHealthQueryResult>(query, { owner, repo, staleDate: thirtyDaysAgo })
            );
            const repoData = data.repository;
            if (!repoData) {
                throw new Error('Repository not found.');
            }

            const mergedDurations = repoData.mergedPRs.nodes
                .filter((node): node is { createdAt: string; mergedAt: string } => !!node?.mergedAt)
                .map((node) => moment(node.mergedAt).diff(moment(node.createdAt), 'days', true));

            const averageTimeToMergeDays = mergedDurations.length > 0
                ? Number((mergedDurations.reduce((sum, value) => sum + value, 0) / mergedDurations.length).toFixed(2))
                : 0;

            return {
                openPRs: repoData.openPRs.totalCount,
                closedPRs: repoData.closedPRs.totalCount,
                abandonedPRs: repoData.stalePRs.totalCount,
                averageTimeToMergeDays
            };
        } catch (error: unknown) {
            if (this.shouldUseUnauthenticatedFallback(error)) {
                this.log('warn', {
                    event: 'analysis.public_fallback',
                    message: 'GraphQL auth unavailable; using REST fallback for pull request health.'
                });
                return this.fetchPRHealthRest(owner, repo);
            }
            throw this.toGitHubApiError(error, `Failed to fetch pull request health for ${owner}/${repo}`);
        }
    }

    private async fetchIssueHealth(owner: string, repo: string): Promise<IssueHealth> {
        const thirtyDaysAgo = moment().subtract(30, 'days').toISOString();

        const query = `
        query issueHealth($owner: String!, $repo: String!, $staleDate: DateTime!) {
          repository(owner: $owner, name: $repo) {
            openIssues: issues(states: OPEN) { totalCount }
            closedIssues: issues(states: CLOSED) { totalCount }
            staleIssues: issues(states: OPEN, filterBy: { updatedBefore: $staleDate }) { totalCount }
          }
        }
        `;

        try {
            const data = await this.executeGitHubCall(
                `graphql.issueHealth:${owner}/${repo}`,
                () => this.client.graphql<IssueHealthQueryResult>(query, { owner, repo, staleDate: thirtyDaysAgo })
            );
            const repoData = data.repository;
            if (!repoData) {
                throw new Error('Repository not found.');
            }
            return {
                openIssues: repoData.openIssues.totalCount,
                closedIssues: repoData.closedIssues.totalCount,
                staleIssues: repoData.staleIssues.totalCount
            };
        } catch (error: unknown) {
            if (this.shouldUseUnauthenticatedFallback(error)) {
                this.log('warn', {
                    event: 'analysis.public_fallback',
                    message: 'GraphQL auth unavailable; using REST fallback for issue health.'
                });
                return this.fetchIssueHealthRest(owner, repo);
            }
            throw this.toGitHubApiError(error, `Failed to fetch issue health for ${owner}/${repo}`);
        }
    }

    private async fetchDependencySignals(owner: string, repo: string): Promise<DependencySignals> {
        const query = `
        query dependencySignals($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            packageJson: object(expression: "HEAD:package.json") { __typename }
            packageLock: object(expression: "HEAD:package-lock.json") { __typename }
            yarnLock: object(expression: "HEAD:yarn.lock") { __typename }
            pnpmLock: object(expression: "HEAD:pnpm-lock.yaml") { __typename }
            requirementsTxt: object(expression: "HEAD:requirements.txt") { __typename }
            pipfile: object(expression: "HEAD:Pipfile") { __typename }
            poetryLock: object(expression: "HEAD:poetry.lock") { __typename }
            goMod: object(expression: "HEAD:go.mod") { __typename }
            cargoToml: object(expression: "HEAD:Cargo.toml") { __typename }
            pomXml: object(expression: "HEAD:pom.xml") { __typename }
            gradleBuild: object(expression: "HEAD:build.gradle") { __typename }
            gemfile: object(expression: "HEAD:Gemfile") { __typename }
            composerJson: object(expression: "HEAD:composer.json") { __typename }
            dependabotYml: object(expression: "HEAD:.github/dependabot.yml") { __typename }
            dependabotYaml: object(expression: "HEAD:.github/dependabot.yaml") { __typename }
          }
        }
        `;

        try {
            const data = await this.executeGitHubCall(
                `graphql.dependencySignals:${owner}/${repo}`,
                () => this.client.graphql<DependencySignalsQueryResult>(query, { owner, repo })
            );
            const repoData = data.repository;
            if (!repoData) {
                throw new Error('Repository not found.');
            }

            const hasManifest = {
                node: Boolean(repoData.packageJson),
                python: Boolean(repoData.requirementsTxt || repoData.pipfile || repoData.poetryLock),
                go: Boolean(repoData.goMod),
                rust: Boolean(repoData.cargoToml),
                java: Boolean(repoData.pomXml || repoData.gradleBuild),
                ruby: Boolean(repoData.gemfile),
                php: Boolean(repoData.composerJson)
            };

            const manifestCount = Object.values(hasManifest).filter(Boolean).length;
            const ecosystemCount = manifestCount;
            const hasLockfile = Boolean(
                repoData.packageLock ||
                repoData.yarnLock ||
                repoData.pnpmLock ||
                repoData.poetryLock
            );
            const hasDependabotConfig = Boolean(repoData.dependabotYml || repoData.dependabotYaml);

            return { hasLockfile, hasDependabotConfig, ecosystemCount, manifestCount };
        } catch (error: unknown) {
            if (this.shouldUseUnauthenticatedFallback(error)) {
                this.log('warn', {
                    event: 'analysis.public_fallback',
                    message: 'GraphQL auth unavailable; using REST fallback for dependency signals.'
                });
                return this.fetchDependencySignalsRest(owner, repo);
            }
            throw this.toGitHubApiError(error, `Failed to fetch dependency signals for ${owner}/${repo}`);
        }
    }

    private async fetchPRHealthRest(owner: string, repo: string): Promise<PRHealth> {
        const staleDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        const repoQuery = `repo:${owner}/${repo}`;

        const [openResult, closedResult, staleResult, mergedSample] = await Promise.all([
            this.executeGitHubCall(
                `search.pr.open:${owner}/${repo}`,
                () => this.client.rest.search.issuesAndPullRequests({ q: `${repoQuery} is:pr is:open`, per_page: 1 })
            ),
            this.executeGitHubCall(
                `search.pr.closed:${owner}/${repo}`,
                () => this.client.rest.search.issuesAndPullRequests({ q: `${repoQuery} is:pr is:closed`, per_page: 1 })
            ),
            this.executeGitHubCall(
                `search.pr.stale:${owner}/${repo}`,
                () => this.client.rest.search.issuesAndPullRequests({ q: `${repoQuery} is:pr is:open updated:<${staleDate}`, per_page: 1 })
            ),
            this.executeGitHubCall(
                `pulls.list.closed:${owner}/${repo}`,
                () => this.client.rest.pulls.list({ owner, repo, state: 'closed', sort: 'updated', direction: 'desc', per_page: 50 })
            )
        ]);

        const mergedDurations = mergedSample.data
            .filter((pr) => !!pr.merged_at)
            .map((pr) => moment(pr.merged_at).diff(moment(pr.created_at), 'days', true));
        const averageTimeToMergeDays = mergedDurations.length > 0
            ? Number((mergedDurations.reduce((sum, value) => sum + value, 0) / mergedDurations.length).toFixed(2))
            : 0;

        return {
            openPRs: openResult.data.total_count,
            closedPRs: closedResult.data.total_count,
            abandonedPRs: staleResult.data.total_count,
            averageTimeToMergeDays
        };
    }

    private async fetchIssueHealthRest(owner: string, repo: string): Promise<IssueHealth> {
        const staleDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        const repoQuery = `repo:${owner}/${repo}`;

        const [openResult, closedResult, staleResult] = await Promise.all([
            this.executeGitHubCall(
                `search.issue.open:${owner}/${repo}`,
                () => this.client.rest.search.issuesAndPullRequests({ q: `${repoQuery} is:issue is:open`, per_page: 1 })
            ),
            this.executeGitHubCall(
                `search.issue.closed:${owner}/${repo}`,
                () => this.client.rest.search.issuesAndPullRequests({ q: `${repoQuery} is:issue is:closed`, per_page: 1 })
            ),
            this.executeGitHubCall(
                `search.issue.stale:${owner}/${repo}`,
                () => this.client.rest.search.issuesAndPullRequests({ q: `${repoQuery} is:issue is:open updated:<${staleDate}`, per_page: 1 })
            )
        ]);

        return {
            openIssues: openResult.data.total_count,
            closedIssues: closedResult.data.total_count,
            staleIssues: staleResult.data.total_count
        };
    }

    private async fetchDependencySignalsRest(owner: string, repo: string): Promise<DependencySignals> {
        const [
            packageJson,
            packageLock,
            yarnLock,
            pnpmLock,
            requirementsTxt,
            pipfile,
            poetryLock,
            goMod,
            cargoToml,
            pomXml,
            gradleBuild,
            gemfile,
            composerJson,
            dependabotYml,
            dependabotYaml
        ] = await Promise.all([
            this.repoPathExists(owner, repo, 'package.json'),
            this.repoPathExists(owner, repo, 'package-lock.json'),
            this.repoPathExists(owner, repo, 'yarn.lock'),
            this.repoPathExists(owner, repo, 'pnpm-lock.yaml'),
            this.repoPathExists(owner, repo, 'requirements.txt'),
            this.repoPathExists(owner, repo, 'Pipfile'),
            this.repoPathExists(owner, repo, 'poetry.lock'),
            this.repoPathExists(owner, repo, 'go.mod'),
            this.repoPathExists(owner, repo, 'Cargo.toml'),
            this.repoPathExists(owner, repo, 'pom.xml'),
            this.repoPathExists(owner, repo, 'build.gradle'),
            this.repoPathExists(owner, repo, 'Gemfile'),
            this.repoPathExists(owner, repo, 'composer.json'),
            this.repoPathExists(owner, repo, '.github/dependabot.yml'),
            this.repoPathExists(owner, repo, '.github/dependabot.yaml')
        ]);

        const hasManifest = {
            node: packageJson,
            python: requirementsTxt || pipfile || poetryLock,
            go: goMod,
            rust: cargoToml,
            java: pomXml || gradleBuild,
            ruby: gemfile,
            php: composerJson
        };

        const manifestCount = Object.values(hasManifest).filter(Boolean).length;
        const ecosystemCount = manifestCount;
        const hasLockfile = Boolean(packageLock || yarnLock || pnpmLock || poetryLock);
        const hasDependabotConfig = Boolean(dependabotYml || dependabotYaml);

        return { hasLockfile, hasDependabotConfig, ecosystemCount, manifestCount };
    }

    private async repoPathExists(owner: string, repo: string, path: string): Promise<boolean> {
        try {
            await this.withTimeout(
                this.client.rest.repos.getContent({ owner, repo, path, ref: 'HEAD' }),
                this.requestTimeoutMs,
                `repos.getContent:${owner}/${repo}:${path} timed out after ${this.requestTimeoutMs}ms`
            );
            return true;
        } catch (error: unknown) {
            const status = this.getErrorStatus(error);
            if (status === 404) {
                return false;
            }
            throw error;
        }
    }

    private calculateRisks(stats: RepoStats, contributors: ContributorActivity, prs: PRHealth, issues: IssueHealth, dependencySignals: DependencySignals): RiskSummary {
        // Calculate bus factor: If the top contributor has > 60% of total commits AND there are few overall contributors.
        let busFactorRisk = false;
        if (contributors.topContributors.length > 0 && contributors.totalCommits > 0) {
            const topPercent = (contributors.topContributors[0].commits / contributors.totalCommits) * 100;
            if (topPercent > 60 && contributors.activeContributors < 5) busFactorRisk = true;
        }

        const lastUpdated = moment(stats.updatedAt);
        const staleCodeRisk = moment().diff(lastUpdated, 'months') > 6;

        return {
            dependencyRiskScore: this.calculateDependencyRiskScore(dependencySignals, staleCodeRisk),
            busFactorRisk,
            staleCodeRisk,
            documentationRisk: !stats.description
        };
    }

    private calculateHealthScore(stats: RepoStats, contributors: ContributorActivity, prs: PRHealth, issues: IssueHealth, risks: RiskSummary): number {
        let score = 100;
        if (risks.dependencyRiskScore > 80) score -= 15;
        else if (risks.dependencyRiskScore > 65) score -= 10;
        if (risks.busFactorRisk) score -= 20;
        if (risks.documentationRisk) score -= 10;
        if (risks.staleCodeRisk) score -= 10;
        if (prs.abandonedPRs > 10) score -= 15;
        if (issues.staleIssues > 20) score -= 15;
        return Math.max(0, score);
    }

    private generateRecommendations(score: number, risks: RiskSummary, prs: PRHealth, issues: IssueHealth): string[] {
        const recs: string[] = [];
        if (risks.dependencyRiskScore > 80) recs.push("Dependency Risk: High. Add lockfiles and automated dependency update policies (Dependabot/Renovate).");
        else if (risks.dependencyRiskScore > 65) recs.push("Dependency Risk: Medium. Improve dependency hygiene with lockfiles and regular upgrade cadence.");
        if (risks.busFactorRisk) recs.push("High Bus Factor: Encourage more developers to contribute to bus-critical areas.");
        if (risks.staleCodeRisk) recs.push("Stale Code Risk: Recent maintenance activity is low. Prioritize updates and triage.");
        if (risks.documentationRisk) recs.push("Documentation Risk: Add a comprehensive README and description.");
        if (prs.abandonedPRs > 0) recs.push(`Clean up ${prs.abandonedPRs} abandoned Pull Requests.`);
        if (prs.averageTimeToMergeDays > 14) recs.push(`PR Throughput: Average time to merge is ${prs.averageTimeToMergeDays} days. Reduce review cycle time.`);
        if (issues.staleIssues > 0) recs.push(`Triage ${issues.staleIssues} stale issues.`);
        if (recs.length === 0) recs.push("Repository is in great health!");
        return recs;
    }

    private calculateDependencyRiskScore(signals: DependencySignals, staleCodeRisk: boolean): number {
        let score = 55;

        if (signals.manifestCount === 0) score += 10;
        if (signals.ecosystemCount >= 3) score += 10;
        else if (signals.ecosystemCount === 2) score += 5;

        if (signals.hasLockfile) score -= 20;
        else score += 10;

        if (signals.hasDependabotConfig) score -= 15;
        else score += 10;

        if (staleCodeRisk) score += 10;

        return Math.max(0, Math.min(100, score));
    }

    private shouldUseUnauthenticatedFallback(error: unknown): boolean {
        const status = this.getErrorStatus(error);
        return !this.hasAuthToken && (status === 401 || status === 403);
    }

    private getErrorStatus(error: unknown): number | undefined {
        return (error as { status?: number; response?: { status?: number } })?.status ??
            (error as { response?: { status?: number } })?.response?.status;
    }

    private toGitHubApiError(error: unknown, context: string): GitHubApiError {
        if (error instanceof GitHubApiError) {
            return error;
        }

        const err = error as {
            status?: number;
            message?: string;
            response?: {
                status?: number;
                data?: {
                    message?: string;
                };
            };
        };

        const status = err.status ?? err.response?.status;
        const apiMessage = err.response?.data?.message || err.message || 'Unknown GitHub API error';
        return new GitHubApiError(`${context}: ${apiMessage}`, status, error);
    }

    private async executeGitHubCall<T>(operation: string, task: () => Promise<T>): Promise<T> {
        return this.withRetry(operation, async () => {
            return this.withTimeout(task(), this.requestTimeoutMs, `${operation} timed out after ${this.requestTimeoutMs}ms`);
        });
    }

    private async withRetry<T>(operation: string, task: () => Promise<T>): Promise<T> {
        let lastError: unknown;
        const maxAttempts = this.retryCount + 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await task();
            } catch (error: unknown) {
                lastError = error;
                const retriable = this.isRetriableError(error);
                const shouldRetry = retriable && attempt < maxAttempts;

                this.log(shouldRetry ? 'warn' : 'error', {
                    event: 'github.call_failed',
                    message: shouldRetry ? 'GitHub call failed, retrying.' : 'GitHub call failed.',
                    attempt,
                    maxAttempts,
                    code: (error as { code?: string })?.code,
                    status: (error as { status?: number })?.status
                });

                if (!shouldRetry) {
                    break;
                }

                const backoffMs = this.retryDelayMs * Math.pow(2, attempt - 1);
                await this.sleep(backoffMs);
            }
        }

        throw lastError;
    }

    private withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

            promise
                .then((result) => resolve(result))
                .catch((error) => reject(error))
                .finally(() => clearTimeout(timeout));
        });
    }

    private isRetriableError(error: unknown): boolean {
        const status = (error as { status?: number; response?: { status?: number } })?.status ??
            (error as { response?: { status?: number } })?.response?.status;
        if (status && [429, 500, 502, 503, 504].includes(status)) {
            return true;
        }

        const message = String((error as { message?: string })?.message || '').toLowerCase();
        return (
            message.includes('timed out') ||
            message.includes('fetch failed') ||
            message.includes('enotfound') ||
            message.includes('eai_again') ||
            message.includes('econnreset') ||
            message.includes('etimedout')
        );
    }

    private getCachedResult(key: string): RepoPulseAnalysisResult | null {
        const now = Date.now();
        const cached = RepoPulseAnalyzer.analysisCache.get(key);
        if (!cached) {
            return null;
        }
        if (cached.expiresAt <= now) {
            RepoPulseAnalyzer.analysisCache.delete(key);
            return null;
        }
        return cached.result;
    }

    private setCachedResult(key: string, result: RepoPulseAnalysisResult): void {
        RepoPulseAnalyzer.analysisCache.set(key, {
            result,
            expiresAt: Date.now() + this.cacheTtlMs
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private log(level: LogLevel, entry: LogEntry): void {
        if (this.logger) {
            this.logger(level, entry);
            return;
        }

        if (level === 'error') {
            console.error(`[RepoPulse][${entry.event}] ${entry.message}`, entry);
        } else if (level === 'warn' && process.env.REPOPULSE_DEBUG === 'true') {
            console.warn(`[RepoPulse][${entry.event}] ${entry.message}`, entry);
        }
    }
}
