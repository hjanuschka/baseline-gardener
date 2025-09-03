import { ScanResult } from '../scanner';
import { Reporter } from './index';
export declare class MarkdownReporter implements Reporter {
    generate(result: ScanResult): string;
    private formatIssue;
    private getLanguageFromType;
}
//# sourceMappingURL=markdown.d.ts.map