export interface DetectedFeature {
    feature: string;
    location: {
        file: string;
        line: number;
        column: number;
    };
    code: string;
    type: 'js-api' | 'css-property' | 'css-value' | 'css-selector' | 'html-element';
}
export declare class JavaScriptParser {
    private detectedFeatures;
    private jsAPIs;
    constructor();
    private loadJSMappings;
    parse(code: string, filepath: string): DetectedFeature[];
    private traverseAST;
    private getMemberExpressionPath;
    private addFeature;
}
//# sourceMappingURL=javascript.d.ts.map