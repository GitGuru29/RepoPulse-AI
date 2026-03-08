# RepoPulse AI: Product Spec + Roadmap (One Page)

## 1) Product Summary
RepoPulse AI analyzes a GitHub repository and returns a practical health snapshot: score, risk flags, and concrete next actions for maintainers.

Current product surfaces:
- Web dashboard (`packages/web`)
- CLI (`packages/cli`)
- GitHub App PR commenter (`packages/github-app`)
- Shared analysis engine (`packages/core`)

## 2) Problem
Teams often discover project risk late: stale issues, review bottlenecks, bus factor, or weak maintenance signals. Existing metrics are fragmented across GitHub pages and hard to action quickly.

## 3) Target Users
- Engineering managers tracking repo health
- Tech leads maintaining critical repos
- OSS maintainers triaging backlog and PR flow
- Developers who want a quick pre-contribution quality signal

## 4) Value Proposition
- Input: any `owner/repo` or GitHub URL
- Output in seconds:
  - Overall health score (0-100)
  - Risk summary (bus factor, stale code, docs risk)
  - PR/issue health snapshot
  - Actionable recommendations

## 5) In-Scope (v1)
- Real GitHub REST + GraphQL data fetching
- Deterministic scoring model with transparent rules
- Web dashboard for human-readable insights
- CLI for terminal workflows
- GitHub App comment on PR open/reopen events

Out of scope (v1):
- ML-generated architecture mapping
- Deep code-level static analysis across files
- Multi-repo portfolio dashboards

## 6) Current State (from codebase)
Implemented:
- Unified analyzer orchestrator in `packages/core/src/index.ts`
- Web API integration in `packages/web/app/api/analyze/route.ts`
- CLI command in `packages/cli/src/commands/analyze.ts`
- Probot integration in `packages/github-app/src/app.ts`

Gaps:
- Stubbed metrics:
  - `dependencyRiskScore` hardcoded
  - `averageTimeToMergeDays` placeholder
- Empty analyzer modules in `packages/core/src/analyzers/*`
- No test suite for scoring correctness and API edge cases
- Documentation and onboarding are minimal

## 7) Architecture (v1)
- Client/UI (`web` or `cli`) -> `@repopulse/core` analyzer
- Analyzer fetches GitHub data via:
  - REST (`repos`, `languages`, `contributors`)
  - GraphQL (`pullRequests`, `issues`)
- Analyzer computes:
  - Risk flags
  - Health score
  - Recommendations
- GitHub App reuses same core engine and posts PR comments

## 8) Success Metrics
- Analysis success rate >= 95% on valid public repos
- p95 analysis latency <= 5s for medium repos
- Error rate due to malformed input < 2%
- GitHub App comment delivery success >= 99% on subscribed events
- User value proxy: at least 1 recommendation accepted per analyzed repo session (tracked via feedback later)

## 9) Roadmap
Phase 1: Hardening (1-2 weeks)
- Implement missing metrics in `@repopulse/core`:
  - Real `averageTimeToMergeDays`
  - Real dependency risk scoring logic
- Add input validation and clearer typed errors
- Add unit tests for scoring and parser logic
- Add integration tests for web API route

Phase 2: Product Reliability (2-3 weeks)
- Cache GitHub responses (short TTL) to reduce latency/rate-limit pressure
- Add timeout/retry strategy for API calls
- Improve GitHub App comment format with severity tiers
- Add basic telemetry: timing, success/failure counters

Phase 3: UX + Adoption (2 weeks)
- Improve dashboard information architecture:
  - Trend-friendly sections
  - Risk severity labels
  - Recommendation grouping by effort/impact
- Add export: JSON and Markdown report
- Publish quickstart docs and examples for web, CLI, and GitHub App

Phase 4: Differentiators (later)
- Historical trend tracking over time
- Team/portfolio view across multiple repositories
- Policy checks (failing health gates in CI)

## 10) Immediate Next 5 Tasks
1. Implement `averageTimeToMergeDays` in `packages/core/src/index.ts`.
2. Replace `dependencyRiskScore` stub with computed logic.
3. Add tests for `GitHubClient.parseRepoString` and scoring rules.
4. Add API contract tests for `/api/analyze`.
5. Write `README.md` with setup, env vars (`GITHUB_TOKEN`), and examples.
