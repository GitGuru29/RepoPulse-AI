export type RepoPulseErrorCode =
    | 'INVALID_REPO_INPUT'
    | 'GITHUB_API_ERROR'
    | 'ANALYSIS_ERROR';

export class RepoPulseError extends Error {
    public readonly code: RepoPulseErrorCode;

    constructor(code: RepoPulseErrorCode, message: string, cause?: unknown) {
        super(message);
        this.name = 'RepoPulseError';
        this.code = code;
        if (cause !== undefined) {
            (this as Error & { cause?: unknown }).cause = cause;
        }
    }
}

export class InvalidRepoInputError extends RepoPulseError {
    constructor(input: string) {
        super(
            'INVALID_REPO_INPUT',
            `Invalid repository format: ${input}. Expected owner/repo or a GitHub URL.`,
        );
        this.name = 'InvalidRepoInputError';
    }
}

export class GitHubApiError extends RepoPulseError {
    public readonly status?: number;

    constructor(message: string, status?: number, cause?: unknown) {
        super('GITHUB_API_ERROR', message, cause);
        this.name = 'GitHubApiError';
        this.status = status;
    }
}

export class AnalysisError extends RepoPulseError {
    constructor(message: string, cause?: unknown) {
        super('ANALYSIS_ERROR', message, cause);
        this.name = 'AnalysisError';
    }
}
