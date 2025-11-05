import Anthropic from "@anthropic-ai/sdk";

// ═══════════════════════════════════════════
// ULTIMATE SURGICAL FIX GENERATOR V2
// With Rate Limiting + Queue System
// ═══════════════════════════════════════════

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limit: 30,000 tokens/min = 500 tokens/sec
const TOKENS_PER_SECOND = 400; // Safe buffer
const REQUEST_DELAY_MS = 3000; // 3 seconds between requests

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate surgical fix prompt with Claude-powered solutions
 */
export async function generateSurgicalFixPrompt(auditReport, component, files) {
  console.log('\n═══ ULTIMATE SURGICAL FIX GENERATOR V2 ═══');

  // Parse if string
  if (typeof auditReport === 'string') {
    try {
      auditReport = JSON.parse(auditReport);
      console.log('✅ Parsed audit report');
    } catch (e) {
      console.error('❌ Parse failed:', e);
      auditReport = {
        summary: 'Parse error',
        critical: [],
        high: [],
        medium: [],
        low: [],
        recommendations: [],
        filesAffected: []
      };
    }
  }

  const issueCount = countIssues(auditReport);
  const filesAffected = getFilesAffected(auditReport, files);
  const estimatedTime = estimateFixTime(auditReport);

  console.log(`📊 Total issues: ${issueCount}`);
  console.log(`📁 Files affected: ${filesAffected.length}`);
  console.log(`⏱️ Estimated time: ${estimatedTime}`);
  console.log('⏳ Processing with rate limiting (3s delay between requests)...\n');

  // Generate fixes with Claude for each severity level
  // Process sequentially to avoid rate limits
  const criticalFixes = await generateFixesForSeverity(auditReport.critical, 'CRITICAL', files);
  const highFixes = await generateFixesForSeverity(auditReport.high, 'HIGH', files);
  const mediumFixes = await generateFixesForSeverity(auditReport.medium, 'MEDIUM', files);
  const lowFixes = await generateFixesForSeverity(auditReport.low, 'LOW', files);

  const prompt = `# 🔧 SURGICAL FIX INSTRUCTIONS FOR ${component.toUpperCase()}

**CRITICAL: Follow these instructions EXACTLY. Do not improvise or add creative solutions.**

## 📋 Overview

- Component: ${component}
- Total Issues: ${issueCount}
- Files Affected: ${filesAffected.length}
- Estimated Time: ${estimatedTime}
- Breakdown:
  - 🔴 Critical: ${auditReport.critical?.length || 0}
  - 🟡 High: ${auditReport.high?.length || 0}
  - 🟢 Medium: ${auditReport.medium?.length || 0}
  - 🔵 Low: ${auditReport.low?.length || 0}

---

${criticalFixes}

${highFixes}

${mediumFixes}

${lowFixes}

---

## ✅ Verification Checklist

After applying ALL fixes, verify:

${generateVerificationSteps()}

---

## 🚨 CRITICAL RULES

1. **EXACT REPLACEMENTS ONLY**: Replace code EXACTLY as shown. Do not refactor, optimize, or "improve"
2. **LINE NUMBERS**: Use the exact line numbers provided
3. **PRESERVE FORMATTING**: Keep original indentation and spacing
4. **NO EXTRA CHANGES**: Do not modify code not explicitly mentioned
5. **TEST IMMEDIATELY**: Run the verification steps after each fix
6. **ONE FILE AT A TIME**: Complete all fixes in one file before moving to the next

---

## 📁 Files to Modify (in order)

${filesAffected.map((file, i) => `${i + 1}. \`${file}\``).join('\n')}

**Start with file #1 and work sequentially.**

---

## 🆘 If Something Doesn't Work

1. Verify you made the EXACT replacement shown
2. Check you didn't accidentally modify surrounding code
3. Ensure all imports are present
4. Run the verification steps
5. If still broken, revert and try again

---

