import { NextRequest, NextResponse } from "next/server";
import { RepoPulseAnalyzer } from "@repopulse/core";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
    }

    try {
        const analyzer = new RepoPulseAnalyzer(process.env.GITHUB_TOKEN);
        const result = await analyzer.analyze(url);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze repository." }, { status: 500 });
    }
}
