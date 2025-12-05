# 🔴 High Priority: `any` Types in lib/

> **Priority:** P1 - Should Fix Soon
> **Count:** ~180 instances
> **Impact:** Type safety, maintainability, core functionality

---

## Overview

The `lib/` directory contains core services, utilities, and shared logic.
`any` types here can propagate throughout the entire application.

---

## 📊 Files with Most `any` Types (lib/)

| File                                      | Count | Priority    |
| ----------------------------------------- | ----- | ----------- |
| `lib/types/chat-types.ts`                 | 11    | 🔴 Critical |
| `lib/services/ai-assistant-service.ts`    | 10    | 🔴 High     |
| `lib/performance-tracking.ts`             | 8     | 🟠 Medium   |
| `lib/services/pending-actions-service.ts` | 7     | 🟠 Medium   |
| `lib/security/input-sanitizer.ts`         | 7     | 🔴 High     |
| `lib/utils/secure-search.ts`              | 6     | 🟠 Medium   |
| `lib/utils/error-handling.ts`             | 6     | 🟠 Medium   |
| `lib/services/business-dna-service.ts`    | 6     | 🟡 Low      |
| `lib/utils/location-coordinates.ts`       | 5     | 🟡 Low      |
| `lib/services/sentry-config.ts`           | 4     | 🟡 Low      |
| `lib/services/ml-sentiment-service.ts`    | 4     | 🟡 Low      |
| `lib/services/audit-logger.ts`            | 4     | 🟡 Low      |
| `lib/services/ai-review-service.ts`       | 4     | 🟡 Low      |
| `lib/posts/posts-crud.ts`                 | 4     | 🟡 Low      |

---

## 1. `lib/types/chat-types.ts` (11 any) 🔴

### Issue: Untyped Chat Message Payloads

This file defines chat types but uses `any` for message content.

### ✅ Solution

```typescript
// lib/types/chat-types.ts

// ❌ BEFORE
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: any;
  metadata?: any;
}

// ✅ AFTER
export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  url: string;
  alt?: string;
}

export interface ActionContent {
  type: "action";
  actionType: "location_update" | "review_reply" | "post_create";
  payload: Record<string, unknown>;
}

export type MessageContent =
  | TextContent
  | ImageContent
  | ActionContent
  | string;

export interface ChatMessageMetadata {
  timestamp: string;
  tokens?: number;
  model?: string;
  locationId?: string;
  reviewId?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
  metadata?: ChatMessageMetadata;
}
```

---

## 2. `lib/services/ai-assistant-service.ts` (10 any) 🔴

### Issue: Untyped AI Responses and Tool Calls

### ✅ Solution

```typescript
// lib/services/ai-assistant-service.ts

// ❌ BEFORE
async function callTool(toolName: string, params: any): Promise<any> {
  // ...
}

// ✅ AFTER
interface ToolCallParams {
  locationId?: string;
  reviewId?: string;
  questionId?: string;
  content?: string;
  action?: string;
}

interface ToolCallResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

async function callTool(
  toolName: string,
  params: ToolCallParams,
): Promise<ToolCallResult> {
  // ...
}
```

### AI Response Types

```typescript
interface AICompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
}

interface AICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: AICompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

## 3. `lib/security/input-sanitizer.ts` (7 any) 🔴

### Issue: Generic sanitization functions lose type information

### ✅ Solution

```typescript
// lib/security/input-sanitizer.ts

// ❌ BEFORE
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, "html" | "text" | "url">,
): T {
  const sanitized = { ...obj } as Record<string, any>;
  // ...
}

// ✅ AFTER
type SanitizationType =
  | "html"
  | "text"
  | "url"
  | "email"
  | "phone"
  | "sql"
  | "filename";

export function sanitizeObject<
  T extends Record<string, string | number | boolean | null | undefined>,
>(obj: T, schema: Partial<Record<keyof T, SanitizationType>>): T {
  const sanitized = { ...obj };

  for (const [key, sanitizeType] of Object.entries(schema)) {
    const value = sanitized[key as keyof T];
    if (typeof value === "string" && sanitizeType) {
      (sanitized as Record<string, unknown>)[key] = sanitizeValue(
        value,
        sanitizeType,
      );
    }
  }

  return sanitized;
}

function sanitizeValue(value: string, type: SanitizationType): string {
  switch (type) {
    case "html":
      return sanitizeHtml(value);
    case "text":
      return sanitizeText(value);
    case "url":
      return sanitizeUrl(value);
    case "email":
      return sanitizeEmail(value);
    case "phone":
      return sanitizePhone(value);
    case "sql":
      return sanitizeSql(value);
    case "filename":
      return sanitizeFilename(value);
    default:
      return value;
  }
}
```

---

## 4. `lib/utils/error-handling.ts` (6 any)

### Issue: Generic error handlers lose type information

### ✅ Solution

```typescript
// lib/utils/error-handling.ts

// ❌ BEFORE
export function handleError(error: any, context?: any): void {
  // ...
}

// ✅ AFTER
interface ErrorContext {
  action?: string;
  userId?: string;
  locationId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

interface HandledError {
  message: string;
  code?: string;
  statusCode: number;
  context?: ErrorContext;
  stack?: string;
}

export function handleError(
  error: unknown,
  context?: ErrorContext,
): HandledError {
  // Type guard for Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as { code?: string }).code,
      statusCode: getStatusCode(error),
      context,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    return {
      message: error,
      statusCode: 500,
      context,
    };
  }

  // Unknown error type
  return {
    message: "An unexpected error occurred",
    statusCode: 500,
    context,
  };
}
```

---

## 5. `lib/utils/secure-search.ts` (6 any)

### Issue: Generic search functions

### ✅ Solution

```typescript
// lib/utils/secure-search.ts

// ❌ BEFORE
export function secureSearch<T>(
  data: any[],
  query: string,
  fields: string[],
): T[] {
  // ...
}

// ✅ AFTER
export function secureSearch<T extends Record<string, unknown>>(
  data: T[],
  query: string,
  fields: (keyof T)[],
): T[] {
  const sanitizedQuery = sanitizeSearchQuery(query);

  return data.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(sanitizedQuery.toLowerCase());
      }
      return false;
    }),
  );
}

function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>'"]/g, "") // Remove potential XSS characters
    .trim()
    .substring(0, 100); // Limit length
}
```

---

## 🛠️ Step-by-Step Fix Process

### Step 1: Identify all `any` in lib/

```bash
npm run lint 2>&1 | grep "no-explicit-any" | grep "lib/"
```

### Step 2: Prioritize by Impact

1. Types files (propagate everywhere)
2. Services (core business logic)
3. Security utilities (critical)
4. Other utilities

### Step 3: Create Type Definitions

For each `any`:

1. Trace what data actually flows through
2. Create an interface or type alias
3. Add generics where flexibility is needed

### Step 4: Use `unknown` Instead of `any`

When you truly don't know the type, use `unknown` with type guards:

```typescript
// ❌ BAD
function process(data: any) {
  return data.value; // No type checking
}

// ✅ BETTER
function process(data: unknown) {
  if (isValidData(data)) {
    return data.value; // Type checked
  }
  throw new Error("Invalid data");
}

function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "value" in data &&
    typeof (data as { value: unknown }).value === "string"
  );
}
```

---

## ✅ Acceptance Criteria

- [ ] No `any` in type definition files
- [ ] No `any` in security utilities
- [ ] No `any` in service functions
- [ ] Use `unknown` with type guards where needed
- [ ] All exported functions have typed parameters
- [ ] Build passes without errors

---

_Estimated Fix Time: 4-6 hours_
