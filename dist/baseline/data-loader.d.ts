export interface FeatureStatus {
    baseline: 'high' | 'low' | false | undefined;
    support?: {
        chrome?: string;
        edge?: string;
        firefox?: string;
        safari?: string;
    };
}
export interface Feature {
    id: string;
    name?: string;
    status: FeatureStatus;
    spec?: string;
    group?: string;
}
export declare class BaselineDataLoader {
    private features;
    constructor();
    private loadFeatures;
    getFeature(featureId: string): Feature | undefined;
    getBaselineStatus(featureId: string): 'high' | 'low' | false | undefined;
    isBaselineCompatible(featureId: string, minLevel?: 'widely' | 'newly'): boolean;
    getAllFeatures(): Feature[];
    getFeaturesByGroup(group: string): Feature[];
}
//# sourceMappingURL=data-loader.d.ts.map