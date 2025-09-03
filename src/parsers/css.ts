import * as csstree from 'css-tree';
import * as path from 'path';
import * as fs from 'fs';
import { DetectedFeature } from './javascript';

interface CSSFeatureMappings {
  properties: { [key: string]: string };
  values: { [key: string]: string };
  selectors: { [key: string]: string };
  'at-rules': { [key: string]: string };
}

export class CSSParser {
  private detectedFeatures: DetectedFeature[] = [];
  private cssFeatures: CSSFeatureMappings;
  
  constructor() {
    this.cssFeatures = this.loadCSSMappings();
  }
  
  private loadCSSMappings(): CSSFeatureMappings {
    try {
      const mappingsPath = path.join(__dirname, '../../mappings/css-features-generated.json');
      const fallbackPath = path.join(__dirname, '../../mappings/css-features.json');
      
      // Try generated mappings first, fallback to static if not found
      const mappingsFile = fs.existsSync(mappingsPath) ? mappingsPath : fallbackPath;
      const content = fs.readFileSync(mappingsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Could not load CSS mappings, using empty mappings:', error);
      return { properties: {}, values: {}, selectors: {}, 'at-rules': {} };
    }
  }
  
  parse(code: string, filepath: string): DetectedFeature[] {
    this.detectedFeatures = [];
    
    try {
      const ast = csstree.parse(code, {
        filename: filepath,
        positions: true
      });
      
      csstree.walk(ast, (node) => {
        this.processNode(node, filepath);
      });
    } catch (error) {
      console.warn(`Failed to parse CSS in ${filepath}:`, error);
    }
    
    return this.detectedFeatures;
  }
  
  private processNode(node: any, filepath: string) {
    // Check CSS properties
    if (node.type === 'Declaration') {
      const property = node.property;
      
      if (this.cssFeatures.properties[property]) {
        this.addFeature(
          this.cssFeatures.properties[property],
          filepath,
          node.loc?.start || { line: 1, column: 0 },
          property,
          'css-property'
        );
      }
      
      // Check values within the declaration
      if (node.value) {
        csstree.walk(node.value, (valueNode) => {
          this.processValue(valueNode, filepath);
        });
      }
    }
    
    // Check at-rules
    if (node.type === 'Atrule') {
      const atRule = `@${node.name}`;
      
      if (this.cssFeatures['at-rules'][atRule]) {
        this.addFeature(
          this.cssFeatures['at-rules'][atRule],
          filepath,
          node.loc?.start || { line: 1, column: 0 },
          atRule,
          'css-property'
        );
      }
    }
    
    // Check selectors
    if (node.type === 'PseudoClassSelector' || node.type === 'PseudoElementSelector') {
      const prefix = node.type === 'PseudoElementSelector' ? '::' : ':';
      let selector = prefix + node.name;
      
      // Handle functional pseudo-classes
      if (node.children) {
        selector += '()';
      }
      
      if (this.cssFeatures.selectors[selector]) {
        this.addFeature(
          this.cssFeatures.selectors[selector],
          filepath,
          node.loc?.start || { line: 1, column: 0 },
          selector,
          'css-selector'
        );
      }
    }
  }
  
  private processValue(node: any, filepath: string) {
    // Check for display values (grid, flex, etc.)
    if (node.type === 'Identifier') {
      const value = node.name;
      
      if (this.cssFeatures.values[value]) {
        this.addFeature(
          this.cssFeatures.values[value],
          filepath,
          node.loc?.start || { line: 1, column: 0 },
          value,
          'css-value'
        );
      }
    }
    
    // Check functions
    if (node.type === 'Function') {
      const func = node.name + '()';
      
      if (this.cssFeatures.values[func]) {
        this.addFeature(
          this.cssFeatures.values[func],
          filepath,
          node.loc?.start || { line: 1, column: 0 },
          func,
          'css-value'
        );
      }
    }
  }
  
  private addFeature(
    feature: string,
    filepath: string,
    loc: { line: number; column: number },
    code: string,
    type: 'css-property' | 'css-value' | 'css-selector'
  ) {
    this.detectedFeatures.push({
      feature,
      location: {
        file: filepath,
        line: loc.line,
        column: loc.column
      },
      code,
      type
    });
  }
}