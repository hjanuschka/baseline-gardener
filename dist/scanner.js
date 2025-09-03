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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectScanner = void 0;
exports.scanProject = scanProject;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const javascript_1 = require("./parsers/javascript");
const css_1 = require("./parsers/css");
const html_1 = require("./parsers/html");
const data_loader_1 = require("./baseline/data-loader");
class ProjectScanner {
    jsParser;
    cssParser;
    htmlParser;
    baselineLoader;
    constructor() {
        this.jsParser = new javascript_1.JavaScriptParser();
        this.cssParser = new css_1.CSSParser();
        this.htmlParser = new html_1.HTMLParser();
        this.baselineLoader = new data_loader_1.BaselineDataLoader();
    }
    async scan(projectPath, options = {}) {
        const detectedFeatures = new Map();
        // Find all relevant files
        const patterns = [
            '**/*.js',
            '**/*.jsx',
            '**/*.ts',
            '**/*.tsx',
            '**/*.css',
            '**/*.scss',
            '**/*.sass',
            '**/*.less',
            '**/*.html',
            '**/*.htm',
            '**/*.vue',
            '**/*.svelte'
        ];
        const files = [];
        for (const pattern of patterns) {
            const matchedFiles = await (0, glob_1.glob)(pattern, {
                cwd: projectPath,
                ignore: [
                    'node_modules/**',
                    'dist/**',
                    'build/**',
                    '*.min.js',
                    '*.min.css',
                    'vendor/**',
                    'lib/**',
                    'coverage/**',
                    '.git/**'
                ]
            });
            files.push(...matchedFiles.map(f => path.resolve(projectPath, f)));
        }
        // Scan each file
        for (const filePath of files) {
            const features = await this.scanFile(filePath);
            features.forEach(feature => {
                if (!detectedFeatures.has(feature.feature)) {
                    detectedFeatures.set(feature.feature, []);
                }
                detectedFeatures.get(feature.feature).push(feature);
            });
        }
        // Analyze results
        const issues = [];
        let totalFeatures = 0;
        let baselineFeatures = 0;
        let nonBaselineFeatures = 0;
        const summary = {
            widely: 0,
            newly: 0,
            limited: 0,
            unknown: 0
        };
        detectedFeatures.forEach((locations, featureId) => {
            totalFeatures++;
            const featureData = this.baselineLoader.getFeature(featureId);
            const baselineStatus = this.baselineLoader.getBaselineStatus(featureId);
            let severity = 'info';
            let message = '';
            if (baselineStatus === 'high') {
                summary.widely++;
                baselineFeatures++;
                message = `Widely available feature (safe to use)`;
                severity = 'info';
            }
            else if (baselineStatus === 'low') {
                summary.newly++;
                if (options.requireBaseline === 'widely') {
                    nonBaselineFeatures++;
                    message = `Newly available feature (requires modern browsers)`;
                    severity = 'warning';
                }
                else {
                    baselineFeatures++;
                    message = `Newly available feature (generally safe to use)`;
                    severity = 'info';
                }
            }
            else if (baselineStatus === false) {
                summary.limited++;
                nonBaselineFeatures++;
                message = `Limited availability feature (not baseline compatible)`;
                severity = 'error';
            }
            else {
                summary.unknown++;
                message = `Unknown feature (not in baseline data)`;
                severity = 'warning';
            }
            // Only create issues for problematic features
            if (severity === 'error' ||
                (severity === 'warning' && !options.allowExperimental)) {
                issues.push({
                    feature: featureId,
                    featureData,
                    severity,
                    message,
                    locations
                });
            }
        });
        return {
            hasIssues: issues.some(i => i.severity === 'error'),
            totalFiles: files.length,
            totalFeatures,
            baselineFeatures,
            nonBaselineFeatures,
            issues,
            summary
        };
    }
    async scanFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath).toLowerCase();
        const features = [];
        try {
            switch (ext) {
                case '.js':
                case '.jsx':
                case '.ts':
                case '.tsx':
                    features.push(...this.jsParser.parse(content, filePath));
                    break;
                case '.css':
                case '.scss':
                case '.sass':
                case '.less':
                    features.push(...this.cssParser.parse(content, filePath));
                    break;
                case '.html':
                case '.htm':
                    features.push(...this.htmlParser.parse(content, filePath));
                    break;
                case '.vue':
                    // Parse Vue SFC components
                    features.push(...this.parseVueFile(content, filePath));
                    break;
                case '.svelte':
                    // Parse Svelte components
                    features.push(...this.parseSvelteFile(content, filePath));
                    break;
            }
        }
        catch (error) {
            console.warn(`Failed to scan ${filePath}:`, error);
        }
        return features;
    }
    parseVueFile(content, filePath) {
        const features = [];
        // Extract <template>, <script>, and <style> blocks
        const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (templateMatch) {
            features.push(...this.htmlParser.parse(templateMatch[1], filePath));
        }
        if (scriptMatch) {
            features.push(...this.jsParser.parse(scriptMatch[1], filePath));
        }
        if (styleMatch) {
            features.push(...this.cssParser.parse(styleMatch[1], filePath));
        }
        return features;
    }
    parseSvelteFile(content, filePath) {
        const features = [];
        // Extract <script> and <style> blocks
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        // Remove script and style blocks to get template
        let template = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        features.push(...this.htmlParser.parse(template, filePath));
        if (scriptMatch) {
            features.push(...this.jsParser.parse(scriptMatch[1], filePath));
        }
        if (styleMatch) {
            features.push(...this.cssParser.parse(styleMatch[1], filePath));
        }
        return features;
    }
}
exports.ProjectScanner = ProjectScanner;
async function scanProject(path, options) {
    const scanner = new ProjectScanner();
    return scanner.scan(path, options);
}
//# sourceMappingURL=scanner.js.map