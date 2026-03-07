"use client";

import { useState } from "react";

export default function Home() {
    const [repo, setRepo] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // Normally typed from @repopulse/core

    const analyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repo) return;

        setLoading(true);
        // In a real app, we'd hit a Next.js API route that calls the core analyzer.
        // For V2 scaffolding, we mock a response simulating core analysis.
        setTimeout(() => {
            setResult({
                healthScore: 85,
                stats: { stars: 1250, forks: 230, openIssues: 45 },
                prs: { abandoned: 2, open: 15 },
                recommendations: [
                    "Healthy repository overall.",
                    "Consider cleaning up 2 abandoned PRs.",
                ]
            });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="container">
            <header className="header">
                <h1>RepoPulse AI</h1>
                <p>Instant health and architecture analysis for any GitHub repository.</p>
            </header>

            <form className="search-box" onSubmit={analyze}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="https://github.com/owner/repo"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                />
                <button type="submit" className="search-button" disabled={loading}>
                    {loading ? "Analyzing..." : "Analyze"}
                </button>
            </form>

            {result && (
                <div className="results-grid">
                    <div className="card">
                        <h3>Health Score</h3>
                        <div className="score">{result.healthScore}/100</div>
                    </div>

                    <div className="card">
                        <h3>At a Glance</h3>
                        <div className="stat-row">
                            <span>Stars</span>
                            <strong>{result.stats.stars}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Forks</span>
                            <strong>{result.stats.forks}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Open Issues</span>
                            <strong>{result.stats.openIssues}</strong>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3>Actionable Insights</h3>
                        <ul>
                            {result.recommendations.map((rec: string, i: number) => (
                                <li key={i} style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
