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
exports.JavaScriptParser = void 0;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class JavaScriptParser {
    detectedFeatures = [];
    jsAPIs;
    constructor() {
        this.jsAPIs = this.loadJSMappings();
    }
    loadJSMappings() {
        try {
            const mappingsPath = path.join(__dirname, '../../mappings/js-apis-generated.json');
            const fallbackPath = path.join(__dirname, '../../mappings/js-apis.json');
            // Try generated mappings first, fallback to static if not found
            const mappingsFile = fs.existsSync(mappingsPath) ? mappingsPath : fallbackPath;
            const content = fs.readFileSync(mappingsFile, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.warn('Could not load JS mappings, using empty mappings:', error);
            return { globalAPIs: {}, windowAPIs: {}, elementMethods: {}, documentMethods: {}, cssOM: {} };
        }
    }
    parse(code, filepath) {
        this.detectedFeatures = [];
        try {
            const ast = parser.parse(code, {
                sourceType: 'unambiguous',
                plugins: [
                    'jsx',
                    'typescript',
                    'decorators-legacy',
                    'dynamicImport',
                    'classProperties',
                    'classPrivateProperties',
                    'classPrivateMethods',
                    'optionalChaining',
                    'nullishCoalescingOperator',
                    'logicalAssignment',
                    'exportDefaultFrom'
                ]
            });
            this.traverseAST(ast, filepath, code);
        }
        catch (error) {
            console.warn(`Failed to parse ${filepath}:`, error);
        }
        return this.detectedFeatures;
    }
    traverseAST(ast, filepath, code) {
        (0, traverse_1.default)(ast, {
            MemberExpression: (path) => {
                const node = path.node;
                const apiPath = this.getMemberExpressionPath(node);
                // Check global APIs
                if (apiPath && this.jsAPIs.globalAPIs[apiPath]) {
                    this.addFeature(this.jsAPIs.globalAPIs[apiPath], filepath, node.loc?.start || { line: 1, column: 0 }, apiPath);
                }
            },
            NewExpression: (path) => {
                const node = path.node;
                if (node.callee.type === 'Identifier') {
                    const className = node.callee.name;
                    // Check window APIs
                    if (this.jsAPIs.windowAPIs[className]) {
                        this.addFeature(this.jsAPIs.windowAPIs[className], filepath, node.loc?.start || { line: 1, column: 0 }, `new ${className}()`);
                    }
                }
            },
            CallExpression: (path) => {
                const node = path.node;
                // Check for document methods and other member expression calls
                if (node.callee.type === 'MemberExpression') {
                    const apiPath = this.getMemberExpressionPath(node.callee);
                    if (apiPath?.startsWith('document.')) {
                        const method = apiPath.substring(9);
                        if (this.jsAPIs.documentMethods[method]) {
                            this.addFeature(this.jsAPIs.documentMethods[method], filepath, node.loc?.start || { line: 1, column: 0 }, apiPath);
                        }
                    }
                    // Check for element methods
                    if (apiPath && apiPath.includes('.')) {
                        const method = apiPath.split('.').pop();
                        if (method && this.jsAPIs.elementMethods[method]) {
                            this.addFeature(this.jsAPIs.elementMethods[method], filepath, node.loc?.start || { line: 1, column: 0 }, apiPath);
                        }
                    }
                    // Check CSS API
                    if (apiPath && this.jsAPIs.cssOM[apiPath]) {
                        this.addFeature(this.jsAPIs.cssOM[apiPath], filepath, node.loc?.start || { line: 1, column: 0 }, apiPath);
                    }
                    // Check global APIs (member expressions)
                    if (node.callee.property.type === 'Identifier') {
                        const name = node.callee.property.name;
                        if (this.jsAPIs.globalAPIs[name]) {
                            this.addFeature(this.jsAPIs.globalAPIs[name], filepath, node.loc?.start || { line: 1, column: 0 }, name);
                        }
                    }
                }
                // Check for direct function calls (like fetch())
                if (node.callee.type === 'Identifier') {
                    const name = node.callee.name;
                    if (this.jsAPIs.globalAPIs[name]) {
                        this.addFeature(this.jsAPIs.globalAPIs[name], filepath, node.loc?.start || { line: 1, column: 0 }, name);
                    }
                }
            },
            Identifier: (path) => {
                const node = path.node;
                const name = node.name;
                // Check window APIs as global identifiers
                if (this.jsAPIs.windowAPIs[name]) {
                    if (path.isReferencedIdentifier()) {
                        this.addFeature(this.jsAPIs.windowAPIs[name], filepath, node.loc?.start || { line: 1, column: 0 }, name);
                    }
                }
            }
        });
    }
    getMemberExpressionPath(node) {
        const parts = [];
        let current = node;
        while (current && current.type === 'MemberExpression') {
            if (current.property.type === 'Identifier') {
                parts.unshift(current.property.name);
            }
            else if (current.property.type === 'StringLiteral') {
                parts.unshift(current.property.value);
            }
            current = current.object;
        }
        if (current && current.type === 'Identifier') {
            parts.unshift(current.name);
        }
        return parts.length > 0 ? parts.join('.') : null;
    }
    addFeature(feature, filepath, loc, code) {
        this.detectedFeatures.push({
            feature,
            location: {
                file: filepath,
                line: loc.line,
                column: loc.column
            },
            code,
            type: 'js-api'
        });
    }
}
exports.JavaScriptParser = JavaScriptParser;
//# sourceMappingURL=javascript.js.map