**Ready? Start with Critical Fix #1 above.**
`;

  return prompt;
}

// ═══════════════════════════════════════════
// CLAUDE-POWERED FIX GENERATION WITH RATE LIMITING
// ═══════════════════════════════════════════

/**
 * Generate fixes for a severity level using Claude (with rate limiting)
 */
async function generateFixesForSeverity(issues, severity, files) {
  if (!issues || issues.length === 0) {
    return `\n## ${getSeverityEmoji(severity)} ${severity} PRIORITY FIXES\n\nNo ${severity.toLowerCase()} priority issues found. ✅\n`;
  }

  console.log(`🤖 Generating ${severity} fixes with Claude (${issues.length} issues)...`);

  let output = `\n## ${getSeverityEmoji(severity)} ${severity} PRIORITY FIXES${severity === 'CRITICAL' ? ' (Must Fix Immediately)' : ''}\n\n`;

  // Process ONE AT A TIME to avoid rate limits
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];

    // Add delay between requests (except first one)
    if (i > 0) {
      console.log(`   ⏳ Waiting ${REQUEST_DELAY_MS/1000}s to respect rate limits...`);
      await sleep(REQUEST_DELAY_MS);
    }

    const fix = await generateSingleFixWithClaude(issue, i + 1, severity, files);
    output += fix;
  }

  return output;
}

/**
 * Generate a single fix using Claude API
 */
async function generateSingleFixWithClaude(issue, number, severity, files) {
  const filePath = extractFilePath(issue.location);
  const lineNumber = extractLineNumber(issue.location);

  try {
    console.log(`  - Fix #${number}: ${issue.issue.substring(0, 50)}...`);

    // Get file content for context
    const fileContent = getFileContent(filePath, files);

    // Create prompt for Claude to generate fix
    const fixPrompt = createFixGenerationPrompt(issue, fileContent, filePath, lineNumber);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.3, // Low temperature for consistent, precise fixes
      messages: [
        {
          role: "user",
          content: fixPrompt,
        },
      ],
    });

    const generatedFix = response.content[0]?.text || '';

    console.log(`    ✅ Generated (${response.usage.input_tokens} in, ${response.usage.output_tokens} out)`);

    // Format the fix
    return formatIssueFix(issue, number, severity, filePath, lineNumber, generatedFix);

  } catch (error) {
    console.error(`    ❌ Error generating fix: ${error.status} ${error.message}`);

    // If rate limit error, wait longer and retry ONCE
    if (error.status === 429) {
      console.log(`    ⏳ Rate limit hit! Waiting 10s and retrying...`);
      await sleep(10000);

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: createFixGenerationPrompt(issue, getFileContent(filePath, files), filePath, lineNumber),
            },
          ],
        });

        const generatedFix = response.content[0]?.text || '';
        console.log(`    ✅ Retry successful!`);
        return formatIssueFix(issue, number, severity, filePath, lineNumber, generatedFix);

      } catch (retryError) {
        console.error(`    ❌ Retry also failed, using fallback`);
      }
    }

    // Fallback to template-based fix
    return formatIssueFix(
      issue, 
      number, 
      severity, 
      filePath, 
      lineNumber, 
      generateFallbackFix(issue, lineNumber)
    );
  }
}

/**
 * Create prompt for Claude to generate the fix
 */
function createFixGenerationPrompt(issue, fileContent, filePath, lineNumber) {
  return `You are an expert code fixer. Generate a SURGICAL, EXACT fix for this issue.

**Issue Details:**
- Title: ${issue.issue}
- Description: ${issue.description}
- Impact: ${issue.impact}
- Category: ${issue.category}
- File: ${filePath}
- Line: ${lineNumber}

**Current Code:**
\`\`\`typescript
${issue.currentCode || 'Not provided'}
\`\`\`

**File Context (surrounding code):**
\`\`\`typescript
${getCodeContext(fileContent, lineNumber, 10)}
\`\`\`

**Your Task:**
Generate the FIXED CODE that resolves this issue completely.

**Requirements:**
1. Provide COMPLETE, WORKING code (not snippets or comments)
2. Include all necessary imports
3. Preserve the original code structure and formatting
4. Fix ONLY what's mentioned in the issue
5. Add brief inline comments explaining changes
6. Ensure the fix is TypeScript/Next.js 14 compatible

**Output Format:**
Return ONLY the fixed code block in this exact format:

\`\`\`typescript
// Line ${lineNumber} - [Brief description of fix]
[COMPLETE FIXED CODE HERE]
\`\`\`

Generate the fix now:`;
}

