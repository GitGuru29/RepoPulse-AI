const test = require('node:test');
const assert = require('node:assert/strict');

const { RepoPulseAnalyzer } = require('../dist/index');

test('dependency risk score drops with lockfile and dependabot', () => {
    const analyzer = new RepoPulseAnalyzer();

    const lowRisk = analyzer.calculateDependencyRiskScore(
        { hasLockfile: true, hasDependabotConfig: true, ecosystemCount: 1, manifestCount: 1 },
        false
    );

    const highRisk = analyzer.calculateDependencyRiskScore(
        { hasLockfile: false, hasDependabotConfig: false, ecosystemCount: 3, manifestCount: 3 },
        true
    );

    assert.ok(lowRisk < highRisk);
    assert.ok(lowRisk >= 0 && lowRisk <= 100);
    assert.ok(highRisk >= 0 && highRisk <= 100);
});

test('health score penalizes high dependency risk', () => {
    const analyzer = new RepoPulseAnalyzer();

    const score = analyzer.calculateHealthScore(
        {
            owner: 'acme',
            repo: 'project',
            description: 'demo',
            stars: 10,
            forks: 1,
            watchers: 10,
            openIssues: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        { totalCommits: 100, activeContributors: 10, topContributors: [{ login: 'dev', commits: 20 }] },
        { openPRs: 1, closedPRs: 10, abandonedPRs: 0, averageTimeToMergeDays: 2 },
        { openIssues: 0, closedIssues: 20, staleIssues: 0 },
        { dependencyRiskScore: 90, busFactorRisk: false, staleCodeRisk: false, documentationRisk: false }
    );

    assert.equal(score, 85);
});
