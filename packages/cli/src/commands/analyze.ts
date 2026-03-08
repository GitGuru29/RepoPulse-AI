import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { RepoPulseAnalyzer } from '@repopulse/core';

export const analyzeCommand = new Command('analyze')
    .description('Analyze a GitHub repository')
    .arguments('<url>')
    .option('-t, --token <token>', 'GitHub token (overrides GITHUB_TOKEN)')
    .option('--json', 'Output raw JSON instead of formatted tables')
    .option('--compact', 'Use compact JSON output with --json')
    .action(async (url: string, options: { token?: string; json?: boolean; compact?: boolean }) => {
        const spinner = options.json ? null : ora('Analyzing repository...').start();

        try {
            const analyzer = new RepoPulseAnalyzer(options.token || process.env.GITHUB_TOKEN);
            const result = await analyzer.analyze(url);

            if (options.json) {
                const spacing = options.compact ? 0 : 2;
                console.log(JSON.stringify(result, null, spacing));
                return;
            }

            spinner?.succeed(`Analysis complete for ${chalk.bold(result.stats.owner + '/' + result.stats.repo)}`);

            console.log('\n' + chalk.blue.bold('📊 Repository Stats'));
            const statsTable = new Table();
            statsTable.push(
                { 'Stars': result.stats.stars },
                { 'Forks': result.stats.forks },
                { 'Open Issues': result.stats.openIssues }
            );
            console.log(statsTable.toString());

            console.log('\n' + chalk.magenta.bold('💻 Language Breakdown'));
            const langTable = new Table({ head: ['Language', 'Bytes'] });
            Object.entries(result.languages).forEach(([lang, data]) => {
                langTable.push([lang, (data as { bytes: number, color: string | null }).bytes]);
            });
            console.log(langTable.toString());

            console.log('\n' + chalk.red.bold('🩺 PR & Issue Health'));
            const healthTable = new Table();
            healthTable.push(
                { 'Abandoned PRs': result.pullRequests.abandonedPRs > 0 ? chalk.red(result.pullRequests.abandonedPRs) : chalk.green('0') },
                { 'Stale Issues': result.issues.staleIssues > 0 ? chalk.red(result.issues.staleIssues) : chalk.green('0') }
            );
            console.log(healthTable.toString());

            console.log('\n' + chalk.green.bold(`✨ Overall Health Score: ${result.healthScore}/100`));

            console.log('\n' + chalk.yellow.bold('💡 Recommendations:'));
            result.recommendations.forEach((rec: string) => {
                console.log(`  - ${rec}`);
            });
            console.log('');

        } catch (error: any) {
            if (spinner) {
                spinner.fail('Analysis failed');
            }
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });
