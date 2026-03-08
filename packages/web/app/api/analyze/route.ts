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

async function analyzeRepository(url: string, branch: string, token?: string) {
    const resolvedToken = token || process.env.GITHUB_TOKEN;
    const canUseCache = !token;
    const authMode = resolvedToken ? "server-auth" : "anon";
    const cacheKey = `${url.trim().toLowerCase()}@${branch.toLowerCase()}:${authMode}`;

    if (canUseCache) {
        const cached = getCachedResult(cacheKey);
        if (cached) {
            return cached;
        }
    }

    const analyzer = new RepoPulseAnalyzer(resolvedToken);
    const result = await analyzer.analyze(url, branch);

    if (canUseCache) {
        setCachedResult(cacheKey, result);
    }

    return result;
}

function toErrorResponse(error: any) {
    const status = error?.status;
    const message = error?.message || "Failed to analyze repository.";
    let body: ApiErrorBody;
    let responseStatus = 500;

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

        const result = await analyzeRepository(url, branch, token || undefined);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return toErrorResponse(error);
    }
}
