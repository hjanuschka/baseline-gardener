import { DetectedFeature } from './javascript';
export declare class HTMLParser {
    private cssParser;
    private jsParser;
    constructor();
    parse(code: string, filepath: string): DetectedFeature[];
    private walkDOM;
    private getTextContent;
    private checkHTML5Features;
    private getLineNumber;
}
//# sourceMappingURL=html.d.ts.map