# 🚀 Integration Guide - Advanced Features

Complete guide for integrating APIs, Email, Monitoring, CMS, and Analytics.

---

## 📋 Table of Contents

1. [Contact Form API](#1-contact-form-api)
2. [Newsletter API](#2-newsletter-api)
3. [Email Service](#3-email-service)
4. [Analytics Tracking](#4-analytics-tracking)
5. [Status Monitoring](#5-status-monitoring)
6. [Blog CMS](#6-blog-cms)

---

## 1️⃣ Contact Form API

### Setup Database

Run the migration:

```bash
npx supabase migration up
```

Or apply manually:

```sql
-- Located in: supabase/migrations/20251121_contact_submissions.sql
```

### API Endpoint

**POST** `/api/contact`

```typescript
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",      // Optional
  "company": "Acme Inc",        // Optional
  "subject": "Demo Request",
  "message": "I'm interested..."
}

// Response
{
  "success": true,
  "message": "Contact form submitted successfully",
  "id": "uuid"
}
```

### Frontend Integration

```typescript
const response = await fetch("/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});
```

---

## 2️⃣ Newsletter API

### API Endpoints

**POST** `/api/newsletter` - Subscribe

```typescript
{
  "email": "user@example.com",
  "source": "blog" // Optional: website, blog, status
}
```

**DELETE** `/api/newsletter?email=user@example.com` - Unsubscribe

### Frontend Integration

```typescript
// Subscribe
await fetch("/api/newsletter", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, source: "blog" }),
});

// Unsubscribe
await fetch(`/api/newsletter?email=${email}`, {
  method: "DELETE",
});
```

---

## 3️⃣ Email Service

### Configuration

Update `.env.local`:

```bash
# Email Service (Hostinger SMTP)
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_USER=noreply@nnh.ae
EMAIL_PASSWORD=your_secure_password
EMAIL_FROM="NNH AI Studio <noreply@nnh.ae>"
```

### Available Functions

```typescript
import {
  sendEmail,
  sendContactNotification,
  sendNewsletterWelcome,
} from "@/lib/services/email-service";

// Send contact notification
await sendContactNotification({
  name,
  email,
  subject,
  message,
  phone,
  company,
});

// Send welcome email
await sendNewsletterWelcome(email);
```

### Email Templates

Located in `/lib/services/email-service.ts`

- Contact form notification
- Newsletter welcome email
- Custom templates (add as needed)

---

## 4️⃣ Analytics Tracking

### Google Analytics Setup

1. Add GA ID to `.env.local`:

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

2. Add to `app/layout.tsx`:

```tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
  `}
</Script>
```

### Track Events

```typescript
import {
  trackContactForm,
  trackNewsletterSubscription,
  trackButtonClick,
  trackSearch,
  trackError,
} from "@/lib/analytics/tracking";

// Track form submissions
trackContactForm(true); // success
trackContactForm(false); // error

// Track newsletter
trackNewsletterSubscription(true);

// Track button clicks
trackButtonClick("Get Started", "header");

// Track search
trackSearch("AI features", 12);

// Track errors
trackError("Form validation failed", "contact_page");
```

### Custom Events

```typescript
import { trackCustomEvent } from "@/lib/analytics/tracking";

trackCustomEvent("feature_used", {
  feature_name: "AI Response",
  user_type: "premium",
  success: true,
});
```

---

## 5️⃣ Status Monitoring

### Real-time Monitoring Integration

#### Option 1: Uptime Robot

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add monitors for your services
3. Get API key
4. Create endpoint:

```typescript
// app/api/status/route.ts
export async function GET() {
  const response = await fetch(`https://api.uptimerobot.com/v2/getMonitors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.UPTIME_ROBOT_API_KEY,
      format: "json",
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

#### Option 2: Custom Monitoring

```typescript
// app/api/status/check/route.ts
export async function GET() {
  const services = await Promise.all([
    checkService("https://api.yourapp.com/health"),
    checkService("https://yourapp.com"),
    // Add more services
  ]);

  return NextResponse.json({ services });
}
```

### Update Status Page

```typescript
// app/[locale]/status/page.tsx
useEffect(() => {
  const fetchStatus = async () => {
    const res = await fetch("/api/status");
    const data = await res.json();
    setServices(data.services);
  };

  fetchStatus();
  const interval = setInterval(fetchStatus, 60000); // Every minute

  return () => clearInterval(interval);
}, []);
```

---

## 6️⃣ Blog CMS Integration

### Option 1: MDX Files (Simple)

1. Create `content/blog/` directory
2. Add MDX files:

```mdx
---
title: "Post Title"
date: "2025-01-01"
author: "Author Name"
category: "SEO"
image: "/images/post.jpg"
---

# Content here
```

3. Use library like `next-mdx-remote`

### Option 2: Contentful (Recommended)

1. Sign up at [contentful.com](https://contentful.com)
2. Create "Blog Post" content type
3. Add env variables:

```bash
CONTENTFUL_SPACE_ID=your_space_id
CONTENTFUL_ACCESS_TOKEN=your_token
```

4. Create service:

```typescript
// lib/contentful.ts
import { createClient } from "contentful";

export const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
});

export async function getBlogPosts() {
  const entries = await client.getEntries({
    content_type: "blogPost",
    order: "-fields.publishDate",
  });

  return entries.items;
}
```

### Option 3: Supabase (Database)

Create table:

```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author TEXT,
  category TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

Fetch posts:

```typescript
const { data: posts } = await supabase
  .from("blog_posts")
  .select("*")
  .order("published_at", { ascending: false });
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# Required
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
EMAIL_HOST=
EMAIL_USER=
EMAIL_PASSWORD=

# Optional
NEXT_PUBLIC_GA_ID=
UPTIME_ROBOT_API_KEY=
CONTENTFUL_SPACE_ID=
CONTENTFUL_ACCESS_TOKEN=
```

### Rate Limiting

Add to API routes:

```typescript
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

const { success } = await ratelimit.limit(ip);
if (!success) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

---

## 📊 Testing

### Test Contact Form

```bash
curl -X POST http://localhost:5050/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Hello"}'
```

### Test Newsletter

```bash
curl -X POST http://localhost:5050/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🚀 Deployment Checklist

- [ ] Run database migrations
- [ ] Set all environment variables
- [ ] Configure email SMTP
- [ ] Add Google Analytics ID
- [ ] Set up monitoring service
- [ ] Test all forms
- [ ] Verify emails are sending
- [ ] Check analytics tracking
- [ ] Test newsletter subscription
- [ ] Verify status page updates

---

## 📞 Support

For issues or questions:

- Email: support@nnh.ae
- Docs: /help
- Status: /status

---

**Last Updated:** Nov 21, 2025
