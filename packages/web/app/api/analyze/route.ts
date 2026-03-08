import { NextRequest, NextResponse } from "next/server";
import { RepoPulseAnalyzer } from "@repopulse/core";

function toErrorResponse(error: any) {
    const status = error?.status;
    const message = error?.message || "Failed to analyze repository.";

    if (status === 401 || status === 403) {
        return NextResponse.json(
            { error: "GitHub authentication failed. Provide a valid token with access to this repository." },
            { status: 401 }
        );
    }

    if (status === 404) {
        return NextResponse.json(
            { error: "Repository not found or access denied. For private repos, provide a token with repository read access." },
            { status: 404 }
        );
    }

    return NextResponse.json({ error: message }, { status: 500 });
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
