import { ScanResult } from '../scanner';
export interface Reporter {
    generate(result: ScanResult): string;
}
export declare function createReporter(format: string): Reporter;
//# sourceMappingURL=index.d.ts.map