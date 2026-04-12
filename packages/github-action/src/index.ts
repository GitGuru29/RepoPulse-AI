import * as core from '@actions/core';
import * as github from '@actions/github';
import { RepoPulseAnalyzer } from '@repopulse/core';

async function run(): Promise<void> {
    try {
        const token = core.getInput('github_token', { required: true });
        const context = github.context;
        
        // Ensure this action is running on a PR
        if (!context.payload.pull_request) {
            core.info('This action only runs on pull requests. Skipping analysis.');
            return;
        }

        const owner = context.repo.owner;
        const repo = context.repo.repo;
        const prNumber = context.payload.pull_request.number;
        const repoFullName = `${owner}/${repo}`;

        core.info(`Starting RepoPulse analysis for ${repoFullName}...`);

        const analyzer = new RepoPulseAnalyzer(token);
        const analysis = await analyzer.analyze(repoFullName);

        const openRiskCount = [
            analysis.risks.busFactorRisk,
            analysis.risks.staleCodeRisk,
            analysis.risks.documentationRisk,
            analysis.risks.dependencyRiskScore >= 65
        ].filter(Boolean).length;

        let body = `## 🩺 RepoPulse AI Health Check\n\n`;

        if (analysis.healthScore < 60) {
            body += `> [!CAUTION]\n> **Action Required: Project health is deeply concerning (${analysis.healthScore}/100).**\n> There are ${openRiskCount} open risk signals that need immediate attention before shipping this PR.\n\n`;
        } else if (analysis.healthScore < 80) {
            body += `> [!WARNING]\n> **Needs Attention: Project health is moderate (${analysis.healthScore}/100).**\n> There are ${openRiskCount} open risk signals detected in the repository.\n\n`;
        } else {
            body += `> [!NOTE]\n> **Project is Healthy (${analysis.healthScore}/100).**\n> The codebase maintains good health with ${openRiskCount} minimal risk signals.\n\n`;
        }

        body += `### 📊 Key Metrics\n`;
        body += `- **Stars**: \`${analysis.stats.stars}\`\n`;
        body += `- **Open/Stale Issues**: \`${analysis.issues.openIssues}\` / \`${analysis.issues.staleIssues}\`\n`;
        body += `- **Abandoned PRs**: \`${analysis.pullRequests.abandonedPRs}\`\n`;
        body += `- **Avg Merge Time**: \`${analysis.pullRequests.averageTimeToMergeDays} days\`\n\n`;

        body += `### 🚩 Risk Flags\n`;
        if (analysis.risks.dependencyRiskScore >= 80) {
            body += `> [!CAUTION]\n> **Dependency Risk (Critical): ${analysis.risks.dependencyRiskScore}/100**\n> Severe lack of lockfiles, update policies, or outdated dependencies.\n\n`;
        } else if (analysis.risks.dependencyRiskScore >= 65) {
            body += `> [!WARNING]\n> **Dependency Risk (Medium): ${analysis.risks.dependencyRiskScore}/100**\n> Consider rolling out Dependabot or adding lockfiles.\n\n`;
        }

        body += `- **Bus Factor Risk**: ${analysis.risks.busFactorRisk ? "🚨 **CRITICAL** - Knowledge is too concentrated" : "✅ Low"}\n`;
        body += `- **Stale Code Risk**: ${analysis.risks.staleCodeRisk ? "⚠️ **MEDIUM**" : "✅ Active"}\n`;
        body += `- **Documentation Risk**: ${analysis.risks.documentationRisk ? "⚠️ **MEDIUM**" : "✅ Sufficient"}\n\n`;

        if (analysis.recommendations.length > 0) {
            body += `### 💡 Recommended Actions\n`;
            analysis.recommendations.forEach((rec: string) => {
                const text = rec.toLowerCase();
                if (text.includes("high") || text.includes("critical") || text.includes("abandoned")) {
                    body += `- 🚨 **Urgent**: ${rec}\n`;
                } else if (text.includes("medium") || text.includes("throughput") || text.includes("triage")) {
                    body += `- ⚠️ **Warning**: ${rec}\n`;
                } else {
                    body += `- 💡 **Tip**: ${rec}\n`;
                }
            });
        }

        body += `\n---\n_Automated architecture and health analysis by RepoPulse AI._`;

        core.info('Analysis complete. Creating PR comment...');

        const octokit = github.getOctokit(token);
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body
        });

        core.info('Comment successfully posted to PR!');

    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Analysis Failed: ${error.message}`);
        } else {
            core.setFailed(`Analysis Failed with unknown error: ${error}`);
        }
    }
}

run();
