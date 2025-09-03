import * as webFeatures from 'web-features';

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

export class BaselineDataLoader {
  private features: Map<string, Feature> = new Map();
  
  constructor() {
    this.loadFeatures();
  }
  
  private loadFeatures() {
    // Load features from web-features package
    const data = webFeatures as any;
    
    if (data.features) {
      Object.entries(data.features).forEach(([id, feature]: [string, any]) => {
        this.features.set(id, {
          id,
          name: feature.name || id,
          status: {
            baseline: feature.status?.baseline,
            support: feature.status?.support
          },
          spec: feature.spec,
          group: feature.group
        });
      });
    }
  }
  
  getFeature(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }
  
  getBaselineStatus(featureId: string): 'high' | 'low' | false | undefined {
    const feature = this.getFeature(featureId);
    return feature?.status?.baseline;
  }
  
  isBaselineCompatible(featureId: string, minLevel: 'widely' | 'newly' = 'newly'): boolean {
    const status = this.getBaselineStatus(featureId);
    
    if (status === undefined) return true; // Unknown features are allowed
    if (status === false) return false; // Not baseline
    if (minLevel === 'newly') return true; // Both 'high' and 'low' are OK
    if (minLevel === 'widely') return status === 'high'; // Only 'high' is OK
    
    return false;
  }
  
  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }
  
  getFeaturesByGroup(group: string): Feature[] {
    return this.getAllFeatures().filter(f => f.group === group);
  }
}