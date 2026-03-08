import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const token = typeof body?.token === "string" ? body.token.trim() : "";

        if (!token) {
            return NextResponse.json(
                { valid: false, error: "Missing token.", code: "TOKEN_MISSING" },
                { status: 400 }
            );
        }

        const response = await fetch("https://api.github.com/user", {
            method: "GET",
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "RepoPulse-AI"
            }
        });

        if (!response.ok) {
            return NextResponse.json(
                { valid: false, code: "TOKEN_INVALID", error: "Token validation failed." },
                { status: 401 }
            );
        }

        const user = await response.json();
        const scopes = response.headers.get("x-oauth-scopes") || "";

        return NextResponse.json({
            valid: true,
            login: user?.login || null,
            scopes: scopes.split(",").map((scope) => scope.trim()).filter(Boolean)
        });
    } catch (error) {
        console.error("Token verify error:", error);
        return NextResponse.json(
            { valid: false, code: "TOKEN_CHECK_FAILED", error: "Unable to verify token." },
            { status: 500 }
        );
    }
}
