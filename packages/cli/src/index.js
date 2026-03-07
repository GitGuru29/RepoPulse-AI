#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const analyze_1 = require("./commands/analyze");
const program = new commander_1.Command();
program
    .name('repopulse')
    .description('A developer tool that analyzes GitHub repositories for health, risks, and architecture.')
    .version('1.0.0');
program.addCommand(analyze_1.analyzeCommand);
program.parse(process.argv);
