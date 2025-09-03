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
exports.CSSParser = void 0;
const csstree = __importStar(require("css-tree"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class CSSParser {
    detectedFeatures = [];
    cssFeatures;
    constructor() {
        this.cssFeatures = this.loadCSSMappings();
    }
    loadCSSMappings() {
        try {
            const mappingsPath = path.join(__dirname, '../../mappings/css-features-generated.json');
            const fallbackPath = path.join(__dirname, '../../mappings/css-features.json');
            // Try generated mappings first, fallback to static if not found
            const mappingsFile = fs.existsSync(mappingsPath) ? mappingsPath : fallbackPath;
            const content = fs.readFileSync(mappingsFile, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.warn('Could not load CSS mappings, using empty mappings:', error);
            return { properties: {}, values: {}, selectors: {}, 'at-rules': {} };
        }
    }
    parse(code, filepath) {
        this.detectedFeatures = [];
        try {
            const ast = csstree.parse(code, {
                filename: filepath,
                positions: true
            });
            csstree.walk(ast, (node) => {
                this.processNode(node, filepath);
            });
        }
        catch (error) {
            console.warn(`Failed to parse CSS in ${filepath}:`, error);
        }
        return this.detectedFeatures;
    }
    processNode(node, filepath) {
        // Check CSS properties
        if (node.type === 'Declaration') {
            const property = node.property;
            if (this.cssFeatures.properties[property]) {
                this.addFeature(this.cssFeatures.properties[property], filepath, node.loc?.start || { line: 1, column: 0 }, property, 'css-property');
            }
            // Check values within the declaration
            if (node.value) {
                csstree.walk(node.value, (valueNode) => {
                    this.processValue(valueNode, filepath);
                });
            }
        }
        // Check at-rules
        if (node.type === 'Atrule') {
            const atRule = `@${node.name}`;
            if (this.cssFeatures['at-rules'][atRule]) {
                this.addFeature(this.cssFeatures['at-rules'][atRule], filepath, node.loc?.start || { line: 1, column: 0 }, atRule, 'css-property');
            }
        }
        // Check selectors
        if (node.type === 'PseudoClassSelector' || node.type === 'PseudoElementSelector') {
            const prefix = node.type === 'PseudoElementSelector' ? '::' : ':';
            let selector = prefix + node.name;
            // Handle functional pseudo-classes
            if (node.children) {
                selector += '()';
            }
            if (this.cssFeatures.selectors[selector]) {
                this.addFeature(this.cssFeatures.selectors[selector], filepath, node.loc?.start || { line: 1, column: 0 }, selector, 'css-selector');
            }
        }
    }
    processValue(node, filepath) {
        // Check for display values (grid, flex, etc.)
        if (node.type === 'Identifier') {
            const value = node.name;
            if (this.cssFeatures.values[value]) {
                this.addFeature(this.cssFeatures.values[value], filepath, node.loc?.start || { line: 1, column: 0 }, value, 'css-value');
            }
        }
        // Check functions
        if (node.type === 'Function') {
            const func = node.name + '()';
            if (this.cssFeatures.values[func]) {
                this.addFeature(this.cssFeatures.values[func], filepath, node.loc?.start || { line: 1, column: 0 }, func, 'css-value');
            }
        }
    }
    addFeature(feature, filepath, loc, code, type) {
        this.detectedFeatures.push({
            feature,
            location: {
                file: filepath,
                line: loc.line,
                column: loc.column
            },
            code,
            type
        });
    }
}
exports.CSSParser = CSSParser;
//# sourceMappingURL=css.js.map