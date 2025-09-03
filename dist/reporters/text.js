"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextReporter = void 0;
const chalk_1 = __importDefault(require("chalk"));
class TextReporter {
    generate(result) {
        const lines = [];
        // Header
        lines.push(chalk_1.default.bold.green('🌱 Baseline Gardener Report'));
        lines.push('='.repeat(50));
        lines.push('');
        // Summary
        lines.push(chalk_1.default.bold('📊 Summary:'));
        lines.push(`Files scanned: ${result.totalFiles}`);
        lines.push(`Total features detected: ${result.totalFeatures}`);
        lines.push(`Baseline compatible: ${chalk_1.default.green(result.baselineFeatures)}`);
        lines.push(`Non-baseline features: ${result.nonBaselineFeatures > 0 ? chalk_1.default.red(result.nonBaselineFeatures) : '0'}`);
        lines.push('');
        // Feature breakdown
        lines.push(chalk_1.default.bold('🎯 Feature Breakdown:'));
        lines.push(`${chalk_1.default.green('●')} Widely available: ${result.summary.widely}`);
        lines.push(`${chalk_1.default.yellow('●')} Newly available: ${result.summary.newly}`);
        lines.push(`${chalk_1.default.red('●')} Limited availability: ${result.summary.limited}`);
        lines.push(`${chalk_1.default.gray('●')} Unknown features: ${result.summary.unknown}`);
        lines.push('');
        // Issues
        if (result.issues.length > 0) {
            lines.push(chalk_1.default.bold.red('⚠️  Issues Found:'));
            lines.push('');
            const errorIssues = result.issues.filter(i => i.severity === 'error');
            const warningIssues = result.issues.filter(i => i.severity === 'warning');
            if (errorIssues.length > 0) {
                lines.push(chalk_1.default.bold.red('ERRORS:'));
                errorIssues.forEach(issue => {
                    lines.push(this.formatIssue(issue, 'error'));
                    lines.push('');
                });
            }
            if (warningIssues.length > 0) {
                lines.push(chalk_1.default.bold.yellow('WARNINGS:'));
                warningIssues.forEach(issue => {
                    lines.push(this.formatIssue(issue, 'warning'));
                    lines.push('');
                });
            }
        }
        else {
            lines.push(chalk_1.default.green('✅ No issues found! All detected features are baseline compatible.'));
        }
        // Recommendations
        if (result.issues.length > 0) {
            lines.push(chalk_1.default.bold('💡 Recommendations:'));
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
    formatIssue(issue, severity) {
        const icon = severity === 'error' ? '❌' : '⚠️';
        const color = severity === 'error' ? chalk_1.default.red : chalk_1.default.yellow;
        const lines = [];
        lines.push(color(`${icon} ${issue.feature}`));
        lines.push(`   ${issue.message}`);
        if (issue.featureData?.spec) {
            lines.push(`   Spec: ${chalk_1.default.blue(issue.featureData.spec)}`);
        }
        lines.push(`   Found in ${issue.locations.length} location(s):`);
        // Show first few locations
        const locationsToShow = issue.locations.slice(0, 5);
        locationsToShow.forEach((location) => {
            const relativePath = location.location.file.replace(process.cwd(), '.');
            lines.push(`     ${relativePath}:${location.location.line}:${location.location.column}`);
            lines.push(`       ${chalk_1.default.gray(location.code)}`);
        });
        if (issue.locations.length > 5) {
            lines.push(`     ... and ${issue.locations.length - 5} more locations`);
        }
        return lines.join('\n');
    }
}
exports.TextReporter = TextReporter;
//# sourceMappingURL=text.js.map