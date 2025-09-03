"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SarifReporter = void 0;
// SARIF (Static Analysis Results Interchange Format) v2.1.0
// https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json
class SarifReporter {
    generate(result) {
        const sarif = {
            $schema: 'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json',
            version: '2.1.0',
            runs: [
                {
                    tool: {
                        driver: {
                            name: 'baseline-gardener',
                            version: '1.0.0',
                            informationUri: 'https://github.com/baseline-gardener/baseline-gardener',
                            shortDescription: {
                                text: 'Check web feature baseline compatibility'
                            },
                            fullDescription: {
                                text: 'A tool to scan your codebase and identify web features that are not part of the Baseline standard, helping ensure compatibility across modern browsers.'
                            },
                            rules: this.generateRules(result)
                        }
                    },
                    results: this.generateResults(result),
                    invocations: [
                        {
                            executionSuccessful: true,
                            startTimeUtc: new Date().toISOString(),
                            endTimeUtc: new Date().toISOString()
                        }
                    ]
                }
            ]
        };
        return JSON.stringify(sarif, null, 2);
    }
    generateRules(result) {
        const rules = new Set();
        result.issues.forEach(issue => rules.add(issue.feature));
        return Array.from(rules).map(ruleId => ({
            id: ruleId,
            name: ruleId,
            shortDescription: {
                text: `Usage of ${ruleId} feature`
            },
            fullDescription: {
                text: `This rule detects usage of the ${ruleId} web feature and checks its baseline compatibility status.`
            },
            messageStrings: {
                'non-baseline': {
                    text: 'Non-baseline feature detected: {0}'
                },
                'newly-available': {
                    text: 'Newly available feature detected: {0}'
                },
                'unknown-feature': {
                    text: 'Unknown feature detected: {0}'
                }
            },
            properties: {
                category: 'baseline-compatibility',
                tags: ['web-features', 'baseline', 'compatibility']
            }
        }));
    }
    generateResults(result) {
        const results = [];
        result.issues.forEach(issue => {
            issue.locations.forEach(location => {
                const level = this.mapSeverityToLevel(issue.severity);
                const messageId = this.getMessageId(issue);
                results.push({
                    ruleId: issue.feature,
                    ruleIndex: 0, // Would need proper mapping in real implementation
                    level,
                    message: {
                        id: messageId,
                        arguments: [issue.message]
                    },
                    locations: [
                        {
                            physicalLocation: {
                                artifactLocation: {
                                    uri: this.toRelativePath(location.location.file)
                                },
                                region: {
                                    startLine: location.location.line,
                                    startColumn: location.location.column,
                                    snippet: {
                                        text: location.code
                                    }
                                }
                            }
                        }
                    ],
                    properties: {
                        baselineStatus: issue.featureData?.status?.baseline,
                        featureType: location.type,
                        spec: issue.featureData?.spec
                    }
                });
            });
        });
        return results;
    }
    mapSeverityToLevel(severity) {
        switch (severity) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
            default:
                return 'note';
        }
    }
    getMessageId(issue) {
        if (issue.featureData?.status?.baseline === false) {
            return 'non-baseline';
        }
        if (issue.featureData?.status?.baseline === 'low') {
            return 'newly-available';
        }
        return 'unknown-feature';
    }
    toRelativePath(filePath) {
        return filePath.replace(process.cwd() + '/', '');
    }
}
exports.SarifReporter = SarifReporter;
//# sourceMappingURL=sarif.js.map