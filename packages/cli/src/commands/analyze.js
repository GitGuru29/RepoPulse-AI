"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCommand = void 0;
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const core_1 = require("@repopulse/core");
exports.analyzeCommand = new commander_1.Command('analyze')
    .description('Analyze a GitHub repository')
    .argument('<url>', 'GitHub repository URL or owner/repo format')
    .action(async (url) => {
    const spinner = (0, ora_1.default)('Analyzing repository...').start();
    try {
        const analyzer = new core_1.RepoPulseAnalyzer(process.env.GITHUB_TOKEN);
        const result = await analyzer.analyze(url);
        spinner.succeed(`Analysis complete for ${chalk_1.default.bold(result.stats.owner + '/' + result.stats.repo)}`);
        console.log('\n' + chalk_1.default.blue.bold('📊 Repository Stats'));
        const statsTable = new cli_table3_1.default();
        statsTable.push({ 'Stars': result.stats.stars }, { 'Forks': result.stats.forks }, { 'Open Issues': result.stats.openIssues });
        console.log(statsTable.toString());
        console.log('\n' + chalk_1.default.magenta.bold('💻 Language Breakdown'));
        const langTable = new cli_table3_1.default({ head: ['Language', 'Bytes'] });
        Object.entries(result.languages).forEach(([lang, data]) => {
            langTable.push([lang, data.bytes]);
        });
        console.log(langTable.toString());
        console.log('\n' + chalk_1.default.red.bold('🩺 PR & Issue Health'));
        const healthTable = new cli_table3_1.default();
        healthTable.push({ 'Abandoned PRs': result.pullRequests.abandonedPRs > 0 ? chalk_1.default.red(result.pullRequests.abandonedPRs) : chalk_1.default.green('0') }, { 'Stale Issues': result.issues.staleIssues > 0 ? chalk_1.default.red(result.issues.staleIssues) : chalk_1.default.green('0') });
        console.log(healthTable.toString());
        console.log('\n' + chalk_1.default.green.bold(`✨ Overall Health Score: ${result.healthScore}/100`));
        console.log('\n' + chalk_1.default.yellow.bold('💡 Recommendations:'));
        result.recommendations.forEach(rec => {
            console.log(`  - ${rec}`);
        });
        console.log('');
    }
    catch (error) {
        spinner.fail('Analysis failed');
        console.error(chalk_1.default.red(error.message));
        process.exit(1);
    }
});
