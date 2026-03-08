# Release Checklist

## 1) Code Health
- [ ] `npm run build` passes at repo root
- [ ] `npm test` passes at repo root
- [ ] No accidental duplicate files (`* 2*`) in source/config paths

## 2) Core Analyzer
- [ ] `GITHUB_TOKEN` validated for local verification runs
- [ ] Timeout/retry/cache behavior smoke-tested
- [ ] Error handling returns clear messages for invalid repo input and API failures

## 3) Web Dashboard
- [ ] `/api/analyze` returns expected JSON for valid repos
- [ ] UI renders health score, risk snapshot, and recommendations
- [ ] Mobile layout remains usable

## 4) CLI
- [ ] `node dist/index.js analyze owner/repo` works on a known repo
- [ ] `analyze --help` output remains correct

## 5) GitHub App
- [ ] PR open/reopen event posts structured comment
- [ ] Comment includes severity, key metrics, and recommendations
- [ ] App logs errors without crashing worker

## 6) Git Hygiene
- [ ] `.next` artifacts intentionally handled per repo policy
- [ ] No sensitive secrets committed
- [ ] Branch pushed and PR opened with summary + test evidence

## 7) Release Notes
- [ ] Added "what changed" summary
- [ ] Documented breaking changes (if any)
- [ ] Linked roadmap impact and next planned milestone
