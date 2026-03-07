import { Probot } from "probot";
import { RepoPulseAnalyzer } from "@repopulse/core";

export default (app: Probot) => {
    app.log.info("RepoPulse AI GitHub App loaded!");

    // Listen for new Pull Requests or reopened PRs
    app.on(["pull_request.opened", "pull_request.reopened"], async (context) => {
        const pr = context.payload.pull_request;
        const repoFullName = context.payload.repository.full_name;

        app.log.info(`Analyzing new PR in ${repoFullName}`);

        try {
            // In a real scenario, the analyzer would use the installation token context.octokit
            const analyzer = new RepoPulseAnalyzer(process.env.GITHUB_TOKEN);
            const analysis = await analyzer.analyze(repoFullName);

            // Create a comment with the health summary on the PR
            let body = `## 🤖 RepoPulse AI Health Check\n\n`;
            body += `**Current Repository Health Score: ${analysis.healthScore}/100**\n\n`;

            if (analysis.recommendations.length > 0) {
                body += `### Insights & Recommendations\n`;
                analysis.recommendations.forEach(rec => {
                    body += `- ${rec}\n`;
                });
            }

            body += `\n*This is an automated analysis by RepoPulse AI.*`;

            const issueComment = context.issue({
                body: body,
            });

            await context.octokit.issues.createComment(issueComment);
        } catch (err) {
            app.log.error(err);
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
