#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const scanner_1 = require("./scanner");
const reporters_1 = require("./reporters");
const program = new commander_1.Command();
program
    .name('baseline-gardener')
    .description('🌱 Nurture baseline-compatible web code')
    .version('1.0.0');
program
    .command('scan')
    .description('Scan files for baseline compatibility')
    .argument('[path]', 'Path to scan', '.')
    .option('-f, --format <format>', 'Output format (json, markdown, sarif, text)', 'text')
    .option('--require-baseline <level>', 'Required baseline level (widely, newly)', 'newly')
    .option('--allow-experimental', 'Allow non-baseline features', false)
    .option('--update-baseline', 'Update to latest web-features data', false)
    .option('--min-age <months>', 'Minimum months since baseline', '0')
    .option('--config <path>', 'Path to config file', '.baselinerc.json')
    .option('-o, --output <file>', 'Output file (default: stdout)')
    .option('--ai', 'Generate AI-optimized markdown for LLM auto-fixing', false)
    .action(async (path, options) => {
    try {
        console.log(chalk_1.default.green('🌱 Baseline Gardener - Growing baseline-compatible code...'));
        if (options.updateBaseline) {
            console.log(chalk_1.default.gray('📦 Using latest web-features data...'));
            // The web-features package is automatically updated on install
            // In production, could add logic to check for updates
        }
        const results = await (0, scanner_1.scanProject)(path, {
            format: options.format,
            requireBaseline: options.requireBaseline,
            allowExperimental: options.allowExperimental,
            minAge: options.minAge,
            config: options.config
        });
        // Generate report
        const format = options.ai ? 'ai' : options.format;
        const reporter = (0, reporters_1.createReporter)(format);
        const report = reporter.generate(results);
        // Output report
        if (options.output) {
            fs.writeFileSync(options.output, report);
            console.log(chalk_1.default.green(`📝 Report written to ${options.output}`));
        }
        else {
            console.log(report);
        }
        // Exit with appropriate code
        if (results.hasIssues && !options.allowExperimental) {
            console.error(chalk_1.default.red(`\n❌ Found ${results.issues.length} baseline compatibility issues!`));
            process.exit(1);
        }
        else {
            if (options.format === 'text') {
                console.log(chalk_1.default.green('\n✅ Baseline compatibility check passed!'));
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error);
        process.exit(1);
    }
});
// Add info command to show available features
program
    .command('info')
    .description('Show information about baseline features')
    .option('-g, --group <group>', 'Filter by group (css, js, html)')
    .option('-s, --status <status>', 'Filter by status (widely, newly, limited)')
    .action((options) => {
    console.log(chalk_1.default.green('🌱 Baseline Gardener - Feature Information'));
    console.log('This would show details about available baseline features...');
    console.log('Groups:', options.group || 'all');
    console.log('Status:', options.status || 'all');
});
// Add version of web-features being used
program
    .command('version')
    .description('Show version information')
    .action(() => {
    console.log('baseline-gardener: 1.0.0');
    try {
        const webFeaturesPackage = require('../node_modules/web-features/package.json');
        console.log(`web-features: ${webFeaturesPackage.version}`);
    }
    catch {
        console.log('web-features: unknown');
    }
});
program.parse();
//# sourceMappingURL=cli.js.map