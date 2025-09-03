#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { scanProject } from './scanner';
import { createReporter } from './reporters';

const program = new Command();

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
  .action(async (path, options) => {
    try {
      console.log(chalk.green('🌱 Baseline Gardener - Growing baseline-compatible code...'));
      
      if (options.updateBaseline) {
        console.log(chalk.gray('📦 Using latest web-features data...'));
        // The web-features package is automatically updated on install
        // In production, could add logic to check for updates
      }
      
      const results = await scanProject(path, {
        format: options.format,
        requireBaseline: options.requireBaseline,
        allowExperimental: options.allowExperimental,
        minAge: options.minAge,
        config: options.config
      });
      
      // Generate report
      const reporter = createReporter(options.format);
      const report = reporter.generate(results);
      
      // Output report
      if (options.output) {
        fs.writeFileSync(options.output, report);
        console.log(chalk.green(`📝 Report written to ${options.output}`));
      } else {
        console.log(report);
      }
      
      // Exit with appropriate code
      if (results.hasIssues && !options.allowExperimental) {
        console.error(chalk.red(`\n❌ Found ${results.issues.length} baseline compatibility issues!`));
        process.exit(1);
      } else {
        if (options.format === 'text') {
          console.log(chalk.green('\n✅ Baseline compatibility check passed!'));
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
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
    console.log(chalk.green('🌱 Baseline Gardener - Feature Information'));
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
    } catch {
      console.log('web-features: unknown');
    }
  });

program.parse();