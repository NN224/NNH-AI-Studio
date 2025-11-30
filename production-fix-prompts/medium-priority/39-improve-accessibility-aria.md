# 🟡 Medium Priority: Improve Accessibility (ARIA)

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

## Problem Summary

Only 85 aria-label/role attributes found across 36 files. Many interactive elements lack proper accessibility attributes, making the app difficult for screen reader users.

## Severity: 🟡 Medium Priority

- **Impact**: Accessibility compliance, user experience
- **Effort**: 4-5 hours
- **Risk**: Low - but important for compliance

## Areas Needing Improvement

### 1. Buttons without labels

```typescript
// ❌ Bad - no accessible name
<Button onClick={handleDelete}>
  <Trash2 />
</Button>

// ✅ Good
<Button onClick={handleDelete} aria-label="Delete item">
  <Trash2 />
</Button>
```

### 2. Icons without descriptions

```typescript
// ❌ Bad
<Star className="text-yellow-500" />

// ✅ Good
<Star className="text-yellow-500" aria-label="Rating" />
// Or hide decorative icons
<Star className="text-yellow-500" aria-hidden="true" />
```

### 3. Loading states

```typescript
// ❌ Bad
{loading && <Spinner />}

// ✅ Good
{loading && (
  <div role="status" aria-live="polite">
    <Spinner aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
)}
```

### 4. Forms without labels

```typescript
// ❌ Bad
<Input placeholder="Search..." />

// ✅ Good
<label htmlFor="search" className="sr-only">Search</label>
<Input id="search" placeholder="Search..." aria-label="Search" />
```

### 5. Dialogs/Modals

```typescript
// ❌ Bad
<Dialog>
  <DialogContent>...</DialogContent>
</Dialog>

// ✅ Good
<Dialog>
  <DialogContent
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
  >
    <DialogTitle id="dialog-title">Title</DialogTitle>
    <p id="dialog-description">Description</p>
  </DialogContent>
</Dialog>
```

## Step-by-Step Fix

### Step 1: Audit interactive elements

```bash
# Find buttons without aria-label
grep -rn "<Button" --include="*.tsx" components/ | grep -v "aria-label"
```

### Step 2: Add sr-only utility class

```css
/* Already in Tailwind, but verify */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Step 3: Fix common patterns

#### Icon-only buttons

```typescript
<Button aria-label="Close" onClick={onClose}>
  <X aria-hidden="true" />
</Button>
```

#### Status indicators

```typescript
<Badge role="status" aria-label={`Status: ${status}`}>
  {status}
</Badge>
```

#### Navigation

```typescript
<nav aria-label="Main navigation">
  <ul role="list">
    <li><Link href="/">Home</Link></li>
  </ul>
</nav>
```

#### Tables

```typescript
<table aria-label="Locations list">
  <thead>
    <tr>
      <th scope="col">Name</th>
    </tr>
  </thead>
</table>
```

## Acceptance Criteria

- [ ] All icon-only buttons have aria-label
- [ ] All forms have proper labels
- [ ] Loading states announced to screen readers
- [ ] Dialogs have proper ARIA attributes
- [ ] Navigation has proper landmarks
- [ ] Passes basic accessibility audit

## Verification

```bash
# Install and run accessibility audit
npx @axe-core/cli http://localhost:5050
```

## Status: ⏳ Pending
