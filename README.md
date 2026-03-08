# RepoPulse AI

RepoPulse AI analyzes GitHub repositories and returns a health score, risk signals, and actionable recommendations.

## Monorepo Packages
- `packages/core`: shared analysis engine (REST + GraphQL + scoring)
- `packages/web`: Next.js dashboard + `/api/analyze`
- `packages/cli`: terminal command (`repopulse analyze <repo>`)
- `packages/github-app`: Probot app that comments health summaries on PR events

## Prerequisites
- Node.js 20+
- npm 10+
- A GitHub token (recommended): `GITHUB_TOKEN`

## Quickstart
```bash
npm install
```

Create environment files as needed:
```bash
export GITHUB_TOKEN=your_token_here
```

Build all workspaces:
```bash
npm run build
```

Run all tests:
```bash
npm test
```

## Run Each Surface
Web dashboard:
```bash
cd packages/web
npm run dev
```
Open `http://localhost:3000`.

CLI:
```bash
cd packages/cli
npm run build
node dist/index.js analyze openai/openai-node
```

GitHub App (Probot):
```bash
cd packages/github-app
npm run build
npm start
```

## API Usage
The web app exposes:
```bash
GET /api/analyze?url=owner/repo
POST /api/analyze
```

Example:
```bash
curl "http://localhost:3000/api/analyze?url=openai/openai-node"
```

Private repo example (recommended):
```bash
curl -X POST "http://localhost:3000/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"url":"owner/private-repo","token":"ghp_your_token"}'
```

## Reliability Notes
Core analyzer currently includes:
- request timeout handling
- retry with exponential backoff for retriable failures
- short-lived in-memory analysis cache
- structured telemetry hooks for failures and success timing

## Documentation
- Product/roadmap: `docs/PRODUCT_SPEC_ROADMAP.md`
- Scoring model: `docs/SCORING_MODEL.md`
- Release checklist: `docs/RELEASE_CHECKLIST.md`
