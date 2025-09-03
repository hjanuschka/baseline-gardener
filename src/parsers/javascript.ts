import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import jsAPIs from '../../mappings/js-apis.json';

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
        if (apiPath && jsAPIs.globalAPIs[apiPath as keyof typeof jsAPIs.globalAPIs]) {
          this.addFeature(
            jsAPIs.globalAPIs[apiPath as keyof typeof jsAPIs.globalAPIs],
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
          if (jsAPIs.windowAPIs[className as keyof typeof jsAPIs.windowAPIs]) {
            this.addFeature(
              jsAPIs.windowAPIs[className as keyof typeof jsAPIs.windowAPIs],
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
            if (jsAPIs.documentMethods[method as keyof typeof jsAPIs.documentMethods]) {
              this.addFeature(
                jsAPIs.documentMethods[method as keyof typeof jsAPIs.documentMethods],
                filepath,
                node.loc?.start || { line: 1, column: 0 },
                apiPath
              );
            }
          }
          
          // Check for element methods
          if (apiPath && apiPath.includes('.')) {
            const method = apiPath.split('.').pop();
            if (method && jsAPIs.elementMethods[method as keyof typeof jsAPIs.elementMethods]) {
              this.addFeature(
                jsAPIs.elementMethods[method as keyof typeof jsAPIs.elementMethods],
                filepath,
                node.loc?.start || { line: 1, column: 0 },
                apiPath
              );
            }
          }
          
          // Check CSS API
          if (apiPath && jsAPIs.cssOM[apiPath as keyof typeof jsAPIs.cssOM]) {
            this.addFeature(
              jsAPIs.cssOM[apiPath as keyof typeof jsAPIs.cssOM],
              filepath,
              node.loc?.start || { line: 1, column: 0 },
              apiPath
            );
          }
          
          // Check fetch APIs (member expressions)
          if (node.callee.property.type === 'Identifier') {
            const name = node.callee.property.name;
            if (jsAPIs.fetchAPIs[name as keyof typeof jsAPIs.fetchAPIs]) {
              this.addFeature(
                jsAPIs.fetchAPIs[name as keyof typeof jsAPIs.fetchAPIs],
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
          if (jsAPIs.fetchAPIs[name as keyof typeof jsAPIs.fetchAPIs]) {
            this.addFeature(
              jsAPIs.fetchAPIs[name as keyof typeof jsAPIs.fetchAPIs],
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
        
        // Check storage APIs
        if (jsAPIs.storageAPIs[name as keyof typeof jsAPIs.storageAPIs]) {
          // Make sure it's actually being accessed, not just declared
          if (path.isReferencedIdentifier()) {
            this.addFeature(
              jsAPIs.storageAPIs[name as keyof typeof jsAPIs.storageAPIs],
              filepath,
              node.loc?.start || { line: 1, column: 0 },
              name
            );
          }
        }
        
        // Check window APIs as global identifiers
        if (jsAPIs.windowAPIs[name as keyof typeof jsAPIs.windowAPIs]) {
          if (path.isReferencedIdentifier()) {
            this.addFeature(
              jsAPIs.windowAPIs[name as keyof typeof jsAPIs.windowAPIs],
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