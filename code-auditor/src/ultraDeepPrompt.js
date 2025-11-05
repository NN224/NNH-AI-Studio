// ==========================================
// ULTRA-DEEP AUDIT PROMPT
// Finds 99% of issues with surgical precision
// ==========================================

export function buildUltraDeepAuditPrompt(component, files) {
  const filesContent = files.map(f => {
    return `
═══════════════════════════════════════════
FILE: ${f.relativePath}
Lines: ${f.lines} | Size: ${f.size} bytes
═══════════════════════════════════════════

${addLineNumbers(f.content)}
`;
  }).join('\n\n');

  return `
You are an ELITE code auditor performing SURGICAL PRECISION analysis.

MISSION: Find EVERY issue, no matter how small. Be OBSESSIVELY detailed.

COMPONENT: ${component}
FILES: ${files.length}
TOTAL LINES: ${files.reduce((sum, f) => sum + f.lines, 0)}

═══════════════════════════════════════════
📁 FILES WITH LINE NUMBERS
═══════════════════════════════════════════

${filesContent}

═══════════════════════════════════════════
🎯 ULTRA-DEEP ANALYSIS PROTOCOL
═══════════════════════════════════════════

## PHASE 1: SECURITY DEEP SCAN

### 1.1 Authentication & Authorization
For EVERY function/endpoint/component:
- [ ] Is authentication checked?
- [ ] Is authorization verified?
- [ ] Are session tokens validated?
- [ ] Are user roles checked?
- [ ] Can users access others' data?

**Report Format:**
\`\`\`
File: exact/path.ts
Line: XX
Current Code: [paste exact code]
Issue: Missing auth check
Severity: CRITICAL
Impact: Any user can access endpoint
Fix: [paste exact fix with line numbers]
\`\`\`

### 1.2 Input Validation
For EVERY user input:
- [ ] Is input validated?
- [ ] Is input sanitized?
- [ ] Is input escaped?
- [ ] Are there length limits?
- [ ] Are there type checks?

Check for:
- SQL injection (%, _, ', ", --, /*, */)
- XSS (<script>, onerror=, javascript:)
- Path traversal (../, ..\)
- Command injection (;, |, &, \`, $())
- NoSQL injection ($ne, $gt, etc.)

### 1.3 Data Exposure
For EVERY API response:
- [ ] Is sensitive data included?
- [ ] Are passwords/tokens exposed?
- [ ] Is PII properly handled?
- [ ] Are error messages too detailed?
- [ ] Is data filtered by user?

---

## PHASE 2: BUG DETECTION

### 2.1 Null/Undefined Issues
For EVERY variable access:
- [ ] Can it be null?
- [ ] Can it be undefined?
- [ ] Is there a null check?
- [ ] Is optional chaining used?
- [ ] Is there a fallback?

**Find patterns like:**
\`\`\`typescript
data.map() // ❌ data could be null
data?.map() ?? [] // ✅ safe
\`\`\`

### 2.2 Type Errors
For EVERY function call:
- [ ] Are arguments correct type?
- [ ] Are return types correct?
- [ ] Are any types used?
- [ ] Are implicit any warnings?

### 2.3 Async Errors
For EVERY async operation:
- [ ] Is it awaited?
- [ ] Is it wrapped in try/catch?
- [ ] Are errors handled?
- [ ] Is loading state managed?
- [ ] Is cleanup implemented?

**Find patterns like:**
\`\`\`typescript
// ❌ BAD: Not awaited
fetchData()

// ❌ BAD: No error handling
await fetchData()

// ✅ GOOD:
try {
  await fetchData()
} catch (error) {
  handleError(error)
}
\`\`\`

### 2.4 Race Conditions
For EVERY state update:
- [ ] Can setState be called multiple times?
- [ ] Is there proper synchronization?
- [ ] Are there useEffect dependencies?
- [ ] Is cleanup implemented?

**Find patterns like:**
\`\`\`typescript
// ❌ BAD: Race condition
items.forEach(async (item) => {
  await processItem(item)
  setCount(count + 1) // Wrong count!
})

// ✅ GOOD: Sequential
for (const item of items) {
  await processItem(item)
  setCount(prev => prev + 1)
}
\`\`\`

---

## PHASE 3: PERFORMANCE ANALYSIS

### 3.1 Database Queries
For EVERY database query:
- [ ] Is it optimized?
- [ ] Is there an index?
- [ ] Is it paginated?
- [ ] Is it cached?
- [ ] Are there N+1 queries?

**Find patterns like:**
\`\`\`typescript
// ❌ BAD: N+1 query
const users = await db.user.findMany()
for (const user of users) {
  const posts = await db.post.findMany({ userId: user.id })
}

// ✅ GOOD: Single query with join
const users = await db.user.findMany({
  include: { posts: true }
})
\`\`\`

### 3.2 React Performance
For EVERY component:
- [ ] Is React.memo used?
- [ ] Are callbacks memoized?
- [ ] Are values memoized?
- [ ] Is key prop correct?
- [ ] Are deps arrays correct?

**Find patterns like:**
\`\`\`typescript
// ❌ BAD: Re-renders on every parent render
<ExpensiveComponent data={data} />

// ✅ GOOD: Memoized
const MemoizedComponent = React.memo(ExpensiveComponent)
<MemoizedComponent data={data} />
\`\`\`

### 3.3 Memory Leaks
For EVERY useEffect/event listener:
- [ ] Is cleanup implemented?
- [ ] Are listeners removed?
- [ ] Are subscriptions cancelled?
- [ ] Are timers cleared?
- [ ] Are refs cleaned up?

---

## PHASE 4: CODE QUALITY

### 4.1 Error Handling
For EVERY operation that can fail:
- [ ] Is error caught?
- [ ] Is error logged?
- [ ] Is error shown to user?
- [ ] Is retry mechanism present?
- [ ] Is error state cleared?

### 4.2 Loading States
For EVERY async operation:
- [ ] Is loading state set before?
- [ ] Is loading state cleared after?
- [ ] Is loading shown in UI?
- [ ] Is loading state preventing duplicate requests?

### 4.3 Accessibility
For EVERY interactive element:
- [ ] Does it have aria-label?
- [ ] Is it keyboard accessible?
- [ ] Is focus management correct?
- [ ] Is screen reader tested?
- [ ] Is color contrast sufficient?

---

## PHASE 5: ARCHITECTURE

### 5.1 Data Flow
For the entire component:
- [ ] Is data flow clear?
- [ ] Is state management consistent?
- [ ] Are props drilling avoided?
- [ ] Is context used appropriately?

### 5.2 Code Organization
- [ ] Are files too large?
- [ ] Is code duplicated?
- [ ] Are utilities extracted?
- [ ] Is naming consistent?

---

═══════════════════════════════════════════
📊 OUTPUT FORMAT - BE SURGICAL
═══════════════════════════════════════════

For EVERY issue found, use this EXACT format:

## Issue #X: [Title]

**Severity:** CRITICAL | HIGH | MEDIUM | LOW  
**Category:** Security | Bug | Performance | Quality | Accessibility

**File:** \`exact/path/to/file.ts\`  
**Lines:** XXX-YYY

---

### 📍 EXACT LOCATION

The issue is on line XXX. Here's the surrounding code:

\`\`\`typescript
// Line XXX-5 (context before)
some code

// Line XXX (PROBLEM STARTS HERE) ⚠️
problematic code here

// Line YYY (PROBLEM ENDS HERE)
more problematic code

// Line YYY+5 (context after)
some code
\`\`\`

---

### ❌ WHAT'S WRONG

[Detailed explanation of the issue]

**Why it's broken:**
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

**What can go wrong:**
- Scenario 1: [description]
- Scenario 2: [description]

---

### 💥 IMPACT

**User Impact:**
[How users are affected]

**Security Impact:**
[Security implications if any]

**Performance Impact:**
[Performance implications if any]

**Business Impact:**
[Business/operational implications]

---

### 🔍 CURRENT CODE (WITH LINE NUMBERS)

\`\`\`typescript
// Line XXX
current code line 1
// Line XXX+1
current code line 2
// Line XXX+2
current code line 3
\`\`\`

---

### ✅ FIXED CODE (WITH LINE NUMBERS)

**REPLACE lines XXX-YYY with:**

\`\`\`typescript
// Line XXX (FIXED)
fixed code line 1 // [explain what changed]
// Line XXX+1 (FIXED)
fixed code line 2 // [explain what changed]
// Line XXX+2 (NEW)
new code line 3 // [explain why added]
\`\`\`

---

### 📝 CHANGES MADE

1. **Line XXX:** Changed [old] to [new] because [reason]
2. **Line XXX+1:** Added [what] to handle [scenario]
3. **Line XXX+2:** Removed [what] as it was [reason]

---

### 🧪 VERIFICATION STEPS

**Before Fix:**
1. [Step to reproduce bug]
2. [Expected wrong behavior]
3. [Actual wrong behavior]

**After Fix:**
1. [Step to test fix]
2. [Expected correct behavior]
3. [How to verify it works]

**Automated Test:**
\`\`\`typescript
// Paste test code that verifies the fix
test('should handle X correctly', () => {
  // test implementation
})
\`\`\`

---

### 🎯 WHY THIS FIX WORKS

[Detailed explanation of why this solution solves the problem]

**Edge cases handled:**
1. [Edge case 1] - [how it's handled]
2. [Edge case 2] - [how it's handled]

**Alternative solutions considered:**
1. [Alternative 1] - Rejected because [reason]
2. [Alternative 2] - Rejected because [reason]

---

### 🔗 RELATED ISSUES

[List any related issues that should also be fixed]

---

═══════════════════════════════════════════

CRITICAL REQUIREMENTS:
1. ✅ Include EXACT line numbers for EVERY issue
2. ✅ Include EXACT current code (copy-paste from file)
3. ✅ Include EXACT fixed code (complete, not partial)
4. ✅ Include step-by-step verification
5. ✅ Include explanation of WHY fix works
6. ✅ Include edge cases and alternatives
7. ✅ Use line numbers from the code (not approximate)
8. ✅ Be OBSESSIVELY detailed - include EVERYTHING

DO NOT:
❌ Give vague locations like "around line X"
❌ Give partial code fixes
❌ Give generic "add error handling" advice
❌ Skip verification steps
❌ Miss any issues, no matter how small

REMEMBER: The goal is 99% fix accuracy. Every detail matters.

Start analysis now. Find EVERYTHING.
`;
}

function addLineNumbers(content) {
  return content
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n');
}

export default {
  buildUltraDeepAuditPrompt
};