import { Reporter } from './index';
import { ScanResult } from '../scanner';
export declare class AIReporter implements Reporter {
    generate(result: ScanResult): string;
    private groupIssuesByFile;
    private getStatusBadge;
    private getLanguageFromType;
    private generateFixSuggestion;
}
//# sourceMappingURL=ai.d.ts.map