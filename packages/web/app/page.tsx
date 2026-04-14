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
    const colors = ["#00ff87", "#00e5ff", "#ff2d78", "#ffe600", "#bf5fff", "#ff6b2b", "#00bcd4", "#69ff47"];
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

function scoreClass(score: number): string {
    if (score >= 75) return "score score-good";
    if (score >= 55) return "score score-warn";
    return "score score-bad";
}

export default function Home() {
    const [repo, setRepo] = useState("");
    const [token, setToken] = useState("");
    const [branch, setBranch] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorHint, setErrorHint] = useState<string | null>(null);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const runAnalysis = async (repoUrl: string, branchRef: string, tokenValue: string) => {
        setLoading(true);
        setError(null);
        setErrorCode(null);
        setErrorHint(null);
        setResult(null);
        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: repoUrl, token: tokenValue || undefined, branch: branchRef || undefined })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Failed to fetch analysis");
                setErrorCode(data.code || null);
                setErrorHint(data.hint || null);
                return;
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
        const entries = Object.entries(result.languages || {});
        const total = entries.reduce((s: number, [, d]: [string, any]) => s + (d?.bytes || 0), 0);
        const langs = entries
            .map(([name, d]: [string, any]) => ({ name, bytes: d?.bytes || 0 }))
            .sort((a, b) => b.bytes - a.bytes)
            .slice(0, 8)
            .map(l => ({ ...l, percent: total > 0 ? Number(((l.bytes / total) * 100).toFixed(1)) : 0 }));
        return { topLanguages: langs, primaryLanguage: langs[0]?.name || "Unknown" };
    }, [result]);

    const flash = (msg: string) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(null), 3000);
    };

    const copyReportLink = async () => {
        const p = new URLSearchParams();
        p.set("url", repo);
        if (branch) p.set("branch", branch);
        await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${p}`);
        flash("✓ Report link copied");
    };

    const copyMarkdownSummary = async () => {
        if (!result) return;
        const md = [
            `## RepoPulse Report: ${result.stats.owner}/${result.stats.repo}`,
            `- Health Score: **${result.healthScore}/100**`,
            `- Language: ${languageSummary.primaryLanguage}`,
            `- Dependency Risk: ${result.risks.dependencyRiskScore}/100`,
            `- Bus Factor: ${result.risks.busFactorRisk ? "High" : "Low"}`,
            `- Code Staleness: ${result.risks.staleCodeRisk ? "Stale" : "Active"}`,
            "",
            "### Recommendations",
            ...result.recommendations.map((r: string) => `- ${r}`)
        ].join("\n");
        await navigator.clipboard.writeText(md);
        flash("✓ Markdown copied");
    };

    const delay = (n: number) => ({ animationDelay: `${n * 0.08}s` });

    return (
        <div className="container">
            {/* HEADER */}
            <header className="header">
                <div className="header-badge">Live · GitHub Analysis Engine</div>
                <h1>RepoPulse AI</h1>
                <p>Instant health, architecture & risk intelligence for any GitHub repository.</p>
            </header>

            {/* SEARCH */}
            <form className="search-box" onSubmit={analyze}>
                <input
                    id="repo-url"
                    type="text"
                    className="search-input"
                    placeholder="https://github.com/owner/repo"
                    value={repo}
                    onChange={e => setRepo(e.target.value)}
                />
                <input
                    id="token-input"
                    type="password"
                    className="search-input token-input"
                    placeholder="GitHub token (optional)"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    autoComplete="off"
                />
                <input
                    id="branch-input"
                    type="text"
                    className="search-input branch-input"
                    placeholder="Branch (default: HEAD)"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                />
                <button id="analyze-btn" type="submit" className="search-button" disabled={loading || !repo}>
                    {loading ? "Scanning…" : "Analyze →"}
                </button>
            </form>

            {/* ACTION MSG */}
            {actionMsg && <p className="action-msg">{actionMsg}</p>}

            {/* ERROR */}
            {error && (
                <div className="error-block">
                    <strong>Error:</strong> {error}
                    {errorHint && <div className="error-hint">{errorHint}</div>}
                </div>
            )}

            {/* LOADING SKELETONS */}
            {loading && (
                <div className="results-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card" style={delay(i)}>
                            <div className="skeleton skeleton-title" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line short" />
                        </div>
                    ))}
                </div>
            )}

            {/* RESULTS */}
            {result && !loading && (
                <div className="results-grid">

                    {/* Identity */}
                    <div className="card" style={{ ...delay(0), gridColumn: "1 / -1" }}>
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

                    {/* Health Score */}
                    <div className="card" style={delay(1)}>
                        <h3>Health Score</h3>
                        <div className={scoreClass(result.healthScore)}>
                            {result.healthScore}
                            <span style={{ fontSize: "2.5rem", opacity: 0.45, fontWeight: 700 }}>/100</span>
                            <span className="trend">{trendBadge(trendDirectionFromScore(result.healthScore))}</span>
                        </div>
                        <p className="muted">Composed from dependencies, activity, PR health, docs, and ownership matrices.</p>
                        <span className={`badge ${result.healthScore >= 80 ? "badge-low" : result.healthScore >= 60 ? "badge-medium" : "badge-high"}`}>
                            {result.healthScore >= 80 ? "Healthy" : result.healthScore >= 60 ? "Needs Attention" : "At Risk"}
                        </span>
                    </div>

                    {/* Glance */}
                    <div className="card" style={delay(2)}>
                        <h3>At a Glance</h3>
                        <div className="stat-row"><span>Stars</span><strong>{result.stats.stars ?? "—"}</strong></div>
                        <div className="stat-row"><span>Forks</span><strong>{result.stats.forks ?? "—"}</strong></div>
                        <div className="stat-row"><span>Watchers</span><strong>{result.stats.watchers ?? "—"}</strong></div>
                        <div className="stat-row"><span>Avg Merge Time</span><strong>{result.pullRequests.averageTimeToMergeDays}d</strong></div>
                    </div>

                    {/* Language Stack */}
                    <div className="card" style={{ ...delay(3), gridColumn: "1 / -1" }}>
                        <h3>Language Stack</h3>
                        {languageSummary.topLanguages.length > 0 ? (
                            <>
                                <div className="language-stack-bar">
                                    {languageSummary.topLanguages.map((l: any, i: number) => (
                                        <div key={l.name} className="language-stack-segment"
                                            style={{ width: `${l.percent}%`, backgroundColor: languagePalette(i) }}
                                            title={`${l.name}: ${l.percent}%`}
                                        />
                                    ))}
                                </div>
                                <ul className="language-list">
                                    {languageSummary.topLanguages.map((l: any, i: number) => (
                                        <li key={l.name}>
                                            <span className="language-name">
                                                <span className="language-dot" style={{ backgroundColor: languagePalette(i) }} />
                                                {l.name}
                                            </span>
                                            <strong>{l.percent}%</strong>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : <p className="muted">No language data available.</p>}
                    </div>

                    {/* PR & Issues */}
                    <div className="card" style={delay(4)}>
                        <h3>Pull Requests & Issues</h3>
                        <div className="stat-row"><span>Open Issues</span><strong>{result.issues.openIssues}</strong></div>
                        <div className="stat-row">
                            <span>Stale Issues</span>
                            <strong style={{ color: result.issues.staleIssues > 0 ? "var(--neon-pink)" : "var(--text)" }}>
                                {result.issues.staleIssues}
                            </strong>
                        </div>
                        <div className="stat-row">
                            <span>Abandoned PRs</span>
                            <strong style={{ color: result.pullRequests.abandonedPRs > 0 ? "var(--neon-yellow)" : "var(--text)" }}>
                                {result.pullRequests.abandonedPRs}
                            </strong>
                        </div>
                    </div>

                    {/* Risk Snapshot */}
                    <div className="card" style={delay(5)}>
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

                    {/* Architecture */}
                    <div className="card" style={{ ...delay(6), gridColumn: "1 / -1" }}>
                        <h3>Architecture Scan</h3>
                        <div className="identity-grid">
                            <div className="stat-row"><span>Structure Quality</span><strong>{result.architecture?.projectStructureQuality || "Unknown"}</strong></div>
                            <div className="stat-row"><span>Framework</span><strong>{result.architecture?.detectedFramework || "Unknown"}</strong></div>
                            <div className="stat-row"><span>Tests</span><strong>{result.architecture?.missingTests ? "Missing / Sparse" : "Detected"}</strong></div>
                            <div className="stat-row"><span>CI/CD</span><strong>{result.architecture?.ciCdPresent ? "Present" : "Not detected"}</strong></div>
                            <div className="stat-row"><span>Docs</span><strong>{result.architecture?.docsPresent ? "Present" : "Not detected"}</strong></div>
                            <div className="stat-row"><span>Large Files</span><strong>{result.architecture?.largeFiles?.length || 0}</strong></div>
                            <div className="stat-row"><span>God Modules</span><strong>{result.architecture?.godModules?.length || 0}</strong></div>
                            <div className="stat-row"><span>Dead Code Zones</span><strong>{result.architecture?.possibleDeadCodeZones?.length || 0}</strong></div>
                        </div>
                    </div>

                    {/* Insights */}
                    <div className="card" style={{ ...delay(7), gridColumn: "1 / -1" }}>
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

                    {/* Export */}
                    <div className="card" style={{ ...delay(8), gridColumn: "1 / -1" }}>
                        <h3>Export & Share</h3>
                        <div className="actions">
                            <button className="search-button" type="button" onClick={() => window.print()}>Export as PDF</button>
                            <button className="search-button" type="button" onClick={copyReportLink}>Copy Report Link</button>
                            <button className="search-button" type="button" onClick={copyMarkdownSummary}>Copy Markdown</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
