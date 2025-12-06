# 🛠️ Production Fix Prompts

> **Generated:** December 5, 2024
> **ESLint Results:** 985 issues (4 errors, 981 warnings)
> **Build Status:** ✅ Passing

This directory contains comprehensive guides for fixing production issues in NNH AI Studio.

---

## 📊 Issue Summary

| Priority        | Category           | Count | Status     |
| --------------- | ------------------ | ----- | ---------- |
| 🚨 **Critical** | ESLint Errors      | 4     | ⏳ Pending |
| 🔴 **High**     | `any` Types        | ~530  | ⏳ Pending |
| 🟠 **Medium**   | Console Statements | ~84   | ⏳ Pending |
| 🟡 **Medium**   | Unused Variables   | ~321  | ⏳ Pending |
| 🔵 **Low**      | React Hooks Deps   | ~41   | ⏳ Pending |
| ⚪ **Low**      | prefer-const       | 4     | ⏳ Pending |

> Note: `any` types breakdown: ~150 in API routes + ~180 in lib/ + ~200 in components = ~530

---

## 📁 Directory Structure

```
production-fix-prompts/
├── README.md                    # This file
├── critical/                    # 🚨 P0 - Must fix before production
│   ├── 01-eslint-errors.md     # 4 ESLint errors to fix
│   └── 02-security-issues.md   # Security-related issues
├── high-priority/               # 🔴 P1 - Should fix soon
│   ├── 01-any-types-api.md     # any types in API routes
│   ├── 02-any-types-lib.md     # any types in lib/
│   └── 03-any-types-components.md # any types in components/
├── medium-priority/             # 🟠 P2 - Important but not urgent
│   ├── 01-console-statements.md # Remove console.log
│   └── 02-unused-variables.md  # Clean up unused vars
└── low-priority/                # 🔵 P3 - Nice to have
    ├── 01-react-hooks-deps.md  # Hook dependency warnings
    └── 02-code-quality.md      # Other improvements
```

---

## 🚀 How to Use These Files

### Step 1: Start with Critical Issues

```bash
# Fix critical issues first
cat production-fix-prompts/critical/01-eslint-errors.md
```

### Step 2: Run ESLint After Each Fix

```bash
npm run lint
```

### Step 3: Verify Build Passes

```bash
npm run build
```

---

## 📋 Recommended Fix Order

1. **🚨 Critical** - ESLint errors (blocks CI/CD)
2. **🔴 High** - `any` types in high-traffic files
3. **🟠 Medium** - Console statements (security concern)
4. **🟡 Medium** - Unused variables (code bloat)
5. **🔵 Low** - React hooks dependencies
6. **⚪ Low** - Code quality improvements

---

## 🔧 Quick Fix Commands

### Auto-fix ESLint Issues (where possible)

```bash
npm run lint -- --fix
```

### Find Specific Issue Type

```bash
# Find all any types
npm run lint 2>&1 | grep "no-explicit-any"

# Find all console statements
npm run lint 2>&1 | grep "no-console"

# Find all unused variables
npm run lint 2>&1 | grep "no-unused-vars"
```

---

## 📈 Progress Tracking

Update this section as issues are fixed:

- [ ] Critical ESLint errors (0/4 fixed)
- [ ] any types in API routes (0/~150 fixed)
- [ ] any types in lib/ (0/~180 fixed)
- [ ] any types in components/ (0/~200 fixed)
- [ ] Console statements (0/~84 fixed)
- [ ] Unused variables (0/~321 fixed)
- [ ] React hooks deps (0/~41 fixed)

---

## 🎯 Target: Production Ready

Goal: Reduce warnings to < 50 total
Current: 985 issues

---

_Last updated: December 5, 2024_
