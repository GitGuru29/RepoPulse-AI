"use client";

import { useState } from "react";

export default function Home() {
    const [repo, setRepo] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // Normally typed from @repopulse/core
    const [error, setError] = useState<string | null>(null);

    const analyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repo) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`/api/analyze?url=${encodeURIComponent(repo)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch analysis");
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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

            {error && (
                <div style={{ color: "var(--danger)", textAlign: "center", marginBottom: "2rem" }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

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
                            <span>Watchers</span>
                            <strong>{result.stats.watchers}</strong>
                        </div>
                    </div>

                    <div className="card">
                        <h3>Pull Requests & Issues</h3>
                        <div className="stat-row">
                            <span>Open Issues</span>
                            <strong>{result.issues.openIssues}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Stale Issues</span>
                            <strong style={{ color: result.issues.staleIssues > 0 ? "var(--danger)" : "var(--foreground)" }}>
                                {result.issues.staleIssues}
                            </strong>
                        </div>
                        <div className="stat-row">
                            <span>Abandoned PRs</span>
                            <strong style={{ color: result.pullRequests.abandonedPRs > 0 ? "var(--warning)" : "var(--foreground)" }}>
                                {result.pullRequests.abandonedPRs}
                            </strong>
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
