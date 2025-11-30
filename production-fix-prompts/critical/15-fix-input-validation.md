# 🔴 CRITICAL FIX: Input Validation غير متسق

> **الأولوية:** P0 - حرج
> **الوقت المقدر:** 6 ساعات
> **المجال:** أمان

---

## 📋 ملخص المشكلة

**Issue ID:** CRITICAL-015
**Severity:** 🔴 CRITICAL - INJECTION RISK
**Impact:** عرضة لـ SQL Injection, XSS, وهجمات أخرى

---

## 🎯 المشكلة بالتفصيل

الـ Input validation غير متسق عبر التطبيق:

1. بعض الـ routes تستخدم Zod
2. بعضها يستخدم manual validation
3. بعضها لا يتحقق من المدخلات أصلاً!

---

## 📁 الملفات المتأثرة

```
app/api/ai/chat/route.ts              # ❌ لا يوجد Zod
app/api/locations/route.ts            # ❌ validation جزئي
app/api/reviews/route.ts              # ✅ يستخدم Zod
server/actions/locations.ts           # ✅ يستخدم Zod
server/actions/gmb-sync.ts            # ❌ validation جزئي
```

---

## 🐛 الكود الحالي (المعطوب)

```typescript
// ❌ مثال على route بدون validation
// app/api/ai/chat/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // ❌ لا يوجد validation!
  // body.message قد يكون أي شيء
  const { message, conversationHistory } = body;

  // ❌ يمكن إرسال prompt injection
  // ❌ يمكن إرسال data ضخمة
  // ❌ يمكن إرسال types خاطئة

  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: message }],
  });
}
```

**لماذا هذا خطير:**

- Prompt injection في AI endpoints
- SQL injection إذا تم استخدام المدخلات في queries
- XSS إذا تم عرض المدخلات بدون sanitization
- DoS عبر إرسال payloads ضخمة

---

## ✅ الحل المطلوب

### Step 1: إنشاء Validation Schemas مركزية

```typescript
// lib/validations/api-schemas.ts
import { z } from "zod";

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: "Start date must be before end date" },
  );

// ============================================================================
// AI ENDPOINT SCHEMAS
// ============================================================================

export const aiChatSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(10000, "Message too long (max 10,000 characters)"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(10000),
      }),
    )
    .max(50, "Conversation history too long")
    .optional()
    .default([]),
  model: z
    .enum(["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "claude-3-sonnet"])
    .optional()
    .default("gpt-4-turbo"),
});

export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt too long"),
  type: z.enum(["post", "response", "description", "summary"]),
  tone: z.enum(["professional", "friendly", "formal", "casual"]).optional(),
  maxLength: z.number().int().min(50).max(2000).optional().default(500),
});

// ============================================================================
// LOCATION SCHEMAS
// ============================================================================

export const locationIdSchema = z.object({
  locationId: uuidSchema,
});

export const locationQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  sortBy: z.enum(["name", "created_at", "rating"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/)
    .optional(),
  website: z.string().url().optional(),
  categories: z.array(z.string()).max(10).optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const reviewResponseSchema = z.object({
  reviewId: uuidSchema,
  response: z
    .string()
    .min(10, "Response must be at least 10 characters")
    .max(4000, "Response too long (max 4,000 characters)"),
});

export const reviewQuerySchema = paginationSchema.extend({
  locationId: uuidSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  replied: z.enum(["true", "false"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// QUESTION SCHEMAS
// ============================================================================

export const questionAnswerSchema = z.object({
  questionId: uuidSchema,
  answer: z
    .string()
    .min(5, "Answer must be at least 5 characters")
    .max(1000, "Answer too long"),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AIChatInput = z.infer<typeof aiChatSchema>;
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;
export type LocationQuery = z.infer<typeof locationQuerySchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
export type QuestionAnswerInput = z.infer<typeof questionAnswerSchema>;
```

### Step 2: إنشاء Validation Middleware

```typescript
// lib/api/with-validation.ts
import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Higher-order function to add Zod validation to API routes.
 *
 * @example
 * export const POST = withValidation(
 *   handler,
 *   { body: aiChatSchema }
 * );
 */
export function withValidation<T>(
  handler: (request: Request, context: { validated: T }) => Promise<Response>,
  schemas: ValidationOptions,
) {
  return async (
    request: Request,
    routeContext?: { params: Record<string, string> },
  ): Promise<Response> => {
    try {
      const validated: Record<string, unknown> = {};

      // Validate body
      if (schemas.body) {
        const contentType = request.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          return NextResponse.json(
            { error: "Content-Type must be application/json" },
            { status: 415 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        validated.body = schemas.body.parse(body);
      }

      // Validate query params
      if (schemas.query) {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        validated.query = schemas.query.parse(queryParams);
      }

      // Validate route params
      if (schemas.params && routeContext?.params) {
        validated.params = schemas.params.parse(routeContext.params);
      }

      return handler(request, { validated: validated as T });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      throw error;
    }
  };
}

/**
 * Validates request body against a Zod schema.
 * Use this for simpler cases where you don't need the HOF.
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      ),
    };
  }
}
```

