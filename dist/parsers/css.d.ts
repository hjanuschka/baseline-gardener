import { DetectedFeature } from './javascript';
export declare class CSSParser {
    private detectedFeatures;
    private cssFeatures;
    constructor();
    private loadCSSMappings;
    parse(code: string, filepath: string): DetectedFeature[];
    private processNode;
    private processValue;
    private addFeature;
}
//# sourceMappingURL=css.d.ts.map