"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReporter = createReporter;
const text_1 = require("./text");
const json_1 = require("./json");
const markdown_1 = require("./markdown");
const sarif_1 = require("./sarif");
const ai_1 = require("./ai");
function createReporter(format) {
    switch (format.toLowerCase()) {
        case 'json':
            return new json_1.JsonReporter();
        case 'markdown':
        case 'md':
            return new markdown_1.MarkdownReporter();
        case 'sarif':
            return new sarif_1.SarifReporter();
        case 'ai':
            return new ai_1.AIReporter();
        case 'text':
        default:
            return new text_1.TextReporter();
    }
}
//# sourceMappingURL=index.js.map