### Step 3: تحديث AI Chat Route

```typescript
// app/api/ai/chat/route.ts
import { withValidation } from "@/lib/api/with-validation";
import { aiChatSchema, AIChatInput } from "@/lib/validations/api-schemas";
import { withAIProtection } from "@/lib/api/with-ai-protection";

async function handleChat(
  request: Request,
  { validated, userId }: { validated: { body: AIChatInput }; userId: string },
): Promise<Response> {
  // ✅ Input is already validated by Zod
  const { message, conversationHistory, model } = validated.body;

  // Safe to use - types are guaranteed
  const response = await openai.chat.completions.create({
    model,
    messages: [...conversationHistory, { role: "user", content: message }],
    max_tokens: 1000,
  });

  return Response.json({
    response: response.choices[0].message.content,
  });
}

// Combine validation + AI protection
export const POST = withAIProtection(
  withValidation(handleChat, { body: aiChatSchema }),
  {
    endpointType: "chat",
  },
);
```

### Step 4: تحديث Locations Route

```typescript
// app/api/locations/route.ts
import { withValidation, validateBody } from "@/lib/api/with-validation";
import {
  locationQuerySchema,
  createLocationSchema,
  LocationQuery,
  CreateLocationInput,
} from "@/lib/validations/api-schemas";
import { createClient } from "@/lib/supabase/server";

// GET with query validation
async function handleGet(
  request: Request,
  { validated }: { validated: { query: LocationQuery } },
): Promise<Response> {
  const { page, limit, search, status, sortBy, sortOrder } = validated.query;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase.from("gmb_locations").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return Response.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }

  return Response.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export const GET = withValidation(handleGet, { query: locationQuerySchema });

// POST with body validation
export async function POST(request: Request) {
  const { data: body, error: validationError } = await validateBody(
    request,
    createLocationSchema,
  );

  if (validationError) return validationError;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gmb_locations")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }

  return Response.json(data, { status: 201 });
}
```

---

## 🔍 خطوات التنفيذ

### Step 1: إنشاء ملفات Validation

```bash
touch lib/validations/api-schemas.ts
touch lib/api/with-validation.ts
```

### Step 2: Audit جميع API Routes

```bash
# ابحث عن routes بدون validation
grep -rL "z\." app/api/ --include="*.ts" | grep route.ts
```

### Step 3: تحديث كل Route

```bash
# لكل route:
# 1. أنشئ schema في api-schemas.ts
# 2. استخدم withValidation أو validateBody
# 3. اختبر مع invalid input
```

### Step 4: إضافة Tests

```bash
# أنشئ tests للـ validation
touch tests/api/validation.test.ts
```

---

## ✅ معايير القبول

قبل وضع علامة "مكتمل"، تأكد من:

- [ ] تم إنشاء `api-schemas.ts` مع schemas لجميع الـ endpoints
- [ ] تم إنشاء `with-validation.ts` HOF
- [ ] جميع POST/PUT/PATCH routes تستخدم body validation
- [ ] جميع GET routes مع query params تستخدم query validation
- [ ] الـ validation errors ترجع 400 مع تفاصيل واضحة
- [ ] لا يوجد `request.json()` بدون validation
- [ ] Types مُصدَّرة لكل schema
- [ ] لا توجد أخطاء TypeScript: `npx tsc --noEmit`
- [ ] لا توجد أخطاء Lint: `npm run lint`

---

## 🧪 اختبار الحل

### Test 1: Invalid Body

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'

# يجب أن يرجع 400 مع:
# { "error": "Validation failed", "details": [{ "field": "message", "message": "Message is required" }] }
```

### Test 2: Message Too Long

```bash
# أرسل message أطول من 10000 حرف
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "'$(python3 -c "print('a'*10001)"))'"}'

# يجب أن يرجع 400
```

### Test 3: Invalid Type

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": 123}'

# يجب أن يرجع 400 - message must be string
```

---

## 🚨 تحذيرات مهمة

### ⛔ ممنوع:

- `request.json()` بدون validation
- Manual validation بدلاً من Zod
- تجاهل validation errors
- استخدام `any` في schemas

### ✅ مطلوب:

- Zod schema لكل endpoint
- Type inference من schemas
- Detailed error messages
- Max length limits على كل string

---

## 📚 مراجع

- [Zod Documentation](https://zod.dev/)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Status:** 🔴 NOT STARTED
**Blocked By:** None
**Blocks:** Production deployment

---

**هذا إصلاح أمني حرج. Input validation هو خط الدفاع الأول!** 🔒