/**
 * Format the issue fix into markdown
 */
function formatIssueFix(issue, number, severity, filePath, lineNumber, generatedFix) {
  return `
### ${severity} Fix #${number}: ${issue.issue}

**File:** \`${filePath}\`  
**Line:** ${lineNumber}  
**Category:** ${issue.category || 'general'}

---

#### 📍 PROBLEM

${issue.description}

**Impact:**  
${issue.impact}

---

#### ❌ CURRENT CODE (Line ${lineNumber})

\`\`\`typescript
${issue.currentCode || '// Code not provided in audit'}
\`\`\`

---

#### ✅ FIXED CODE

${generatedFix}

---

#### 🧪 VERIFICATION

${generateVerificationForIssue(issue)}

---

═══════════════════════════════════════════

`;
}

/**
 * Generate fallback fix when Claude API fails
 */
function generateFallbackFix(issue, lineNumber) {
  const issueTitle = issue.issue.toLowerCase();

  // SQL Injection
  if (issueTitle.includes('sql injection')) {
    return `\`\`\`typescript
// Line ${lineNumber} - SQL Injection Fix
const sanitizedSearch = search
  .trim()
  .slice(0, 100)
  .replace(/%/g, '\\\\%')
  .replace(/_/g, '\\\\_');

query = query.or(
  \`location_name.ilike.%\${sanitizedSearch}%,address.ilike.%\${sanitizedSearch}%\`
);
\`\`\``;
  }

  // Error Handling
  if (issueTitle.includes('error handling') || issueTitle.includes('try catch') || issueTitle.includes('promise')) {
    return `\`\`\`typescript
// Line ${lineNumber} - Add error handling
try {
  setLoading(true);
  setError(null);

  const response = await fetch('/api/data');

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const data = await response.json();
  setData(data);

} catch (error) {
  console.error('Fetch error:', error);
  setError(error instanceof Error ? error.message : 'An error occurred');
  toast.error('Failed to load data');
} finally {
  setLoading(false);
}
\`\`\``;
  }

  // Null Safety
  if (issueTitle.includes('null') || issueTitle.includes('undefined')) {
    return `\`\`\`typescript
// Line ${lineNumber} - Add null safety
const safeValue = value ?? defaultValue;
const safeProperty = object?.property ?? fallback;

// OR with early return:
if (!data || !Array.isArray(data)) {
  return <div>No data available</div>;
}
\`\`\``;
  }

  // React Performance
  if (issueTitle.includes('memo') || issueTitle.includes('performance') || issueTitle.includes('re-render')) {
    return `\`\`\`typescript
// Line ${lineNumber} - Add memoization
import { memo, useMemo, useCallback } from 'react';

export const Component = memo(function Component(props) {
  const value = useMemo(() => expensiveCalculation(props), [props]);
  const handler = useCallback(() => doSomething(), []);

  return <div>{value}</div>;
});
\`\`\``;
  }

  // Memory Leak
  if (issueTitle.includes('memory leak') || issueTitle.includes('cleanup')) {
    return `\`\`\`typescript
// Line ${lineNumber} - Add cleanup
useEffect(() => {
  const subscription = eventEmitter.on('update', handler);
  const timerId = setInterval(fetch, 5000);

  return () => {
    subscription.unsubscribe();
    clearInterval(timerId);
  };
}, []);
\`\`\``;
  }

  // Generic fallback
  return `\`\`\`typescript
// Line ${lineNumber} - Fix for: ${issue.issue}
// Based on issue: ${issue.description}
// Apply appropriate changes to resolve this issue
// Impact: ${issue.impact}
\`\`\``;
}

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

