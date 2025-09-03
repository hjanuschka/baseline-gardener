import { ScanResult } from '../scanner';
import { TextReporter } from './text';
import { JsonReporter } from './json';
import { MarkdownReporter } from './markdown';
import { SarifReporter } from './sarif';
import { AIReporter } from './ai';

export interface Reporter {
  generate(result: ScanResult): string;
}

export function createReporter(format: string): Reporter {
  switch (format.toLowerCase()) {
    case 'json':
      return new JsonReporter();
    case 'markdown':
    case 'md':
      return new MarkdownReporter();
    case 'sarif':
      return new SarifReporter();
    case 'ai':
      return new AIReporter();
    case 'text':
    default:
      return new TextReporter();
  }
}