"use client";

import { useState } from "react";

type RiskLevel = "low" | "medium" | "high";

function getRiskLevel(value: number, mediumThreshold: number, highThreshold: number): RiskLevel {
    if (value >= highThreshold) return "high";
    if (value >= mediumThreshold) return "medium";
    return "low";
}

function levelLabel(level: RiskLevel): string {
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Low";
}

function recommendationLevel(rec: string): RiskLevel {
    const text = rec.toLowerCase();
    if (text.includes("high") || text.includes("stale") || text.includes("abandoned")) return "high";
    if (text.includes("medium") || text.includes("throughput") || text.includes("triage")) return "medium";
    return "low";
}

function languagePalette(index: number): string {
    const colors = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626", "#7c3aed", "#0891b2", "#ea580c", "#4f46e5"];
    return colors[index % colors.length];
}

export default function Home() {
    const [repo, setRepo] = useState("");
    const [token, setToken] = useState("");
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
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: repo,
                    token: token || undefined
                })
            });
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
                <input
                    type="password"
                    className="search-input token-input"
                    placeholder="GitHub token (optional, required for private repos)"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    autoComplete="off"
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
                    {(() => {
                        const languageEntries = Object.entries(result.languages || {});
                        const totalBytes = languageEntries.reduce((sum: number, [, data]: [string, any]) => sum + (data?.bytes || 0), 0);
                        const topLanguages = languageEntries
                            .map(([name, data]: [string, any]) => ({
                                name,
                                bytes: data?.bytes || 0
                            }))
                            .sort((a, b) => b.bytes - a.bytes)
                            .slice(0, 6)
                            .map((lang) => ({
                                ...lang,
                                percent: totalBytes > 0 ? Number(((lang.bytes / totalBytes) * 100).toFixed(1)) : 0
                            }));

                        return (
                            <div className="card" style={{ gridColumn: "1 / -1" }}>
                                <h3>Language Stack</h3>
                                {topLanguages.length > 0 ? (
                                    <>
                                        <div className="language-stack-bar">
                                            {topLanguages.map((lang, index) => (
                                                <div
                                                    key={lang.name}
                                                    className="language-stack-segment"
                                                    style={{
                                                        width: `${lang.percent}%`,
                                                        backgroundColor: languagePalette(index)
                                                    }}
                                                    title={`${lang.name}: ${lang.percent}%`}
                                                />
                                            ))}
                                        </div>
                                        <ul className="language-list">
                                            {topLanguages.map((lang, index) => (
                                                <li key={lang.name}>
                                                    <span className="language-name">
                                                        <span className="language-dot" style={{ backgroundColor: languagePalette(index) }} />
                                                        {lang.name}
                                                    </span>
                                                    <strong>{lang.percent}%</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <p>No language data available.</p>
                                )}
                            </div>
                        );
                    })()}

                    <div className="card">
                        <h3>Health Score</h3>
                        <div className="score">{result.healthScore}/100</div>
                        <div className={`badge ${result.healthScore >= 80 ? "badge-low" : result.healthScore >= 60 ? "badge-medium" : "badge-high"}`}>
                            {result.healthScore >= 80 ? "Healthy" : result.healthScore >= 60 ? "Needs Attention" : "At Risk"}
                        </div>
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
                        <div className="stat-row">
                            <span>Avg Merge Time</span>
                            <strong>{result.pullRequests.averageTimeToMergeDays}d</strong>
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

                    <div className="card">
                        <h3>Risk Snapshot</h3>
                        <div className="stat-row">
                            <span>Dependency Risk</span>
                            <div className="metric-with-badge">
                                <strong>{result.risks.dependencyRiskScore}/100</strong>
                                <span className={`badge badge-${getRiskLevel(result.risks.dependencyRiskScore, 65, 80)}`}>
                                    {levelLabel(getRiskLevel(result.risks.dependencyRiskScore, 65, 80))}
                                </span>
                            </div>
                        </div>
                        <div className="stat-row">
                            <span>Bus Factor</span>
                            <span className={`badge ${result.risks.busFactorRisk ? "badge-high" : "badge-low"}`}>
                                {result.risks.busFactorRisk ? "High" : "Low"}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span>Code Staleness</span>
                            <span className={`badge ${result.risks.staleCodeRisk ? "badge-medium" : "badge-low"}`}>
                                {result.risks.staleCodeRisk ? "Stale" : "Active"}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span>Documentation</span>
                            <span className={`badge ${result.risks.documentationRisk ? "badge-medium" : "badge-low"}`}>
                                {result.risks.documentationRisk ? "At Risk" : "Good"}
                            </span>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3>Actionable Insights</h3>
                        <ul className="insight-list">
                            {result.recommendations.map((rec: string, i: number) => (
                                <li key={i}>
                                    <span className={`badge badge-${recommendationLevel(rec)}`}>{levelLabel(recommendationLevel(rec))}</span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
