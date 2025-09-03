import { ScanResult } from '../scanner';
import { Reporter } from './index';
export declare class SarifReporter implements Reporter {
    generate(result: ScanResult): string;
    private generateRules;
    private generateResults;
    private mapSeverityToLevel;
    private getMessageId;
    private toRelativePath;
}
//# sourceMappingURL=sarif.d.ts.map