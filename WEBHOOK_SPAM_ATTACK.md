# 🚨 **WEBHOOK SPAM ATTACK**

**التاريخ:** 2025-11-17 05:22-05:25  
**الحالة:** 🔴 CRITICAL - Under Attack

---

## 🔴 **المشكلة:**

### **Attack Pattern:**
```
05:22:41 - 05:25:04 (3+ دقائق)
~60+ requests
GET 307 /api/webhooks/gmb-notifications
من nnh.ae (بدون www)
```

### **التحليل:**
```
❌ GET requests (Google Pub/Sub يستخدم POST)
❌ 307 Redirect Loop (nnh.ae → www.nnh.ae)
❌ لا يوجد authentication
❌ High frequency (كل ثانية)
```

**هذا ليس Google Pub/Sub! هذا Bot/Attack!** 🚨

---

## 🔍 **السبب:**

### **1. Webhook Endpoint Exposed:**
```typescript
// app/api/webhooks/gmb-notifications/route.ts
export async function POST(request: NextRequest) {
  // ❌ لا يوجد authentication check
  // ❌ يقبل requests من أي source
}
```

### **2. Domain Redirect:**
```
nnh.ae → www.nnh.ae (307)
```

**الـ Bot:**
1. يرسل GET request إلى `nnh.ae/api/webhooks/gmb-notifications`
2. يحصل على 307 redirect إلى `www.nnh.ae/api/webhooks/gmb-notifications`
3. يتبع الـ redirect
4. يعيد المحاولة
5. **Infinite Loop!**

---

## 🔧 **الإصلاحات المطبقة:**

### **1. حذف Webhook Endpoint مؤقتاً:**
```
✅ Deleted: app/api/webhooks/gmb-notifications/route.ts
✅ Committed & Pushed
⏳ انتظار Vercel Deploy
```

---

## 🛡️ **الحل الدائم (عند إعادة التطبيق):**

### **1. إضافة Authentication:**

```typescript
// app/api/webhooks/gmb-notifications/route.ts
export async function POST(request: NextRequest) {
  // ✅ 1. Verify Google Pub/Sub signature
  const signature = request.headers.get('x-goog-signature');
  const token = request.headers.get('authorization');
  
  if (!signature || !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ✅ 2. Verify signature
  const isValid = await verifyPubSubSignature(
    request.body,
    signature,
    process.env.GOOGLE_PUBSUB_TOKEN
  );
  
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }
  
  // ✅ 3. Process notification
  // ...
}

// ✅ 4. Reject GET requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
```

### **2. إضافة Rate Limiting:**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // ...
}
```

### **3. إضافة IP Whitelist:**

```typescript
const ALLOWED_IPS = [
  // Google Pub/Sub IP ranges
  '35.186.0.0/16',
  '35.190.0.0/16',
  // ... add more Google Cloud IP ranges
];

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for');
  
  if (!isIpAllowed(ip, ALLOWED_IPS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // ...
}
```

### **4. إصلاح Domain Redirect:**

```typescript
// middleware.ts أو next.config.mjs
// تأكد من أن الـ webhook endpoints لا تعمل redirect

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Skip redirect for webhook endpoints
  if (url.pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }
  
  // Apply redirect for other routes
  if (!url.hostname.startsWith('www.')) {
    url.hostname = `www.${url.hostname}`;
    return NextResponse.redirect(url, 307);
  }
  
  return NextResponse.next();
}
```

---

## 📊 **Attack Statistics:**

```
Duration: ~3 minutes
Requests: ~60+
Frequency: ~1 request/second
Method: GET (invalid for Pub/Sub)
Status: 307 (redirect loop)
Source: nnh.ae (without www)
```

---

## ✅ **Checklist للإعادة:**

```
⏳ حذف Webhook Endpoint (Done)
⏳ انتظار Deploy
⏳ تحقق من Attack توقف
□ إضافة Authentication
□ إضافة Rate Limiting
□ إضافة IP Whitelist
□ إصلاح Domain Redirect
□ Testing
□ Re-deploy
```

---

## 🚨 **Action Items:**

### **Immediate:**
```
1. ✅ حذف Webhook Endpoint
2. ⏳ انتظار Deploy
3. ✅ مراقبة Logs
```

### **Short-term:**
```
1. تحقق من Google Cloud Console:
   - هل في Pub/Sub subscription نشط؟
   - هل في webhook URL مسجل؟
   - احذفه إذا موجود
```

### **Long-term:**
```
1. إعادة تطبيق Webhook بـ Security:
   - Authentication ✅
   - Rate Limiting ✅
   - IP Whitelist ✅
   - Signature Verification ✅
2. Monitoring & Alerts
3. Documentation
```

---

## 🔍 **التحقق:**

بعد Deploy، راقب:
```
✅ /api/webhooks/gmb-notifications → 404
✅ لا يوجد 307 redirects
✅ Attack توقف
```

---

**الحالة:** 🔴 **Endpoint Removed - Waiting for Deploy**

