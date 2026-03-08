import { Probot, run } from "probot";
import { RepoPulseAnalyzer } from "@repopulse/core";

function severityLabel(level: "low" | "medium" | "high"): string {
    if (level === "high") return "HIGH";
    if (level === "medium") return "MEDIUM";
    return "LOW";
}

function getDependencySeverity(score: number): "low" | "medium" | "high" {
    if (score >= 80) return "high";
    if (score >= 65) return "medium";
    return "low";
}

function getHealthSeverity(score: number): "low" | "medium" | "high" {
    if (score < 60) return "high";
    if (score < 80) return "medium";
    return "low";
}

// The main app logic is now exported as a default function
const appFn = (app: Probot) => {
    app.log.info("RepoPulse AI GitHub App loaded!");

    // Listen for new Pull Requests or reopened PRs
    app.on(["pull_request.opened", "pull_request.reopened"], async (context) => {
        const pr = context.payload.pull_request;
        const repoFullName = context.payload.repository.full_name;

        app.log.info(`Analyzing new PR in ${repoFullName} `);

        try {
            // In a real scenario, the analyzer would use the installation token context.octokit
            const analyzer = new RepoPulseAnalyzer(process.env.GITHUB_TOKEN);
            const analysis = await analyzer.analyze(repoFullName);

            // Create a comment with the health summary on the PR
            const healthSeverity = getHealthSeverity(analysis.healthScore);
            const dependencySeverity = getDependencySeverity(analysis.risks.dependencyRiskScore);
            const openRiskCount = [
                analysis.risks.busFactorRisk,
                analysis.risks.staleCodeRisk,
                analysis.risks.documentationRisk,
                analysis.risks.dependencyRiskScore >= 65
            ].filter(Boolean).length;

            let body = `## RepoPulse AI Health Check\n\n`;
            body += `**Repository:** \`${analysis.stats.owner}/${analysis.stats.repo}\`\n`;
            body += `**Overall Health:** \`${analysis.healthScore}/100\` (${severityLabel(healthSeverity)})\n`;
            body += `**Open Risk Signals:** \`${openRiskCount}\`\n\n`;

            body += `### Key Metrics\n`;
            body += `- Stars: \`${analysis.stats.stars}\`\n`;
            body += `- Open Issues: \`${analysis.issues.openIssues}\`\n`;
            body += `- Stale Issues: \`${analysis.issues.staleIssues}\`\n`;
            body += `- Abandoned PRs: \`${analysis.pullRequests.abandonedPRs}\`\n`;
            body += `- Avg Merge Time: \`${analysis.pullRequests.averageTimeToMergeDays}d\`\n`;
            body += `- Dependency Risk: \`${analysis.risks.dependencyRiskScore}/100\` (${severityLabel(dependencySeverity)})\n\n`;

            body += `### Risk Flags\n`;
            body += `- Bus Factor Risk: ${analysis.risks.busFactorRisk ? "YES" : "NO"}\n`;
            body += `- Stale Code Risk: ${analysis.risks.staleCodeRisk ? "YES" : "NO"}\n`;
            body += `- Documentation Risk: ${analysis.risks.documentationRisk ? "YES" : "NO"}\n\n`;

            if (analysis.recommendations.length > 0) {
                body += `### Recommended Actions\n`;
                analysis.recommendations.forEach((rec: string) => {
                    body += `- ${rec}\n`;
                });
            }

            body += `\n_This is an automated analysis by RepoPulse AI._`;

            const issueComment = context.issue({
                body: body,
            });

            await context.octokit.issues.createComment(issueComment);
        } catch (err) {
            if (err instanceof Error) {
                app.log.error(err.message);
            } else {
                app.log.error(String(err));
            }
        }
    });

    // Example hook for a weekly summary (simulated via manual trigger for now)
    app.on("repository_dispatch", async (context) => {
        if (context.payload.action === 'generate_weekly_summary') {
            app.log.info("Generating weekly engineering summary...");
            // Logic to gather stats for the week and create an issue/discussion
        }
    });
};

export default appFn;
