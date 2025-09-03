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
exports.HTMLParser = void 0;
const htmlparser2 = __importStar(require("htmlparser2"));
const css_1 = require("./css");
const javascript_1 = require("./javascript");
class HTMLParser {
    cssParser;
    jsParser;
    constructor() {
        this.cssParser = new css_1.CSSParser();
        this.jsParser = new javascript_1.JavaScriptParser();
    }
    parse(code, filepath) {
        const features = [];
        const dom = htmlparser2.parseDocument(code, {
            withStartIndices: true,
            withEndIndices: true
        });
        this.walkDOM(dom, (element) => {
            // Check for inline styles
            if (element.attribs?.style) {
                const styleFeatures = this.cssParser.parse(`dummy { ${element.attribs.style} }`, filepath);
                features.push(...styleFeatures);
            }
            // Check for <style> tags
            if (element.name === 'style' && element.children) {
                const cssContent = this.getTextContent(element);
                if (cssContent) {
                    const cssFeatures = this.cssParser.parse(cssContent, filepath);
                    features.push(...cssFeatures);
                }
            }
            // Check for <script> tags
            if (element.name === 'script' && element.children) {
                const jsContent = this.getTextContent(element);
                if (jsContent) {
                    const jsFeatures = this.jsParser.parse(jsContent, filepath);
                    features.push(...jsFeatures);
                }
            }
            // Check for event handlers
            Object.keys(element.attribs || {}).forEach(attr => {
                if (attr.startsWith('on')) {
                    const jsFeatures = this.jsParser.parse(element.attribs[attr], filepath);
                    features.push(...jsFeatures);
                }
            });
            // Check for HTML5 elements and attributes
            features.push(...this.checkHTML5Features(element, filepath));
        });
        return features;
    }
    walkDOM(node, callback) {
        if (node.type === 'tag') {
            callback(node);
        }
        if (node.children) {
            node.children.forEach(child => this.walkDOM(child, callback));
        }
    }
    getTextContent(element) {
        let text = '';
        if (element.children) {
            element.children.forEach((child) => {
                if (child.type === 'text') {
                    text += child.data || '';
                }
                else if (child.children) {
                    text += this.getTextContent(child);
                }
            });
        }
        return text;
    }
    checkHTML5Features(element, filepath) {
        const features = [];
        // Map of HTML5 elements to feature IDs
        const html5Elements = {
            'dialog': 'dialog',
            'details': 'details',
            'summary': 'details',
            'picture': 'picture',
            'template': 'template',
            'slot': 'web-components',
            'canvas': 'canvas',
            'video': 'video',
            'audio': 'audio',
            'source': 'media-source',
            'track': 'track',
            'meter': 'meter',
            'progress': 'progress',
            'output': 'output',
            'datalist': 'datalist',
            'keygen': 'keygen',
            'main': 'main',
            'nav': 'nav',
            'article': 'article',
            'aside': 'aside',
            'header': 'header',
            'footer': 'footer',
            'section': 'section'
        };
        // Map of HTML5 attributes to feature IDs
        const html5Attributes = {
            'contenteditable': 'contenteditable',
            'draggable': 'drag-drop',
            'dropzone': 'drag-drop',
            'hidden': 'hidden',
            'spellcheck': 'spellcheck',
            'translate': 'translate',
            'download': 'download',
            'srcset': 'srcset',
            'sizes': 'srcset',
            'loading': 'lazy-loading',
            'decoding': 'decoding',
            'fetchpriority': 'fetch-priority',
            'crossorigin': 'cors',
            'integrity': 'subresource-integrity',
            'referrerpolicy': 'referrer-policy',
            'autocomplete': 'autocomplete',
            'autofocus': 'autofocus',
            'form': 'form-association',
            'formaction': 'form-submission',
            'formenctype': 'form-submission',
            'formmethod': 'form-submission',
            'formnovalidate': 'form-validation',
            'formtarget': 'form-submission',
            'inputmode': 'inputmode',
            'list': 'datalist',
            'multiple': 'multiple',
            'pattern': 'pattern',
            'placeholder': 'placeholder',
            'readonly': 'readonly',
            'required': 'required',
            'step': 'step'
        };
        // Check element name
        if (html5Elements[element.name]) {
            features.push({
                feature: html5Elements[element.name],
                location: {
                    file: filepath,
                    line: this.getLineNumber(element.startIndex || 0, filepath),
                    column: 0
                },
                code: `<${element.name}>`,
                type: 'html-element'
            });
        }
        // Check attributes
        Object.keys(element.attribs || {}).forEach(attr => {
            if (html5Attributes[attr]) {
                features.push({
                    feature: html5Attributes[attr],
                    location: {
                        file: filepath,
                        line: this.getLineNumber(element.startIndex || 0, filepath),
                        column: 0
                    },
                    code: `${attr}="${element.attribs[attr]}"`,
                    type: 'html-element'
                });
            }
            // Check for input types
            if (element.name === 'input' && attr === 'type') {
                const inputTypes = {
                    'color': 'input-color',
                    'date': 'input-date',
                    'datetime': 'input-datetime',
                    'datetime-local': 'input-datetime-local',
                    'email': 'input-email',
                    'month': 'input-month',
                    'number': 'input-number',
                    'range': 'input-range',
                    'search': 'input-search',
                    'tel': 'input-tel',
                    'time': 'input-time',
                    'url': 'input-url',
                    'week': 'input-week'
                };
                if (inputTypes[element.attribs[attr]]) {
                    features.push({
                        feature: inputTypes[element.attribs[attr]],
                        location: {
                            file: filepath,
                            line: this.getLineNumber(element.startIndex || 0, filepath),
                            column: 0
                        },
                        code: `<input type="${element.attribs[attr]}">`,
                        type: 'html-element'
                    });
                }
            }
        });
        return features;
    }
    getLineNumber(index, content) {
        const lines = content.substring(0, index).split('\n');
        return lines.length;
    }
}
exports.HTMLParser = HTMLParser;
//# sourceMappingURL=html.js.map