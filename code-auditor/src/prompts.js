// ==========================================
// ENHANCED PROMPTS - FORCES ISSUE DETECTION
// ==========================================

/**
 * Builds ultra-deep audit prompt with MANDATORY issue detection
 */
export function buildAuditPrompt(component, files) {
  const filesContent = files.map(f => {
    return `
═══════════════════════════════════════════
FILE: ${f.path}
Lines: ${f.lines} | Size: ${f.size} bytes
═══════════════════════════════════════════

${f.content}
`;
  }).join('\n\n');

  return `
You are an ELITE code auditor performing SURGICAL PRECISION analysis.

MISSION: Find EVERY issue with EXACT locations. Be OBSESSIVELY critical.

⚠️ CRITICAL: You MUST find at least 5-10 issues. Do NOT return empty arrays.
⚠️ Even if code looks good, find improvements, optimizations, or potential issues.

COMPONENT: ${component}
FILES: ${files.length}
TOTAL LINES: ${files.reduce((sum, f) => sum + f.lines, 0)}

═══════════════════════════════════════════
📁 FILES WITH LINE NUMBERS
═══════════════════════════════════════════

${filesContent}

═══════════════════════════════════════════
🎯 MANDATORY CHECKS (Find issues in ALL categories)
═══════════════════════════════════════════

## 1. SECURITY (Find at least 2 issues)

### Authentication & Authorization
For EVERY API route and component:
- [ ] Missing authentication checks (getServerSession)
- [ ] Missing user validation
- [ ] No authorization checks
- [ ] Exposed sensitive data
- [ ] Missing rate limiting

### Input Validation
For EVERY user input:
- [ ] No input sanitization
- [ ] Missing length limits
- [ ] No type validation
- [ ] SQL injection risks (%, _, ', ")
- [ ] XSS risks (<script>, onerror)

**YOU MUST FIND AT LEAST 2 SECURITY ISSUES**

---

## 2. BUGS & ERRORS (Find at least 3 issues)

### Null/Undefined
- [ ] Missing null checks (data.map without ?)
- [ ] No optional chaining
- [ ] Accessing properties without validation
- [ ] Missing fallback values

### Async Operations
- [ ] Missing try/catch blocks
- [ ] No error handling
- [ ] Missing loading states
- [ ] Race conditions in setState

### Type Issues
- [ ] Using 'any' type
- [ ] Missing type definitions
- [ ] Incorrect return types

**YOU MUST FIND AT LEAST 3 BUG/ERROR ISSUES**

---

## 3. PERFORMANCE (Find at least 2 issues)

### React Performance
- [ ] Missing React.memo
- [ ] No useCallback on functions
- [ ] No useMemo on expensive calculations
- [ ] Wrong useEffect dependencies
- [ ] Re-renders on every parent change

### Database
- [ ] N+1 query problems
- [ ] Missing pagination
- [ ] No caching
- [ ] Inefficient queries

**YOU MUST FIND AT LEAST 2 PERFORMANCE ISSUES**

---

## 4. CODE QUALITY (Find at least 2 issues)

### Error Handling
- [ ] Generic error messages
- [ ] Errors not shown to user
- [ ] No error logging
- [ ] Missing error boundaries

### Loading States
- [ ] Loading state not cleared in finally
- [ ] No loading indicators
- [ ] Duplicate request prevention missing

### Accessibility
- [ ] Missing aria-labels
- [ ] No keyboard navigation
- [ ] Poor color contrast
- [ ] Missing alt text on images

**YOU MUST FIND AT LEAST 2 CODE QUALITY ISSUES**

---

═══════════════════════════════════════════
📊 OUTPUT FORMAT - JSON ONLY
═══════════════════════════════════════════

⚠️ CRITICAL REQUIREMENTS:
1. You MUST find issues in every category
2. You MUST return at least 10 total issues
3. Each issue MUST have exact file path and line number
4. Each issue MUST have currentCode snippet
5. DO NOT return empty arrays for critical/high/medium/low

Return ONLY valid JSON in this EXACT format:

{
  "summary": "Found X critical, Y high, Z medium, W low issues across N files",
  "critical": [
    {
      "issue": "Missing Authentication Check",
      "description": "Detailed explanation of what's wrong",
      "impact": "Specific impact and consequences",
      "location": "exact/file/path.ts:123",
      "currentCode": "const data = await fetch()\\nreturn data",
      "category": "security"
    }
  ],
  "high": [...],
  "medium": [...],
  "low": [...],
  "recommendations": [
    {
      "priority": "Critical",
      "action": "Specific action to take",
      "description": "Detailed description of recommendation"
    }
  ],
  "filesAffected": ["file1.ts", "file2.tsx", ...]
}

EXAMPLES OF ISSUES YOU SHOULD FIND:

1. **Missing Null Check** (MEDIUM)
   - Location: components/file.tsx:45
   - Current: data.map(x => x.name)
   - Issue: data could be null/undefined

2. **No Error Handling** (HIGH)
   - Location: api/route.ts:23
   - Current: const result = await fetch()
   - Issue: No try/catch, errors crash app

3. **Missing Authentication** (CRITICAL)
   - Location: api/route.ts:12
   - Current: export async function GET() { return data }
   - Issue: No session validation

4. **No Loading State** (MEDIUM)
   - Location: component.tsx:67
   - Current: setLoading(true); await fetch();
   - Issue: Loading never cleared on error

5. **Missing Memo** (LOW)
   - Location: component.tsx:34
   - Current: <ExpensiveComponent data={data} />
   - Issue: Re-renders on every parent render

⚠️ FIND REAL ISSUES LIKE THESE IN THE CODE PROVIDED!

REMEMBER:
- Empty arrays = FAILURE
- Less than 10 issues = FAILURE
- Missing line numbers = FAILURE
- Generic descriptions = FAILURE

BE CRITICAL. BE THOROUGH. FIND EVERYTHING.

Start analysis now.
`;
}

/**
 * Add line numbers to code for precise location tracking
 */
function addLineNumbers(content) {
  return content
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n');
}

export default {
  buildAuditPrompt
};