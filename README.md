<div align="center">
  <br />
  <h1>✨ RepoPulse AI ✨</h1>
  <p>
    <strong>Instant health, architecture & risk intelligence for any GitHub repository.</strong>
  </p>
  <br />
</div>

RepoPulse AI is an automated, serverless Tech Lead that reviews the structural health and codebase risks of your repository the split-second a Pull Request is opened!

Instead of just checking for syntax errors or running tests, RepoPulse AI analyzes your dependencies, open/stale issues, code concentration scores, language distributions, and commit latency. It then generates an actionable Markdown report summarizing risk levels directly inside the PR conversation, catching architectural debt before it gets merged to `main`.

---

## 🚀 Use the GitHub Action (Recommended)
You can automate your repository health tracking by installing our completely serverless GitHub Action. No accounts, no subscriptions, and zero external tracking.

Install it on any repository in under 10 seconds by adding this file to your repository at `.github/workflows/repopulse.yml`:

```yaml
name: RepoPulse PR Analysis
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write  # Allows the action to comment on the PR
  contents: read

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: GitGuru29/RepoPulse-AI@v1.0.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

Every time a PR is opened, the Action will scan the repository and post a gorgeous Markdown report detailing risks, your Bus Factor, and actionable insights.

---

## 🌍 The Web Dashboard
Need to analyze a public repository or a competitor instantly? We built a dedicated web dashboard using Next.js featuring a stunning Neon aesthetic.

Scan any repo instantly: [Launch the Web Dashboard](https://repopulse.vercel.app/)

*(Note: If you haven't deployed the dashboard yet, connect your Vercel account to the `packages/web` folder!)*

---

## 🛠️ Local Engine & CLI Development

RepoPulse AI is built as a highly modular TypeScript monorepo using npm workspaces.

### Packages
- `packages/core`: The central analysis engine (REST + GraphQL + scoring logic)
- `packages/web`: The Next.js glassmorphism web dashboard
- `packages/cli`: A terminal command interface (`repopulse analyze <repo>`)
- `packages/github-action`: The wrapper that runs the core engine inside GHA runners

### Prerequisites
- Node.js 20+
- npm 10+
- A GitHub token (recommended for higher API rate limits): `GITHUB_TOKEN`

### Setup
Clone the repository and install all dependencies:
```bash
npm install
npm run build
```

Run the web dashboard locally:
```bash
cd packages/web
npm run dev
```

Run the CLI locally:
```bash
cd packages/cli
node dist/index.js analyze openai/openai-node --branch main
```

---

## 📜 Documentation & Roadmap
Looking to contribute or want to understand exactly how our health models calculate risk?
- **Scoring Architecture:** `docs/SCORING_MODEL.md`
- **Product Roadmap:** `docs/PRODUCT_SPEC_ROADMAP.md`

## ⚖️ License
MIT License. Open source and built for the community.
