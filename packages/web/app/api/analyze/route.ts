import { NextRequest, NextResponse } from "next/server";
import { RepoPulseAnalyzer } from "@repopulse/core";

interface ApiErrorBody {
    error: string;
    code: string;
    hint: string;
    recoverable: boolean;
}

const API_CACHE_TTL_MS = 60_000;
const analysisResponseCache = new Map<string, { expiresAt: number; value: unknown }>();

function normalizeRef(ref: string | null | undefined): string {
    const value = typeof ref === "string" ? ref.trim() : "";
    return value || "HEAD";
}

function getCachedResult(key: string): unknown | null {
    const cached = analysisResponseCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        analysisResponseCache.delete(key);
        return null;
    }
    return cached.value;
}

function setCachedResult(key: string, value: unknown) {
    analysisResponseCache.set(key, {
        value,
        expiresAt: Date.now() + API_CACHE_TTL_MS
    });
}

function getErrorStatus(error: any): number | undefined {
    return error?.status ?? error?.response?.status;
}

async function analyzeRepository(url: string, branch: string, token?: string | null) {
    const hasTokenOverride = token !== undefined;
    const resolvedToken = hasTokenOverride
        ? (token ?? "")
        : (process.env.GITHUB_TOKEN || "");

    const anonKey = `${url.trim().toLowerCase()}@${branch.toLowerCase()}:anon`;
    const serverAuthKey = `${url.trim().toLowerCase()}@${branch.toLowerCase()}:server-auth`;

    // If no user token is provided, prefer anonymous mode first for public repos.
    if (!hasTokenOverride) {
        const cachedAnon = getCachedResult(anonKey);
        if (cachedAnon) return cachedAnon;

        try {
            const anonymousAnalyzer = new RepoPulseAnalyzer({ token: null });
            const anonResult = await anonymousAnalyzer.analyze(url, branch);
            setCachedResult(anonKey, anonResult);
            return anonResult;
        } catch (error: any) {
            const status = getErrorStatus(error);
            const canTryServerToken = Boolean(resolvedToken) && (status === 401 || status === 403 || status === 404);
            if (!canTryServerToken) {
                throw error;
            }
        }

        const cachedServer = getCachedResult(serverAuthKey);
        if (cachedServer) return cachedServer;

        const serverAnalyzer = new RepoPulseAnalyzer({ token: resolvedToken });
        const serverResult = await serverAnalyzer.analyze(url, branch);
        setCachedResult(serverAuthKey, serverResult);
        return serverResult;
    }

    // User explicitly provided token: use it first, then fallback to anonymous for public repos.
    const explicitAuthKey = `${url.trim().toLowerCase()}@${branch.toLowerCase()}:explicit-auth`;
    const cachedExplicit = getCachedResult(explicitAuthKey);
    if (cachedExplicit) return cachedExplicit;

    try {
        const explicitAnalyzer = new RepoPulseAnalyzer({ token: resolvedToken });
        const explicitResult = await explicitAnalyzer.analyze(url, branch);
        setCachedResult(explicitAuthKey, explicitResult);
        return explicitResult;
    } catch (error: any) {
        const status = getErrorStatus(error);
        if (resolvedToken && (status === 401 || status === 403)) {
            const cachedAnon = getCachedResult(anonKey);
            if (cachedAnon) return cachedAnon;
            const anonymousAnalyzer = new RepoPulseAnalyzer({ token: null });
            const anonResult = await anonymousAnalyzer.analyze(url, branch);
            setCachedResult(anonKey, anonResult);
            return anonResult;
        }
        throw error;
    }
}

function toErrorResponse(error: any) {
    const status = error?.status;
    const message = error?.message || "Failed to analyze repository.";
    let body: ApiErrorBody;
    let responseStatus = 500;
    const lowerMessage = String(message).toLowerCase();

    if (status === 403 && (lowerMessage.includes("rate limit") || lowerMessage.includes("secondary rate limit"))) {
        body = {
            error: "GitHub API rate limit reached for unauthenticated requests.",
            code: "GITHUB_RATE_LIMITED",
            hint: "Retry later or provide a valid GitHub token to increase rate limits.",
            recoverable: true
        };
        responseStatus = 429;
        return NextResponse.json(body, { status: responseStatus });
    }

    if (status === 401 || status === 403) {
        body = {
            error: "GitHub authentication failed. Provide a valid token with access to this repository.",
            code: "GITHUB_AUTH_FAILED",
            hint: "Use a valid token with repo read access for private repositories.",
            recoverable: true
        };
        responseStatus = 401;
    } else if (status === 404) {
        body = {
            error: "Repository not found or access denied. For private repos, provide a token with repository read access.",
            code: "REPO_NOT_FOUND_OR_FORBIDDEN",
            hint: "Confirm owner/repo and token permissions.",
            recoverable: true
        };
        responseStatus = 404;
    } else {
        body = {
            error: message,
            code: "ANALYSIS_FAILED",
            hint: "Retry shortly. If the issue persists, verify GitHub API availability and token configuration.",
            recoverable: true
        };
    }

    return NextResponse.json(body, { status: responseStatus });
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const branch = normalizeRef(searchParams.get("branch"));

    if (!url) {
        return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
    }

    try {
        const result = await analyzeRepository(url, branch);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return toErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url = typeof body?.url === "string" ? body.url.trim() : "";
        const token = typeof body?.token === "string" ? body.token.trim() : "";
        const branch = normalizeRef(body?.branch);

        if (!url) {
            return NextResponse.json({ error: "Missing 'url' in request body." }, { status: 400 });
        }

        let result;
        try {
            result = await analyzeRepository(url, branch, token || undefined);
        } catch (error: any) {
            const status = error?.status;
            // If a provided token is invalid, retry once without token for public repositories.
            if (token && (status === 401 || status === 403)) {
                result = await analyzeRepository(url, branch, null);
            } else {
                throw error;
            }
        }
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return toErrorResponse(error);
    }
}