function getFileContent(filePath, files) {
  const file = files.find(f => 
    f.path === filePath || 
    f.relativePath === filePath ||
    f.path?.endsWith(filePath)
  );
  return file?.content || '';
}

function getCodeContext(fileContent, lineNumber, contextLines = 10) {
  if (!fileContent) return '// File content not available';

  const lines = fileContent.split('\n');
  const lineNum = parseInt(lineNumber) || 0;

  const start = Math.max(0, lineNum - contextLines);
  const end = Math.min(lines.length, lineNum + contextLines);

  return lines
    .slice(start, end)
    .map((line, i) => {
      const actualLine = start + i + 1;
      const marker = actualLine === lineNum ? ' ← ISSUE HERE' : '';
      return `${actualLine}: ${line}${marker}`;
    })
    .join('\n');
}

function extractFilePath(location) {
  if (!location) return 'unknown';
  return location.split(':')[0];
}

function extractLineNumber(location) {
  if (!location) return '?';
  const parts = location.split(':');
  return parts[1] || '?';
}

function getSeverityEmoji(severity) {
  const emojis = {
    'CRITICAL': '🔴',
    'HIGH': '🟡',
    'MEDIUM': '🟢',
    'LOW': '🔵'
  };
  return emojis[severity] || '⚪';
}

function getFilesAffected(auditReport, files) {
  if (auditReport.filesAffected && auditReport.filesAffected.length > 0) {
    return auditReport.filesAffected.filter(f => f && f !== 'undefined');
  }

  const filesFromIssues = new Set();

  ['critical', 'high', 'medium', 'low'].forEach(severity => {
    if (auditReport[severity]) {
      auditReport[severity].forEach(issue => {
        if (issue.location) {
          const filePath = extractFilePath(issue.location);
          if (filePath && filePath !== 'undefined') {
            filesFromIssues.add(filePath);
          }
        }
      });
    }
  });

  if (filesFromIssues.size > 0) {
    return Array.from(filesFromIssues);
  }

  return files.map(f => f.path || f.relativePath || 'unknown');
}

function countIssues(report) {
  let count = 0;
  if (report.critical) count += report.critical.length;
  if (report.high) count += report.high.length;
  if (report.medium) count += report.medium.length;
  if (report.low) count += report.low.length;
  return count;
}

function estimateFixTime(report) {
  const critical = (report.critical?.length || 0) * 30;
  const high = (report.high?.length || 0) * 20;
  const medium = (report.medium?.length || 0) * 10;
  const low = (report.low?.length || 0) * 5;

  const totalMinutes = critical + high + medium + low;

  if (totalMinutes === 0) return '0 minutes';
  if (totalMinutes < 60) return `${totalMinutes} minutes`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function generateVerificationForIssue(issue) {
  return `
1. Apply the fix exactly as shown
2. Run \`npm run build\` to check for errors
3. Test the specific functionality affected
4. Verify no regressions in related features`;
}

function generateVerificationSteps() {
  return `
1. **Compile Check:**
   \`\`\`bash
   npm run build
   \`\`\`
   ✅ Should complete with no TypeScript errors

2. **Linter Check:**
   \`\`\`bash
   npm run lint
   \`\`\`
   ✅ Should pass with no errors

3. **Type Check:**
   \`\`\`bash
   npm run type-check
   \`\`\`
   ✅ Should pass with no type errors

4. **Functional Tests:**
   - Test each fixed functionality manually
   - Verify expected behavior matches
   - Check browser console for errors

5. **Security Check:**
   - Test authentication on protected routes
   - Verify input sanitization
   - Check error messages don't expose sensitive data
`;
}

export default {
  generateSurgicalFixPrompt
};