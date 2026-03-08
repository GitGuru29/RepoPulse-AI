# RepoPulse AI Scoring Model

## Overview
`healthScore` is a deterministic 0-100 score generated in `packages/core/src/index.ts`.

Base score starts at `100` and deductions are applied for risk signals.

## Current Deductions
- Dependency risk:
  - `> 80`: `-15`
  - `> 65`: `-10`
- Bus factor risk: `-20`
- Documentation risk: `-10`
- Stale code risk: `-10`
- Abandoned PRs (`> 10`): `-15`
- Stale issues (`> 20`): `-15`

Minimum score is clamped to `0`.

## Dependency Risk Score (0-100)
Computed from repository dependency signals:
- package manifests/ecosystem spread
- lockfile presence
- Dependabot config presence
- stale code influence

Heuristic flow:
1. Start at `55`
2. Increase for missing manifests / multiple ecosystems
3. Decrease if lockfile exists
4. Decrease if Dependabot config exists
5. Increase if stale code risk is true
6. Clamp to `0..100`

Interpretation:
- `0-64`: low
- `65-79`: medium
- `80-100`: high

## PR Throughput
`averageTimeToMergeDays` is computed from recent merged PR nodes:
- uses merged PR `createdAt` -> `mergedAt`
- averages durations (days, floating point)

## Recommendations
Recommendations are rule-driven and generated from:
- dependency risk band
- bus factor
- stale code
- documentation
- abandoned PR count
- stale issue count
- average merge time (`> 14` days)

No ML is used in the current model.
