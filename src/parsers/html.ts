import * as htmlparser2 from 'htmlparser2';
import { CSSParser } from './css';
import { JavaScriptParser } from './javascript';
import { DetectedFeature } from './javascript';

interface HTMLElement {
  name: string;
  attribs: { [key: string]: string };
  children?: HTMLElement[];
  type: string;
  data?: string;
  startIndex?: number;
  endIndex?: number;
}

export class HTMLParser {
  private cssParser: CSSParser;
  private jsParser: JavaScriptParser;
  
  constructor() {
    this.cssParser = new CSSParser();
    this.jsParser = new JavaScriptParser();
  }
  
  parse(code: string, filepath: string): DetectedFeature[] {
    const features: DetectedFeature[] = [];
    
    const dom = htmlparser2.parseDocument(code, {
      withStartIndices: true,
      withEndIndices: true
    });
    
    this.walkDOM(dom as any, (element: HTMLElement) => {
      // Check for inline styles
      if (element.attribs?.style) {
        const styleFeatures = this.cssParser.parse(
          `dummy { ${element.attribs.style} }`,
          filepath
        );
        features.push(...styleFeatures);
      }
      
      // Check for <style> tags
      if (element.name === 'style' && element.children) {
        const cssContent = this.getTextContent(element);
        if (cssContent) {
          const cssFeatures = this.cssParser.parse(cssContent, filepath);
          features.push(...cssFeatures);
        }
      }
      
      // Check for <script> tags
      if (element.name === 'script' && element.children) {
        const jsContent = this.getTextContent(element);
        if (jsContent) {
          const jsFeatures = this.jsParser.parse(jsContent, filepath);
          features.push(...jsFeatures);
        }
      }
      
      // Check for event handlers
      Object.keys(element.attribs || {}).forEach(attr => {
        if (attr.startsWith('on')) {
          const jsFeatures = this.jsParser.parse(
            element.attribs[attr],
            filepath
          );
          features.push(...jsFeatures);
        }
      });
      
      // Check for HTML5 elements and attributes
      features.push(...this.checkHTML5Features(element, filepath));
    });
    
    return features;
  }
  
  private walkDOM(node: HTMLElement, callback: (element: HTMLElement) => void) {
    if (node.type === 'tag') {
      callback(node);
    }
    
    if (node.children) {
      node.children.forEach(child => this.walkDOM(child as any, callback));
    }
  }
  
  private getTextContent(element: HTMLElement): string {
    let text = '';
    
    if (element.children) {
      element.children.forEach((child: any) => {
        if (child.type === 'text') {
          text += child.data || '';
        } else if (child.children) {
          text += this.getTextContent(child);
        }
      });
    }
    
    return text;
  }
  
  private checkHTML5Features(element: HTMLElement, filepath: string): DetectedFeature[] {
    const features: DetectedFeature[] = [];
    
    // Map of HTML5 elements to feature IDs
    const html5Elements: { [key: string]: string } = {
      'dialog': 'dialog',
      'details': 'details',
      'summary': 'details',
      'picture': 'picture',
      'template': 'template',
      'slot': 'web-components',
      'canvas': 'canvas',
      'video': 'video',
      'audio': 'audio',
      'source': 'media-source',
      'track': 'track',
      'meter': 'meter',
      'progress': 'progress',
      'output': 'output',
      'datalist': 'datalist',
      'keygen': 'keygen',
      'main': 'main',
      'nav': 'nav',
      'article': 'article',
      'aside': 'aside',
      'header': 'header',
      'footer': 'footer',
      'section': 'section'
    };
    
    // Map of HTML5 attributes to feature IDs
    const html5Attributes: { [key: string]: string } = {
      'contenteditable': 'contenteditable',
      'draggable': 'drag-drop',
      'dropzone': 'drag-drop',
      'hidden': 'hidden',
      'spellcheck': 'spellcheck',
      'translate': 'translate',
      'download': 'download',
      'srcset': 'srcset',
      'sizes': 'srcset',
      'loading': 'lazy-loading',
      'decoding': 'decoding',
      'fetchpriority': 'fetch-priority',
      'crossorigin': 'cors',
      'integrity': 'subresource-integrity',
      'referrerpolicy': 'referrer-policy',
      'autocomplete': 'autocomplete',
      'autofocus': 'autofocus',
      'form': 'form-association',
      'formaction': 'form-submission',
      'formenctype': 'form-submission',
      'formmethod': 'form-submission',
      'formnovalidate': 'form-validation',
      'formtarget': 'form-submission',
      'inputmode': 'inputmode',
      'list': 'datalist',
      'multiple': 'multiple',
      'pattern': 'pattern',
      'placeholder': 'placeholder',
      'readonly': 'readonly',
      'required': 'required',
      'step': 'step'
    };
    
    // Check element name
    if (html5Elements[element.name]) {
      features.push({
        feature: html5Elements[element.name],
        location: {
          file: filepath,
          line: this.getLineNumber(element.startIndex || 0, filepath),
          column: 0
        },
        code: `<${element.name}>`,
        type: 'html-element'
      });
    }
    
    // Check attributes
    Object.keys(element.attribs || {}).forEach(attr => {
      if (html5Attributes[attr]) {
        features.push({
          feature: html5Attributes[attr],
          location: {
            file: filepath,
            line: this.getLineNumber(element.startIndex || 0, filepath),
            column: 0
          },
          code: `${attr}="${element.attribs[attr]}"`,
          type: 'html-element'
        });
      }
      
      // Check for input types
      if (element.name === 'input' && attr === 'type') {
        const inputTypes: { [key: string]: string } = {
          'color': 'input-color',
          'date': 'input-date',
          'datetime': 'input-datetime',
          'datetime-local': 'input-datetime-local',
          'email': 'input-email',
          'month': 'input-month',
          'number': 'input-number',
          'range': 'input-range',
          'search': 'input-search',
          'tel': 'input-tel',
          'time': 'input-time',
          'url': 'input-url',
          'week': 'input-week'
        };
        
        if (inputTypes[element.attribs[attr]]) {
          features.push({
            feature: inputTypes[element.attribs[attr]],
            location: {
              file: filepath,
              line: this.getLineNumber(element.startIndex || 0, filepath),
              column: 0
            },
            code: `<input type="${element.attribs[attr]}">`,
            type: 'html-element'
          });
        }
      }
    });
    
    return features;
  }
  
  private getLineNumber(index: number, content: string): number {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }
}