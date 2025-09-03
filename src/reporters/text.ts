import chalk from 'chalk';
import { ScanResult } from '../scanner';
import { Reporter } from './index';

export class TextReporter implements Reporter {
  generate(result: ScanResult): string {
    const lines: string[] = [];
    
    // Header
    lines.push(chalk.bold.green('🌱 Baseline Gardener Report'));
    lines.push('='.repeat(50));
    lines.push('');
    
    // Summary
    lines.push(chalk.bold('📊 Summary:'));
    lines.push(`Files scanned: ${result.totalFiles}`);
    lines.push(`Total features detected: ${result.totalFeatures}`);
    lines.push(`Baseline compatible: ${chalk.green(result.baselineFeatures)}`);
    lines.push(`Non-baseline features: ${result.nonBaselineFeatures > 0 ? chalk.red(result.nonBaselineFeatures) : '0'}`);
    lines.push('');
    
    // Feature breakdown
    lines.push(chalk.bold('🎯 Feature Breakdown:'));
    lines.push(`${chalk.green('●')} Widely available: ${result.summary.widely}`);
    lines.push(`${chalk.yellow('●')} Newly available: ${result.summary.newly}`);
    lines.push(`${chalk.red('●')} Limited availability: ${result.summary.limited}`);
    lines.push(`${chalk.gray('●')} Unknown features: ${result.summary.unknown}`);
    lines.push('');
    
    // Issues
    if (result.issues.length > 0) {
      lines.push(chalk.bold.red('⚠️  Issues Found:'));
      lines.push('');
      
      const errorIssues = result.issues.filter(i => i.severity === 'error');
      const warningIssues = result.issues.filter(i => i.severity === 'warning');
      
      if (errorIssues.length > 0) {
        lines.push(chalk.bold.red('ERRORS:'));
        errorIssues.forEach(issue => {
          lines.push(this.formatIssue(issue, 'error'));
          lines.push('');
        });
      }
      
      if (warningIssues.length > 0) {
        lines.push(chalk.bold.yellow('WARNINGS:'));
        warningIssues.forEach(issue => {
          lines.push(this.formatIssue(issue, 'warning'));
          lines.push('');
        });
      }
    } else {
      lines.push(chalk.green('✅ No issues found! All detected features are baseline compatible.'));
    }
    
    // Recommendations
    if (result.issues.length > 0) {
      lines.push(chalk.bold('💡 Recommendations:'));
      
      if (result.issues.some(i => i.severity === 'error')) {
        lines.push('• Consider using polyfills for non-baseline features');
        lines.push('• Use progressive enhancement for experimental features');
        lines.push('• Check browser support requirements for your project');
      }
      
      if (result.summary.newly > 0) {
        lines.push('• Newly available features are generally safe but may not work in older browsers');
      }
      
      lines.push('• Visit web.dev/baseline for more information about baseline compatibility');
    }
    
    return lines.join('\n');
  }
  
  private formatIssue(issue: any, severity: 'error' | 'warning'): string {
    const icon = severity === 'error' ? '❌' : '⚠️';
    const color = severity === 'error' ? chalk.red : chalk.yellow;
    
    const lines: string[] = [];
    lines.push(color(`${icon} ${issue.feature}`));
    lines.push(`   ${issue.message}`);
    
    if (issue.featureData?.spec) {
      lines.push(`   Spec: ${chalk.blue(issue.featureData.spec)}`);
    }
    
    lines.push(`   Found in ${issue.locations.length} location(s):`);
    
    // Show first few locations
    const locationsToShow = issue.locations.slice(0, 5);
    locationsToShow.forEach((location: any) => {
      const relativePath = location.location.file.replace(process.cwd(), '.');
      lines.push(`     ${relativePath}:${location.location.line}:${location.location.column}`);
      lines.push(`       ${chalk.gray(location.code)}`);
    });
    
    if (issue.locations.length > 5) {
      lines.push(`     ... and ${issue.locations.length - 5} more locations`);
    }
    
    return lines.join('\n');
  }
}