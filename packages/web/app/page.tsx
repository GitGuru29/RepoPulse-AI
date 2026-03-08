"use client";

import { useEffect, useMemo, useState } from "react";

type RiskLevel = "low" | "medium" | "high";
type TrendDirection = "up" | "down" | "flat";

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

function trendBadge(direction: TrendDirection) {
    if (direction === "up") return "↑";
    if (direction === "down") return "↓";
    return "→";
}

function trendDirectionFromScore(score: number): TrendDirection {
    if (score >= 75) return "up";
    if (score <= 55) return "down";
    return "flat";
}

function formatDate(value: string | undefined): string {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString();
}

export default function Home() {
    const [repo, setRepo] = useState("");
    const [token, setToken] = useState("");
    const [branch, setBranch] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const runAnalysis = async (repoUrl: string, branchRef: string, tokenValue: string) => {
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
                    url: repoUrl,
                    token: tokenValue || undefined,
                    branch: branchRef || undefined
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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qRepo = params.get("url") || "";
        const qBranch = params.get("branch") || "";
        if (!qRepo) return;
        setRepo(qRepo);
        setBranch(qBranch);
        void runAnalysis(qRepo, qBranch, "");
    }, []);

    const analyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repo) return;
        await runAnalysis(repo, branch, token);
    };

    const languageSummary = useMemo(() => {
        if (!result) return { topLanguages: [], primaryLanguage: "Unknown" };
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
        return { topLanguages, primaryLanguage: topLanguages[0]?.name || "Unknown" };
    }, [result]);

    const copyReportLink = async () => {
        const params = new URLSearchParams();
        params.set("url", repo);
        if (branch) params.set("branch", branch);
        const link = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        await navigator.clipboard.writeText(link);
        setActionMsg("Report link copied.");
    };

    const copyMarkdownSummary = async () => {
        if (!result) return;
        const markdown = [
            `## RepoPulse Report: ${result.stats.owner}/${result.stats.repo}`,
            "",
            `- Health Score: **${result.healthScore}/100**`,
            `- Visibility: ${result.stats.visibility || "unknown"}`,
            `- Default Branch: ${result.stats.defaultBranch || "unknown"}`,
            `- Last Updated: ${formatDate(result.stats.updatedAt)}`,
            `- Primary Language: ${languageSummary.primaryLanguage}`,
            "",
            "### Risks",
            `- Dependency Risk: ${result.risks.dependencyRiskScore}/100`,
            `- Bus Factor Risk: ${result.risks.busFactorRisk ? "High" : "Low"}`,
            `- Code Staleness: ${result.risks.staleCodeRisk ? "Stale" : "Active"}`,
            "",
            "### Recommendations",
            ...result.recommendations.map((rec: string) => `- ${rec}`)
        ].join("\n");
        await navigator.clipboard.writeText(markdown);
        setActionMsg("Markdown summary copied.");
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
                <input
                    type="text"
                    className="search-input branch-input"
                    placeholder="Branch/tag (optional, default: HEAD)"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                />
                <button type="submit" className="search-button" disabled={loading}>
                    {loading ? "Analyzing..." : "Analyze"}
                </button>
            </form>

            {actionMsg && <p className="action-msg">{actionMsg}</p>}

            {error && (
                <div style={{ color: "var(--danger)", textAlign: "center", marginBottom: "2rem" }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {loading && (
                <div className="results-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card">
                            <div className="skeleton skeleton-title" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line short" />
                        </div>
                    ))}
                </div>
            )}

            {result && !loading && (
                <div className="results-grid">
                    <div className="card" style={{ gridColumn: "1 / -1" }}>
                        <h3>Repository Identity</h3>
                        <div className="identity-grid">
                            <div className="stat-row"><span>Repository</span><strong>{result.stats.repo}</strong></div>
                            <div className="stat-row"><span>Owner</span><strong>{result.stats.owner}</strong></div>
                            <div className="stat-row"><span>Visibility</span><strong>{result.stats.visibility || "Unknown"}</strong></div>
                            <div className="stat-row"><span>Default Branch</span><strong>{result.stats.defaultBranch || "Unknown"}</strong></div>
                            <div className="stat-row"><span>Last Updated</span><strong>{formatDate(result.stats.updatedAt)}</strong></div>
                            <div className="stat-row"><span>Primary Language</span><strong>{languageSummary.primaryLanguage}</strong></div>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: "1 / -1" }}>
                        <h3>Language Stack</h3>
                        {languageSummary.topLanguages.length > 0 ? (
                            <>
                                <div className="language-stack-bar">
                                    {languageSummary.topLanguages.map((lang: any, index: number) => (
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
                                    {languageSummary.topLanguages.map((lang: any, index: number) => (
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

                    <div className="card">
                        <h3>Health Score</h3>
                        <div className="score">
                            {result.healthScore}/100 <span className="trend">{trendBadge(trendDirectionFromScore(result.healthScore))}</span>
                        </div>
                        <p className="muted">
                            Calculated from dependencies, activity, docs, ownership, and PR health.
                        </p>
                        <div className={`badge ${result.healthScore >= 80 ? "badge-low" : result.healthScore >= 60 ? "badge-medium" : "badge-high"}`}>
                            {result.healthScore >= 80 ? "Healthy" : result.healthScore >= 60 ? "Needs Attention" : "At Risk"}
                        </div>
                    </div>

                    <div className="card">
                        <h3>At a Glance</h3>
                        <div className="stat-row"><span>Stars</span><strong>{result.stats.stars || "—"}</strong></div>
                        <div className="stat-row"><span>Forks</span><strong>{result.stats.forks || "—"}</strong></div>
                        <div className="stat-row"><span>Watchers</span><strong>{result.stats.watchers || "—"}</strong></div>
                        <div className="stat-row"><span>Avg Merge Time</span><strong>{result.pullRequests.averageTimeToMergeDays}d</strong></div>
                    </div>

                    <div className="card">
                        <h3>Pull Requests & Issues</h3>
                        <div className="stat-row"><span>Open Issues</span><strong>{result.issues.openIssues}</strong></div>
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
                        {result.issues.openIssues === 0 && result.issues.closedIssues === 0 && (
                            <p className="muted">No public issue data found.</p>
                        )}
                    </div>

                    <div className="card">
                        <h3>Risk Snapshot</h3>
                        <div className="stat-row">
                            <span title="Measures dependency hygiene based on lockfiles, automation, and ecosystem complexity.">Dependency Risk</span>
                            <div className="metric-with-badge">
                                <strong>{result.risks.dependencyRiskScore}/100</strong>
                                <span className={`badge badge-${getRiskLevel(result.risks.dependencyRiskScore, 65, 80)}`}>
                                    {levelLabel(getRiskLevel(result.risks.dependencyRiskScore, 65, 80))}
                                </span>
                            </div>
                        </div>
                        <div className="stat-row">
                            <span title="Bus factor shows concentration risk when too much critical work is owned by very few contributors.">Bus Factor</span>
                            <span className={`badge ${result.risks.busFactorRisk ? "badge-high" : "badge-low"}`}>
                                {result.risks.busFactorRisk ? "High" : "Low"}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span title="Code staleness reflects how recently meaningful maintenance activity happened.">Code Staleness</span>
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

                    <div className="card">
                        <h3>Trend Direction</h3>
                        <div className="stat-row"><span>Health Score</span><strong>{trendBadge(trendDirectionFromScore(result.healthScore))}</strong></div>
                        <div className="stat-row">
                            <span>Code Staleness</span>
                            <strong>{result.risks.staleCodeRisk ? "Worsening" : "Improving"}</strong>
                        </div>
                        <div className="stat-row">
                            <span>PR Latency</span>
                            <strong>{result.pullRequests.averageTimeToMergeDays > 14 ? "Worsening" : "Improving"}</strong>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: "1 / -1" }}>
                        <h3>Architecture Scan</h3>
                        <div className="stat-row"><span>Project Structure Quality</span><strong>{result.architecture?.projectStructureQuality || "Unknown"}</strong></div>
                        <div className="stat-row"><span>Detected Framework</span><strong>{result.architecture?.detectedFramework || "Unknown"}</strong></div>
                        <div className="stat-row"><span>Tests</span><strong>{result.architecture?.missingTests ? "Missing or sparse" : "Detected"}</strong></div>
                        <div className="stat-row"><span>CI/CD</span><strong>{result.architecture?.ciCdPresent ? "Present" : "Not detected"}</strong></div>
                        <div className="stat-row"><span>Docs</span><strong>{result.architecture?.docsPresent ? "Present" : "Not detected"}</strong></div>
                        <div className="stat-row"><span>Large Files</span><strong>{result.architecture?.largeFiles?.length || 0}</strong></div>
                        <div className="stat-row"><span>God Modules</span><strong>{result.architecture?.godModules?.length || 0}</strong></div>
                        <div className="stat-row"><span>Possible Dead Code Zones</span><strong>{result.architecture?.possibleDeadCodeZones?.length || 0}</strong></div>
                    </div>

                    <div className="card" style={{ gridColumn: "1 / -1" }}>
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

                    <div className="card" style={{ gridColumn: "1 / -1" }}>
                        <h3>Export & Share</h3>
                        <div className="actions">
                            <button className="search-button" type="button" onClick={() => window.print()}>Export as PDF</button>
                            <button className="search-button" type="button" onClick={copyReportLink}>Copy Report Link</button>
                            <button className="search-button" type="button" onClick={copyMarkdownSummary}>Copy Markdown Summary</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
