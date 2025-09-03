#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var webFeatures = require("web-features");
var MappingGenerator = /** @class */ (function () {
    function MappingGenerator() {
        this.features = webFeatures.features;
        this.mapping = {
            css: {
                properties: {},
                values: {},
                selectors: {},
                atRules: {}
            },
            js: {
                globalAPIs: {},
                windowAPIs: {},
                elementMethods: {},
                documentMethods: {},
                cssOM: {}
            },
            html: {
                elements: {},
                attributes: {},
                inputTypes: {}
            }
        };
    }
    MappingGenerator.prototype.generate = function () {
        var _this = this;
        console.log('🌱 Generating dynamic mappings from web-features...');
        var featureIds = Object.keys(this.features);
        var mappedCount = 0;
        featureIds.forEach(function (featureId) {
            var feature = _this.features[featureId];
            if (_this.mapCSSFeature(featureId, feature))
                mappedCount++;
            if (_this.mapJSFeature(featureId, feature))
                mappedCount++;
            if (_this.mapHTMLFeature(featureId, feature))
                mappedCount++;
        });
        console.log("\uD83D\uDCCA Mapped ".concat(mappedCount, " features from ").concat(featureIds.length, " total features"));
        this.writeMappings();
    };
    MappingGenerator.prototype.mapCSSFeature = function (featureId, feature) {
        var _this = this;
        var _a, _b;
        var name = ((_a = feature.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        var description = ((_b = feature.description_html) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
        var mapped = false;
        // Map CSS properties by feature ID patterns
        if (featureId.includes('css-') || name.includes('css') || featureId.includes('property')) {
            // Extract property names from feature ID
            var propertyName = featureId.replace(/^css-/, '').replace(/-property$/, '');
            if (propertyName && propertyName !== featureId) {
                this.mapping.css.properties[propertyName] = featureId;
                // Also map kebab-case version
                var kebabCase = propertyName.replace(/([A-Z])/g, '-$1').toLowerCase();
                this.mapping.css.properties[kebabCase] = featureId;
                mapped = true;
            }
        }
        // Enhanced CSS property detection
        if (name.toLowerCase().includes('property') && !name.startsWith('<')) {
            // Extract property name from "property-name property" format
            var propMatch = name.match(/^([a-z-]+)\s+property/i);
            if (propMatch) {
                this.mapping.css.properties[propMatch[1]] = featureId;
                mapped = true;
            }
        }
        // Detect at-rules from feature names
        if (name.startsWith('@')) {
            var atRule = name.split(' ')[0];
            this.mapping.css.atRules[atRule] = featureId;
            mapped = true;
        }
        // Detect CSS functions
        if (name.includes('()') && (featureId.includes('css') || description.includes('css'))) {
            var funcName = name.replace('()', '');
            this.mapping.css.values[name] = featureId;
            mapped = true;
        }
        // Detect CSS selectors
        if ((name.startsWith(':') || name.startsWith('::')) && !name.includes(' ')) {
            this.mapping.css.selectors[name] = featureId;
            mapped = true;
        }
        // Map display values
        if (['grid', 'flexbox', 'flex'].includes(featureId)) {
            var displayValues = {
                'grid': ['grid', 'inline-grid'],
                'flexbox': ['flex', 'inline-flex'],
                'flex': ['flex', 'inline-flex']
            };
            if (displayValues[featureId]) {
                displayValues[featureId].forEach(function (val) {
                    _this.mapping.css.values[val] = featureId;
                });
                mapped = true;
            }
        }
        // Map specific known CSS features
        var cssFeatureMappings = {
            'grid': ['display'],
            'flexbox': ['display'],
            'custom-properties': ['--*'],
            'container-queries': ['container-type', 'container-name', 'container'],
            'backdrop-filter': ['backdrop-filter'],
            'subgrid': ['grid-template-columns', 'grid-template-rows'],
            'cascade-layers': ['@layer'],
            'supports': ['@supports'],
            'keyframes': ['@keyframes'],
            'media-queries': ['@media'],
            'content-visibility': ['content-visibility'],
            'aspect-ratio': ['aspect-ratio'],
            'gap': ['gap', 'row-gap', 'column-gap'],
            'transform': ['transform'],
            'filter': ['filter'],
            'clip-path': ['clip-path']
        };
        if (cssFeatureMappings[featureId]) {
            cssFeatureMappings[featureId].forEach(function (prop) {
                if (prop.startsWith('@')) {
                    _this.mapping.css.atRules[prop] = featureId;
                }
                else {
                    _this.mapping.css.properties[prop] = featureId;
                }
            });
            mapped = true;
        }
        // Map values
        if (featureId === 'grid') {
            this.mapping.css.values['grid'] = featureId;
            this.mapping.css.values['inline-grid'] = featureId;
            mapped = true;
        }
        if (featureId === 'flexbox') {
            this.mapping.css.values['flex'] = featureId;
            this.mapping.css.values['inline-flex'] = featureId;
            mapped = true;
        }
        return mapped;
    };
    MappingGenerator.prototype.mapJSFeature = function (featureId, feature) {
        var _this = this;
        var _a, _b;
        var name = ((_a = feature.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        var description = ((_b = feature.description_html) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
        var mapped = false;
        // Enhanced JavaScript API detection
        // Global functions (like fetch, setTimeout, etc.)
        if (name.includes('()') && !name.includes('.') && !name.includes(' ')) {
            var funcName = name.replace('()', '');
            this.mapping.js.globalAPIs[funcName] = featureId;
            mapped = true;
        }
        // Navigator APIs
        if (name.includes('navigator.') || featureId.includes('navigator')) {
            var apiName = name.includes('navigator.') ? name : "navigator.".concat(featureId.replace(/-/g, ''));
            this.mapping.js.globalAPIs[apiName] = featureId;
            mapped = true;
        }
        // Constructor functions (classes)
        var constructorMatch = name.match(/^([A-Z][a-zA-Z]+)(\s|$)/);
        if (constructorMatch && !name.includes('<') && !name.includes('.')) {
            this.mapping.js.windowAPIs[constructorMatch[1]] = featureId;
            mapped = true;
        }
        // Document/Element methods
        if (name.includes('document.') || name.includes('element.') || description.includes('document.') || description.includes('element.')) {
            var methodMatch = name.match(/\.([\w]+)\(/);
            if (methodMatch) {
                if (name.includes('document.')) {
                    this.mapping.js.documentMethods[methodMatch[1]] = featureId;
                }
                else {
                    this.mapping.js.elementMethods[methodMatch[1]] = featureId;
                }
                mapped = true;
            }
        }
        // Window/Global APIs that end with API
        if (name.includes('api') || featureId.includes('api')) {
            // Try to extract the API name
            if (name.includes(' api')) {
                var apiName = name.replace(' api', '').replace(/\s+/g, '');
                if (apiName && apiName.length > 2) {
                    this.mapping.js.globalAPIs[apiName] = featureId;
                    mapped = true;
                }
            }
        }
        // Map JavaScript APIs by feature ID patterns
        var jsAPIFeatureMappings = {
            'fetch': {
                globalAPIs: ['fetch'],
                windowAPIs: ['Request', 'Response', 'Headers']
            },
            'aborting': {
                windowAPIs: ['AbortController', 'AbortSignal']
            },
            'intersection-observer': {
                windowAPIs: ['IntersectionObserver']
            },
            'resize-observer': {
                windowAPIs: ['ResizeObserver']
            },
            'mutation-observer': {
                windowAPIs: ['MutationObserver']
            },
            'web-bluetooth': {
                globalAPIs: ['navigator.bluetooth']
            },
            'webusb': {
                globalAPIs: ['navigator.usb']
            },
            'webgpu': {
                globalAPIs: ['navigator.gpu']
            },
            'web-serial': {
                globalAPIs: ['navigator.serial']
            },
            'wake-lock': {
                globalAPIs: ['navigator.wakeLock']
            },
            'file-system-access': {
                globalAPIs: ['showOpenFilePicker', 'showSaveFilePicker', 'showDirectoryPicker']
            },
            'dialog': {
                elementMethods: ['showModal', 'show', 'close']
            },
            'fullscreen': {
                elementMethods: ['requestFullscreen'],
                documentMethods: ['exitFullscreen']
            },
            'geolocation': {
                globalAPIs: ['navigator.geolocation']
            },
            'media-devices': {
                globalAPIs: ['navigator.mediaDevices']
            },
            'clipboard-api': {
                globalAPIs: ['navigator.clipboard']
            }
        };
        if (jsAPIFeatureMappings[featureId]) {
            Object.entries(jsAPIFeatureMappings[featureId]).forEach(function (_a) {
                var category = _a[0], apis = _a[1];
                apis.forEach(function (api) {
                    _this.mapping.js[category][api] = featureId;
                });
            });
            mapped = true;
        }
        return mapped;
    };
    MappingGenerator.prototype.mapHTMLFeature = function (featureId, feature) {
        var _this = this;
        var _a, _b;
        var name = ((_a = feature.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        var description = ((_b = feature.description_html) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
        var mapped = false;
        // Map HTML elements directly from feature name
        if (name.startsWith('<') && name.endsWith('>')) {
            var elementName = name.slice(1, -1);
            this.mapping.html.elements[elementName] = featureId;
            mapped = true;
        }
        // Enhanced HTML element detection
        if (name.includes('element') && !name.includes('api')) {
            // Extract element name from "elementname element" or "the elementname element"
            var elementMatch = name.match(/(?:the\s+)?([a-z]+)\s+element/i);
            if (elementMatch) {
                this.mapping.html.elements[elementMatch[1]] = featureId;
                mapped = true;
            }
        }
        // Input types
        if (name.includes('input type=') || featureId.includes('input-')) {
            var typeMatch = name.match(/input\s+type="([^"]+)"/i) || featureId.match(/input-(.+)/);
            if (typeMatch) {
                this.mapping.html.inputTypes[typeMatch[1]] = featureId;
                mapped = true;
            }
        }
        // Attributes
        if (name.includes('attribute') || featureId.endsWith('-attribute')) {
            var attrMatch = name.match(/([a-z-]+)\s+attribute/i) || featureId.match(/([a-z-]+)-attribute/);
            if (attrMatch) {
                this.mapping.html.attributes[attrMatch[1]] = featureId;
                mapped = true;
            }
        }
        // Single word HTML features (likely elements)
        if (!name.includes(' ') && !name.includes('.') && !name.includes('()') && !name.includes(':') &&
            !name.includes('@') && name.length > 1 && name.length < 15 &&
            /^[a-z-]+$/.test(name) && !featureId.includes('css') && !featureId.includes('api')) {
            this.mapping.html.elements[name] = featureId;
            mapped = true;
        }
        // Map specific HTML features
        var htmlFeatureMappings = {
            'dialog': {
                elements: ['dialog']
            },
            'details': {
                elements: ['details', 'summary']
            },
            'picture': {
                elements: ['picture']
            },
            'template': {
                elements: ['template']
            },
            'canvas': {
                elements: ['canvas']
            },
            'video': {
                elements: ['video']
            },
            'audio': {
                elements: ['audio']
            },
            'input-email': {
                inputTypes: ['email']
            },
            'input-date': {
                inputTypes: ['date']
            },
            'input-color': {
                inputTypes: ['color']
            },
            'input-range': {
                inputTypes: ['range']
            },
            'input-number': {
                inputTypes: ['number']
            },
            'contenteditable': {
                attributes: ['contenteditable']
            },
            'draggable': {
                attributes: ['draggable']
            },
            'hidden': {
                attributes: ['hidden']
            },
            'loading': {
                attributes: ['loading']
            }
        };
        if (htmlFeatureMappings[featureId]) {
            Object.entries(htmlFeatureMappings[featureId]).forEach(function (_a) {
                var category = _a[0], items = _a[1];
                items.forEach(function (item) {
                    _this.mapping.html[category][item] = featureId;
                });
            });
            mapped = true;
        }
        return mapped;
    };
    MappingGenerator.prototype.writeMappings = function () {
        var mappingsDir = path.join(__dirname, '../../mappings');
        // Ensure mappings directory exists
        if (!fs.existsSync(mappingsDir)) {
            fs.mkdirSync(mappingsDir, { recursive: true });
        }
        // Write CSS mappings
        fs.writeFileSync(path.join(mappingsDir, 'css-features-generated.json'), JSON.stringify({
            properties: this.mapping.css.properties,
            values: this.mapping.css.values,
            selectors: this.mapping.css.selectors,
            'at-rules': this.mapping.css.atRules
        }, null, 2));
        // Write JS mappings
        fs.writeFileSync(path.join(mappingsDir, 'js-apis-generated.json'), JSON.stringify(this.mapping.js, null, 2));
        // Write HTML mappings
        fs.writeFileSync(path.join(mappingsDir, 'html-features-generated.json'), JSON.stringify(this.mapping.html, null, 2));
        // Write combined mapping for easier access
        fs.writeFileSync(path.join(mappingsDir, 'all-features-generated.json'), JSON.stringify({
            metadata: {
                generatedAt: new Date().toISOString(),
                webFeaturesVersion: this.getWebFeaturesVersion(),
                totalFeatures: Object.keys(this.features).length,
                mappedFeatures: this.countMappedFeatures()
            },
            css: this.mapping.css,
            js: this.mapping.js,
            html: this.mapping.html
        }, null, 2));
        console.log('✅ Generated mapping files:');
        console.log('  - css-features-generated.json');
        console.log('  - js-apis-generated.json');
        console.log('  - html-features-generated.json');
        console.log('  - all-features-generated.json');
    };
    MappingGenerator.prototype.getWebFeaturesVersion = function () {
        try {
            var packageJson = require('../../node_modules/web-features/package.json');
            return packageJson.version;
        }
        catch (_a) {
            return 'unknown';
        }
    };
    MappingGenerator.prototype.countMappedFeatures = function () {
        var count = 0;
        count += Object.keys(this.mapping.css.properties).length;
        count += Object.keys(this.mapping.css.values).length;
        count += Object.keys(this.mapping.css.selectors).length;
        count += Object.keys(this.mapping.css.atRules).length;
        count += Object.keys(this.mapping.js.globalAPIs).length;
        count += Object.keys(this.mapping.js.windowAPIs).length;
        count += Object.keys(this.mapping.js.elementMethods).length;
        count += Object.keys(this.mapping.js.documentMethods).length;
        count += Object.keys(this.mapping.js.cssOM).length;
        count += Object.keys(this.mapping.html.elements).length;
        count += Object.keys(this.mapping.html.attributes).length;
        count += Object.keys(this.mapping.html.inputTypes).length;
        return count;
    };
    return MappingGenerator;
}());
// Run the generator
if (require.main === module) {
    var generator = new MappingGenerator();
    generator.generate();
}
