# Secure API Handler

## Overview

The `withSecureApi` higher-order function provides a standardized way to handle API routes with:

- **Automatic error catching and sanitization** - No stack traces or DB details leak to clients
- **Zod validation enforcement** - Request bodies and query params are validated before handler execution
- **Production-safe error responses** - Generic error messages in production
- **Structured internal logging** - Full error details logged server-side for debugging
- **Type-safe handlers** - Full TypeScript support with inferred types

## Quick Start

```typescript
import {
  withSecureApi,
  success,
  ApiError,
  ErrorCode,
} from "@/lib/api/secure-handler";
import { z } from "zod";

// 1. Define your validation schema
const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

type CreateUser = z.infer<typeof CreateUserSchema>;

// 2. Create your handler
export const POST = withSecureApi<CreateUser>(
  async (_request, { user, body }) => {
    // body is already validated and typed!
    const newUser = await createUser(body);
    return success(newUser);
  },
  {
    bodySchema: CreateUserSchema,
    requireAuth: true,
  },
);
```

## API Reference

### `withSecureApi<TBody, TQuery, TResponse>(handler, options)`

Wraps an API route handler with secure error handling and validation.

#### Parameters

| Parameter | Type                   | Description                                 |
| --------- | ---------------------- | ------------------------------------------- |
| `handler` | `SecureHandler`        | The async function that handles the request |
| `options` | `SecureHandlerOptions` | Configuration options                       |

#### Options

| Option        | Type        | Default | Description                                   |
| ------------- | ----------- | ------- | --------------------------------------------- |
| `bodySchema`  | `ZodSchema` | -       | Zod schema for POST/PUT/PATCH body validation |
| `querySchema` | `ZodSchema` | -       | Zod schema for GET query parameter validation |
| `requireAuth` | `boolean`   | `true`  | Require user authentication                   |

#### Handler Context

The handler receives a context object with:

```typescript
interface HandlerContext<TBody, TQuery> {
  user: User | null; // Authenticated user (null if requireAuth: false)
  body: TBody; // Validated request body
  query: TQuery; // Validated query parameters
  request: NextRequest; // Original Next.js request
}
```

### Error Classes

#### `ApiError`

Base class for operational errors that should be returned to clients.

```typescript
throw new ApiError(ErrorCode.NOT_FOUND, "User not found", 404);
```

#### `ValidationError`

Thrown when request data fails schema validation.

```typescript
throw new ValidationError("Invalid email format", {
  email: ["Must be a valid email"],
});
```

#### `AuthenticationError`

Thrown when user is not authenticated.

```typescript
throw new AuthenticationError("Session expired");
```

#### `AuthorizationError`

Thrown when user lacks permission.

```typescript
throw new AuthorizationError("Admin access required");
```

#### `NotFoundError`

Thrown when a resource doesn't exist.

```typescript
throw new NotFoundError("Post");
```

#### `ConflictError`

Thrown for duplicate resources or state conflicts.

```typescript
throw new ConflictError("Email already registered");
```

### Error Codes

```typescript
const ErrorCode = {
  // Validation (4xx)
  VALIDATION_ERROR: "ERR_VALIDATION",
  INVALID_JSON: "ERR_INVALID_JSON",
  MISSING_FIELDS: "ERR_MISSING_FIELDS",

  // Authentication (401)
  UNAUTHORIZED: "ERR_UNAUTHORIZED",
  SESSION_EXPIRED: "ERR_SESSION_EXPIRED",

  // Authorization (403)
  FORBIDDEN: "ERR_FORBIDDEN",

  // Not Found (404)
  NOT_FOUND: "ERR_NOT_FOUND",

  // Conflict (409)
  CONFLICT: "ERR_CONFLICT",

  // Rate Limiting (429)
  RATE_LIMITED: "ERR_RATE_LIMITED",

  // Server Errors (5xx)
  INTERNAL_ERROR: "ERR_INTERNAL",
  DATABASE_ERROR: "ERR_DATABASE",
};
```

### Utility Functions

#### `success<T>(data: T)`

Create a success response.

```typescript
return success({ user: newUser });
// Returns: { success: true, data: { user: newUser } }
```

#### `assertFound<T>(value, resource)`

Assert a value exists, throwing NotFoundError if null/undefined.

```typescript
const user = await getUser(id);
assertFound(user, "User");
// Throws NotFoundError if user is null
```

#### `assertAuthenticated(user)`

Assert user is authenticated.

```typescript
assertAuthenticated(user);
// Throws AuthenticationError if user is null
```

## Error Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Validation failed",
    "details": {
      "email": ["Must be a valid email"],
      "name": ["Required"]
    }
  }
}
```

## Error Sanitization

In production, the handler automatically sanitizes error messages to prevent leaking:

- Database schema details (column names, table names)
- Stack traces
- File paths
- Connection strings
- Internal error messages

### Sensitive Patterns Filtered

- `column "xxx" does not exist`
- `foreign key constraint`
- `duplicate key value`
- Stack trace patterns (`at xxx (file.ts:123:45)`)
- File paths (`node_modules`, `.ts:`, `.js:`)

### Example

**Internal Error (logged server-side):**

```
[API Error] {
  "requestId": "req_1234567890_abc",
  "error": {
    "name": "PostgrestError",
    "message": "column \"user_email\" does not exist",
    "stack": "Error: column \"user_email\" does not exist\n    at ..."
  }
}
```

**Client Response (production):**

```json
{
  "success": false,
  "error": {
    "code": "ERR_INTERNAL",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

## Migration Guide

### From Legacy `errorResponse`

**Before:**

```typescript
import { ApiError, errorResponse } from "@/utils/api-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Manual validation...
    // Business logic...
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
```

**After:**

```typescript
import { withSecureApi, success } from "@/lib/api/secure-handler";
import { mySchema } from "@/lib/api/schemas";

export const POST = withSecureApi(
  async (_request, { user, body }) => {
    // body is already validated!
    const result = await businessLogic(body);
    return success(result);
  },
  { bodySchema: mySchema },
);
```

## Best Practices

1. **Always define schemas** - Use Zod schemas for all request bodies and query params
2. **Use specific error classes** - Throw `NotFoundError`, `ValidationError`, etc. instead of generic `ApiError`
3. **Don't catch errors in handlers** - Let the wrapper handle them
4. **Log context, not secrets** - The wrapper logs request IDs for tracing
5. **Return `success()` helper** - Ensures consistent response format

## Validation Schemas

Common schemas are available in `@/lib/api/schemas`:

```typescript
import {
  reviewsQuerySchema,
  createPostSchema,
  updatePostSchema,
  locationSchema,
  syncRequestSchema,
} from "@/lib/api/schemas";
```
