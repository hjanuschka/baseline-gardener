import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as path from 'path';
import * as fs from 'fs';

interface JSFeatureMappings {
  globalAPIs: { [key: string]: string };
  windowAPIs: { [key: string]: string };
  elementMethods: { [key: string]: string };
  documentMethods: { [key: string]: string };
  cssOM: { [key: string]: string };
}

export interface DetectedFeature {
  feature: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  code: string;
  type: 'js-api' | 'css-property' | 'css-value' | 'css-selector' | 'html-element';
}

export class JavaScriptParser {
  private detectedFeatures: DetectedFeature[] = [];
  private jsAPIs: JSFeatureMappings;
  
  constructor() {
    this.jsAPIs = this.loadJSMappings();
  }
  
  private loadJSMappings(): JSFeatureMappings {
    try {
      const mappingsPath = path.join(__dirname, '../../mappings/js-apis-generated.json');
      const fallbackPath = path.join(__dirname, '../../mappings/js-apis.json');
      
      // Try generated mappings first, fallback to static if not found
      const mappingsFile = fs.existsSync(mappingsPath) ? mappingsPath : fallbackPath;
      const content = fs.readFileSync(mappingsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Could not load JS mappings, using empty mappings:', error);
      return { globalAPIs: {}, windowAPIs: {}, elementMethods: {}, documentMethods: {}, cssOM: {} };
    }
  }
  
  parse(code: string, filepath: string): DetectedFeature[] {
    this.detectedFeatures = [];
    
    try {
      const ast = parser.parse(code, {
        sourceType: 'unambiguous',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'dynamicImport',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'optionalChaining',
          'nullishCoalescingOperator',
          'logicalAssignment',
          'exportDefaultFrom'
        ]
      });
      
      this.traverseAST(ast, filepath, code);
    } catch (error) {
      console.warn(`Failed to parse ${filepath}:`, error);
    }
    
    return this.detectedFeatures;
  }
  
  private traverseAST(ast: any, filepath: string, code: string) {
    traverse(ast, {
      MemberExpression: (path) => {
        const node = path.node;
        const apiPath = this.getMemberExpressionPath(node);
        
        // Check global APIs
        if (apiPath && this.jsAPIs.globalAPIs[apiPath]) {
          this.addFeature(
            this.jsAPIs.globalAPIs[apiPath],
            filepath,
            node.loc?.start || { line: 1, column: 0 },
            apiPath
          );
        }
      },
      
      NewExpression: (path) => {
        const node = path.node;
        if (node.callee.type === 'Identifier') {
          const className = node.callee.name;
          
          // Check window APIs
          if (this.jsAPIs.windowAPIs[className]) {
            this.addFeature(
              this.jsAPIs.windowAPIs[className],
              filepath,
              node.loc?.start || { line: 1, column: 0 },
              `new ${className}()`
            );
          }
        }
      },
      
      CallExpression: (path) => {
        const node = path.node;
        
        // Check for document methods and other member expression calls
        if (node.callee.type === 'MemberExpression') {
          const apiPath = this.getMemberExpressionPath(node.callee);
          
          if (apiPath?.startsWith('document.')) {
            const method = apiPath.substring(9);
            if (this.jsAPIs.documentMethods[method]) {
              this.addFeature(
                this.jsAPIs.documentMethods[method],
                filepath,
                node.loc?.start || { line: 1, column: 0 },
                apiPath
              );
            }
          }
          
          // Check for element methods
          if (apiPath && apiPath.includes('.')) {
            const method = apiPath.split('.').pop();
            if (method && this.jsAPIs.elementMethods[method]) {
              this.addFeature(
                this.jsAPIs.elementMethods[method],
                filepath,
                node.loc?.start || { line: 1, column: 0 },
                apiPath
              );
            }
          }
          
          // Check CSS API
          if (apiPath && this.jsAPIs.cssOM[apiPath]) {
            this.addFeature(
              this.jsAPIs.cssOM[apiPath],
              filepath,
              node.loc?.start || { line: 1, column: 0 },
              apiPath
            );
          }
          
          // Check global APIs (member expressions)
          if (node.callee.property.type === 'Identifier') {
            const name = node.callee.property.name;
            if (this.jsAPIs.globalAPIs[name]) {
              this.addFeature(
                this.jsAPIs.globalAPIs[name],
                filepath,
                node.loc?.start || { line: 1, column: 0 },
                name
              );
            }
          }
        }
        
        // Check for direct function calls (like fetch())
        if (node.callee.type === 'Identifier') {
          const name = node.callee.name;
          if (this.jsAPIs.globalAPIs[name]) {
            this.addFeature(
              this.jsAPIs.globalAPIs[name],
              filepath,
              node.loc?.start || { line: 1, column: 0 },
              name
            );
          }
        }
      },
      
      Identifier: (path) => {
        const node = path.node;
        const name = node.name;
        
        // Check window APIs as global identifiers
        if (this.jsAPIs.windowAPIs[name]) {
          if (path.isReferencedIdentifier()) {
            this.addFeature(
              this.jsAPIs.windowAPIs[name],
              filepath,
              node.loc?.start || { line: 1, column: 0 },
              name
            );
          }
        }
      }
    });
  }
  
  private getMemberExpressionPath(node: any): string | null {
    const parts: string[] = [];
    let current = node;
    
    while (current && current.type === 'MemberExpression') {
      if (current.property.type === 'Identifier') {
        parts.unshift(current.property.name);
      } else if (current.property.type === 'StringLiteral') {
        parts.unshift(current.property.value);
      }
      current = current.object;
    }
    
    if (current && current.type === 'Identifier') {
      parts.unshift(current.name);
    }
    
    return parts.length > 0 ? parts.join('.') : null;
  }
  
  private addFeature(
    feature: string,
    filepath: string,
    loc: { line: number; column: number },
    code: string
  ) {
    this.detectedFeatures.push({
      feature,
      location: {
        file: filepath,
        line: loc.line,
        column: loc.column
      },
      code,
      type: 'js-api'
    });
  }
}