import { NextRequest, NextResponse } from "next/server";
import { RepoPulseAnalyzer } from "@repopulse/core";

interface ApiErrorBody {
    error: string;
    code: string;
    hint: string;
    recoverable: boolean;
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

    if (!url) {
        return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
    }

    try {
        const analyzer = new RepoPulseAnalyzer(process.env.GITHUB_TOKEN);
        const result = await analyzer.analyze(url);
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

        if (!url) {
            return NextResponse.json({ error: "Missing 'url' in request body." }, { status: 400 });
        }

        const analyzer = new RepoPulseAnalyzer(token || process.env.GITHUB_TOKEN);
        const result = await analyzer.analyze(url);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return toErrorResponse(error);
    }
}
