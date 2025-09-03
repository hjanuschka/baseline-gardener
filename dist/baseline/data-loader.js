"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaselineDataLoader = void 0;
const webFeatures = __importStar(require("web-features"));
class BaselineDataLoader {
    features = new Map();
    constructor() {
        this.loadFeatures();
    }
    loadFeatures() {
        // Load features from web-features package
        const data = webFeatures;
        if (data.features) {
            Object.entries(data.features).forEach(([id, feature]) => {
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
    getFeature(featureId) {
        return this.features.get(featureId);
    }
    getBaselineStatus(featureId) {
        const feature = this.getFeature(featureId);
        return feature?.status?.baseline;
    }
    isBaselineCompatible(featureId, minLevel = 'newly') {
        const status = this.getBaselineStatus(featureId);
        if (status === undefined)
            return true; // Unknown features are allowed
        if (status === false)
            return false; // Not baseline
        if (minLevel === 'newly')
            return true; // Both 'high' and 'low' are OK
        if (minLevel === 'widely')
            return status === 'high'; // Only 'high' is OK
        return false;
    }
    getAllFeatures() {
        return Array.from(this.features.values());
    }
    getFeaturesByGroup(group) {
        return this.getAllFeatures().filter(f => f.group === group);
    }
}
exports.BaselineDataLoader = BaselineDataLoader;
//# sourceMappingURL=data-loader.js.map