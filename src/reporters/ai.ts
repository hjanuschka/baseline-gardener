import { Reporter } from './index';
import { ScanResult, BaselineIssue } from '../scanner';
import { DetectedFeature } from '../parsers/javascript';

export class AIReporter implements Reporter {
  generate(result: ScanResult): string {
    const sections: string[] = [];
    
    // Header with context for AI
    sections.push('# Baseline Compatibility Issues - AI Analysis Report');
    sections.push('');
    sections.push('This report is optimized for AI/LLM processing to enable automatic code fixing.');
    sections.push('');
    
    // Summary
    sections.push('## Summary');
    sections.push(`- **Total files scanned:** ${result.totalFiles}`);
    sections.push(`- **Issues found:** ${result.issues.length}`);
    sections.push(`- **Baseline features detected:** ${result.baselineFeatures}`);
    sections.push(`- **Non-baseline features:** ${result.nonBaselineFeatures}`);
    sections.push('');
    
    if (result.issues.length === 0) {
      sections.push('✅ **No baseline compatibility issues found!**');
      return sections.join('\n');
    }
    
    // Group issues by file for easier AI processing
    const issuesByFile = this.groupIssuesByFile(result.issues);
    
    sections.push('## Issues by File');
    sections.push('');
    sections.push('Each issue includes:');
    sections.push('- **Feature:** The detected web feature');
    sections.push('- **Status:** Current baseline status (limited/newly/widely available)');
    sections.push('- **Location:** File path and line number');
    sections.push('- **Code:** The problematic code snippet');
    sections.push('- **Fix:** Suggested baseline-compatible alternative');
    sections.push('');
    
    for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
      sections.push(`### 📄 \`${filePath}\``);
      sections.push('');
      
      fileIssues.forEach((issue, index) => {
        sections.push(`#### Issue ${index + 1}: ${issue.feature}`);
        sections.push('');
        sections.push(`**Status:** ${this.getStatusBadge(issue.featureData?.status?.baseline)}`);
        sections.push(`**Severity:** ${issue.severity}`);
        sections.push('');
        
        // Show all locations for this issue
        if (issue.locations && issue.locations.length > 0) {
          issue.locations.forEach((location, locIndex) => {
            sections.push(`**Location ${locIndex + 1}:**`);
            sections.push(`- **Line:** ${location.location.line}`);
            sections.push(`- **Type:** ${location.type}`);
            sections.push('');
            
            sections.push('**Problematic Code:**');
            sections.push('```' + this.getLanguageFromType(location.type));
            sections.push(location.code.trim());
            sections.push('```');
            sections.push('');
            
            // Add AI-specific fix suggestions
            const fixSuggestion = this.generateFixSuggestion(location);
            if (fixSuggestion) {
              sections.push('**Suggested Fix:**');
              sections.push('```' + this.getLanguageFromType(location.type));
              sections.push(fixSuggestion);
              sections.push('```');
              sections.push('');
            }
          });
        }
        
        // Add explanation
        if (issue.featureData?.status?.baseline === false) {
          sections.push('**Why this is flagged:** This feature has limited browser support and may not work for all users.');
        } else if (issue.featureData?.status?.baseline === 'low') {
          sections.push('**Why this is flagged:** This feature is newly available and may not be supported in older browsers.');
        }
        
        sections.push('');
        sections.push('---');
        sections.push('');
      });
    }
    
    // Add AI processing instructions
    sections.push('## AI Processing Instructions');
    sections.push('');
    sections.push('To automatically fix these issues:');
    sections.push('');
    sections.push('1. **For each file**, locate the problematic code using the line numbers provided');
    sections.push('2. **Replace** the non-baseline code with the suggested baseline-compatible alternative');
    sections.push('3. **Test** the changes to ensure functionality is preserved');
    sections.push('4. **Consider polyfills** for features that are needed but not baseline-compatible');
    sections.push('');
    sections.push('### Common Fix Patterns:');
    sections.push('');
    sections.push('- **CSS Grid → Flexbox:** Use `display: flex` instead of `display: grid` for better support');
    sections.push('- **Modern JS APIs → Polyfilled versions:** Use feature detection or polyfills for newer APIs');
    sections.push('- **CSS Custom Properties → Static values:** Replace CSS variables with static values where appropriate');
    sections.push('- **Modern selectors → Traditional selectors:** Use class-based selectors instead of modern pseudo-selectors');
    sections.push('');
    
    return sections.join('\n');
  }
  
  private groupIssuesByFile(issues: BaselineIssue[]): Record<string, BaselineIssue[]> {
    return issues.reduce((acc, issue) => {
      // Group by first location file if locations exist
      const file = issue.locations?.[0]?.location?.file || 'unknown';
      if (!acc[file]) {
        acc[file] = [];
      }
      acc[file].push(issue);
      return acc;
    }, {} as Record<string, BaselineIssue[]>);
  }
  
  private getStatusBadge(baseline?: 'high' | 'low' | false | undefined): string {
    switch (baseline) {
      case 'high': return '🟢 Widely Available';
      case 'low': return '🟡 Newly Available';  
      case false: return '🔴 Limited Support';
      default: return '❓ Unknown';
    }
  }
  
  private getLanguageFromType(type: string): string {
    if (type.includes('css')) return 'css';
    if (type.includes('js')) return 'javascript';
    if (type.includes('html')) return 'html';
    return '';
  }
  
  private generateFixSuggestion(location: DetectedFeature): string | null {
    const feature = location.feature.toLowerCase();
    const code = location.code.trim();
    
    // CSS fixes
    if (location.type.includes('css')) {
      if (feature.includes('grid')) {
        return code.replace(/display:\s*grid/g, 'display: flex')
                   .replace(/grid-template-columns:[^;]+;?/g, '')
                   .replace(/grid-gap:[^;]+;?/g, 'gap: /* specify value */;');
      }
      
      if (feature.includes('container-queries')) {
        return '/* Use media queries instead */\n@media (min-width: 300px) {\n  /* styles */\n}';
      }
      
      if (feature.includes('backdrop-filter')) {
        return code.replace(/backdrop-filter:[^;]+;?/g, '/* Use alternative background styling */');
      }
    }
    
    // JavaScript fixes
    if (location.type === 'js-api') {
      if (feature.includes('fetch')) {
        return `// Use XMLHttpRequest or axios library instead
const xhr = new XMLHttpRequest();
xhr.open('GET', url);
xhr.onload = function() { /* handle response */ };
xhr.send();`;
      }
      
      if (feature.includes('optional-chaining')) {
        return code.replace(/\?\./g, ' && ');
      }
      
      if (feature.includes('nullish-coalescing')) {
        return code.replace(/\?\?/g, '||');
      }
    }
    
    return null;
  }
}