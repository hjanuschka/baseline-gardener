"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonReporter = void 0;
class JsonReporter {
    generate(result) {
        const report = {
            metadata: {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                tool: 'baseline-gardener'
            },
            summary: {
                totalFiles: result.totalFiles,
                totalFeatures: result.totalFeatures,
                baselineFeatures: result.baselineFeatures,
                nonBaselineFeatures: result.nonBaselineFeatures,
                hasIssues: result.hasIssues,
                breakdown: result.summary
            },
            issues: result.issues.map(issue => ({
                feature: issue.feature,
                severity: issue.severity,
                message: issue.message,
                featureData: issue.featureData ? {
                    id: issue.featureData.id,
                    name: issue.featureData.name,
                    baseline: issue.featureData.status.baseline,
                    spec: issue.featureData.spec,
                    group: issue.featureData.group,
                    support: issue.featureData.status.support
                } : null,
                locations: issue.locations.map(location => ({
                    file: location.location.file,
                    line: location.location.line,
                    column: location.location.column,
                    code: location.code,
                    type: location.type
                }))
            })),
            recommendations: this.generateRecommendations(result)
        };
        return JSON.stringify(report, null, 2);
    }
    generateRecommendations(result) {
        const recommendations = [];
        if (result.issues.some(i => i.severity === 'error')) {
            recommendations.push('Consider using polyfills for non-baseline features');
            recommendations.push('Use progressive enhancement for experimental features');
            recommendations.push('Check browser support requirements for your project');
        }
        if (result.summary.newly > 0) {
            recommendations.push('Newly available features are generally safe but may not work in older browsers');
        }
        if (result.summary.limited > 0) {
            recommendations.push('Limited availability features require careful consideration and testing');
        }
        recommendations.push('Visit web.dev/baseline for more information about baseline compatibility');
        return recommendations;
    }
}
exports.JsonReporter = JsonReporter;
//# sourceMappingURL=json.js.map