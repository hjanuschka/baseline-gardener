import { DetectedFeature } from './parsers/javascript';
import { Feature } from './baseline/data-loader';
export interface ScanOptions {
    format?: 'text' | 'json' | 'markdown' | 'sarif';
    requireBaseline?: 'widely' | 'newly';
    allowExperimental?: boolean;
    updateBaseline?: boolean;
    minAge?: string;
    config?: string;
}
export interface ScanResult {
    hasIssues: boolean;
    totalFiles: number;
    totalFeatures: number;
    baselineFeatures: number;
    nonBaselineFeatures: number;
    issues: BaselineIssue[];
    summary: {
        widely: number;
        newly: number;
        limited: number;
        unknown: number;
    };
}
export interface BaselineIssue {
    feature: string;
    featureData: Feature | undefined;
    severity: 'error' | 'warning' | 'info';
    message: string;
    locations: DetectedFeature[];
}
export declare class ProjectScanner {
    private jsParser;
    private cssParser;
    private htmlParser;
    private baselineLoader;
    constructor();
    scan(projectPath: string, options?: ScanOptions): Promise<ScanResult>;
    private scanFile;
    private parseVueFile;
    private parseSvelteFile;
}
export declare function scanProject(path: string, options: ScanOptions): Promise<ScanResult>;
//# sourceMappingURL=scanner.d.ts.map