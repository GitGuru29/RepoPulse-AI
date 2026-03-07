#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze';

const program = new Command();

program
    .name('repopulse')
    .description('A developer tool that analyzes GitHub repositories for health, risks, and architecture.')
    .version('1.0.0');

program.addCommand(analyzeCommand);

program.parse(process.argv);
