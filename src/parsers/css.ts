import * as csstree from 'css-tree';
import cssFeatures from '../../mappings/css-features.json';
import { DetectedFeature } from './javascript';

export class CSSParser {
  private detectedFeatures: DetectedFeature[] = [];
  
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
      
      if (cssFeatures.properties[property as keyof typeof cssFeatures.properties]) {
        this.addFeature(
          cssFeatures.properties[property as keyof typeof cssFeatures.properties],
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
      
      if (cssFeatures['at-rules'][atRule as keyof typeof cssFeatures['at-rules']]) {
        this.addFeature(
          cssFeatures['at-rules'][atRule as keyof typeof cssFeatures['at-rules']],
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
      
      if (cssFeatures.selectors[selector as keyof typeof cssFeatures.selectors]) {
        this.addFeature(
          cssFeatures.selectors[selector as keyof typeof cssFeatures.selectors],
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
      
      if (cssFeatures.values[value as keyof typeof cssFeatures.values]) {
        this.addFeature(
          cssFeatures.values[value as keyof typeof cssFeatures.values],
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
      
      if (cssFeatures.values[func as keyof typeof cssFeatures.values]) {
        this.addFeature(
          cssFeatures.values[func as keyof typeof cssFeatures.values],
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