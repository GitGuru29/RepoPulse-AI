import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { RepoPulseAnalyzer } from '@repopulse/core';

export const analyzeCommand = new Command('analyze')
    .description('Analyze a GitHub repository')
    .argument('<url>', 'GitHub repository URL or owner/repo format')
    .action(async (url: string) => {
        const spinner = ora('Analyzing repository...').start();

        try {
            const analyzer = new RepoPulseAnalyzer(process.env.GITHUB_TOKEN);
            const result = await analyzer.analyze(url);

            spinner.succeed(`Analysis complete for ${chalk.bold(result.stats.owner + '/' + result.stats.repo)}`);

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
                langTable.push([lang, data.bytes]);
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
            result.recommendations.forEach(rec => {
                console.log(`  - ${rec}`);
            });
            console.log('');

        } catch (error: any) {
            spinner.fail('Analysis failed');
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });
