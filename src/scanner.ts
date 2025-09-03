import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { JavaScriptParser, DetectedFeature } from './parsers/javascript';
import { CSSParser } from './parsers/css';
import { HTMLParser } from './parsers/html';
import { BaselineDataLoader, Feature } from './baseline/data-loader';

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

export class ProjectScanner {
  private jsParser: JavaScriptParser;
  private cssParser: CSSParser;
  private htmlParser: HTMLParser;
  private baselineLoader: BaselineDataLoader;
  
  constructor() {
    this.jsParser = new JavaScriptParser();
    this.cssParser = new CSSParser();
    this.htmlParser = new HTMLParser();
    this.baselineLoader = new BaselineDataLoader();
  }
  
  async scan(projectPath: string, options: ScanOptions = {}): Promise<ScanResult> {
    const detectedFeatures = new Map<string, DetectedFeature[]>();
    
    // Find all relevant files
    const patterns = [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less',
      '**/*.html',
      '**/*.htm',
      '**/*.vue',
      '**/*.svelte'
    ];
    
    const files: string[] = [];
    for (const pattern of patterns) {
      const matchedFiles = await glob(pattern, {
        cwd: projectPath,
        ignore: [
          'node_modules/**',
          'dist/**',
          'build/**',
          '*.min.js',
          '*.min.css',
          'vendor/**',
          'lib/**',
          'coverage/**',
          '.git/**'
        ]
      });
      files.push(...matchedFiles.map(f => path.resolve(projectPath, f)));
    }
    
    // Scan each file
    for (const filePath of files) {
      const features = await this.scanFile(filePath);
      
      features.forEach(feature => {
        if (!detectedFeatures.has(feature.feature)) {
          detectedFeatures.set(feature.feature, []);
        }
        detectedFeatures.get(feature.feature)!.push(feature);
      });
    }
    
    // Analyze results
    const issues: BaselineIssue[] = [];
    let totalFeatures = 0;
    let baselineFeatures = 0;
    let nonBaselineFeatures = 0;
    
    const summary = {
      widely: 0,
      newly: 0,
      limited: 0,
      unknown: 0
    };
    
    detectedFeatures.forEach((locations, featureId) => {
      totalFeatures++;
      const featureData = this.baselineLoader.getFeature(featureId);
      const baselineStatus = this.baselineLoader.getBaselineStatus(featureId);
      
      let severity: 'error' | 'warning' | 'info' = 'info';
      let message = '';
      
      if (baselineStatus === 'high') {
        summary.widely++;
        baselineFeatures++;
        message = `Widely available feature (safe to use)`;
        severity = 'info';
      } else if (baselineStatus === 'low') {
        summary.newly++;
        if (options.requireBaseline === 'widely') {
          nonBaselineFeatures++;
          message = `Newly available feature (requires modern browsers)`;
          severity = 'warning';
        } else {
          baselineFeatures++;
          message = `Newly available feature (generally safe to use)`;
          severity = 'info';
        }
      } else if (baselineStatus === false) {
        summary.limited++;
        nonBaselineFeatures++;
        message = `Limited availability feature (not baseline compatible)`;
        severity = 'error';
      } else {
        summary.unknown++;
        message = `Unknown feature (not in baseline data)`;
        severity = 'warning';
      }
      
      // Only create issues for problematic features
      if (severity === 'error' || 
          (severity === 'warning' && !options.allowExperimental)) {
        issues.push({
          feature: featureId,
          featureData,
          severity,
          message,
          locations
        });
      }
    });
    
    return {
      hasIssues: issues.some(i => i.severity === 'error'),
      totalFiles: files.length,
      totalFeatures,
      baselineFeatures,
      nonBaselineFeatures,
      issues,
      summary
    };
  }
  
  private async scanFile(filePath: string): Promise<DetectedFeature[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const features: DetectedFeature[] = [];
    
    try {
      switch (ext) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          features.push(...this.jsParser.parse(content, filePath));
          break;
          
        case '.css':
        case '.scss':
        case '.sass':
        case '.less':
          features.push(...this.cssParser.parse(content, filePath));
          break;
          
        case '.html':
        case '.htm':
          features.push(...this.htmlParser.parse(content, filePath));
          break;
          
        case '.vue':
          // Parse Vue SFC components
          features.push(...this.parseVueFile(content, filePath));
          break;
          
        case '.svelte':
          // Parse Svelte components
          features.push(...this.parseSvelteFile(content, filePath));
          break;
      }
    } catch (error) {
      console.warn(`Failed to scan ${filePath}:`, error);
    }
    
    return features;
  }
  
  private parseVueFile(content: string, filePath: string): DetectedFeature[] {
    const features: DetectedFeature[] = [];
    
    // Extract <template>, <script>, and <style> blocks
    const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    
    if (templateMatch) {
      features.push(...this.htmlParser.parse(templateMatch[1], filePath));
    }
    
    if (scriptMatch) {
      features.push(...this.jsParser.parse(scriptMatch[1], filePath));
    }
    
    if (styleMatch) {
      features.push(...this.cssParser.parse(styleMatch[1], filePath));
    }
    
    return features;
  }
  
  private parseSvelteFile(content: string, filePath: string): DetectedFeature[] {
    const features: DetectedFeature[] = [];
    
    // Extract <script> and <style> blocks
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    
    // Remove script and style blocks to get template
    let template = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    features.push(...this.htmlParser.parse(template, filePath));
    
    if (scriptMatch) {
      features.push(...this.jsParser.parse(scriptMatch[1], filePath));
    }
    
    if (styleMatch) {
      features.push(...this.cssParser.parse(styleMatch[1], filePath));
    }
    
    return features;
  }
}

export async function scanProject(path: string, options: ScanOptions): Promise<ScanResult> {
  const scanner = new ProjectScanner();
  return scanner.scan(path, options);
}