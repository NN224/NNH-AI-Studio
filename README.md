# 🚀 NNH AI Studio (BETA)

<div align="center">

![BETA](https://img.shields.io/badge/Status-BETA-brightgreen?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.9.0--beta-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)

**Professional GMB & YouTube Management Platform with AI-Powered Features**

[🌐 Visit Website](https://www.nnh.ae) • [📧 Feedback](mailto:feedback@nnh.ae) • [📝 Changelog](/changelog)

</div>

---

## ⚠️ BETA Status

This project is currently in **BETA** and under active development. We're adding new features weekly based on user feedback!

**What to expect:**
- 🚀 Weekly feature updates
- 🐛 Occasional bugs (please report them!)
- 💬 Your feedback shapes the product
- ✨ Cutting-edge AI features

---

## 🎯 Features

### 🤖 AI-Powered
- **Smart Review Responses:** Auto-reply to reviews with personalized, intelligent responses
- **AI Content Studio:** Generate engaging posts and content
- **Multi-Provider Support:** Gemini, DeepSeek, Groq, Anthropic, OpenAI

### 📊 Analytics & Insights
- Real-time performance metrics
- Review sentiment analysis
- Engagement tracking
- Custom date range reports

### 🎛️ Management Tools
- Multi-location management
- Business information editor
- Review & Q&A management
- Media library
- Post scheduling

### 🔄 Automation
- Auto-reply for reviews (per-rating control)
- Scheduled content publishing
- Automated reporting

### 🌍 Internationalization
- Full Arabic & English support
- RTL/LTR automatic switching
- Localized content

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + Custom components
- **Animations:** Framer Motion
- **State Management:** Zustand + TanStack Query
- **i18n:** next-intl

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + OAuth 2.0
- **API:** Next.js API Routes + Server Actions
- **Caching:** Upstash Redis
- **Storage:** Supabase Storage

### DevOps & Monitoring
- **Hosting:** Vercel
- **Monitoring:** Sentry
- **Analytics:** Vercel Analytics & Speed Insights
- **Version Control:** Git + GitHub

---

## 🌍 Environments

### 🖥️ Development (localhost:5050)
- **Purpose:** Local development and testing
- **Access:** Local only (your machine)
- **Run:** `npm run dev`

### 🌐 Production (nnh.ae)
- **Purpose:** Live website accessible to everyone worldwide
- **Access:** Public - accessible to anyone with internet
- **Deploy:** Automatic via Vercel when pushing to `main`

> **⚠️ Important:** `nnh.ae` is LIVE and PUBLIC for the entire world!

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Required API keys (see `.env.example`)

### Installation

```bash
# Clone the repository
git clone https://github.com/NN224/NNH-AI-Studio.git
cd NNH-AI-Studio

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server (LOCAL ONLY)
npm run dev
```

The app will be available at **http://localhost:5050** (local only)

### Build for Production

```bash
npm run build
npm run start
```

Production build runs on **http://localhost:5000** (for testing only)

**Live Production:** Deployed automatically to **https://www.nnh.ae** via Vercel

---

## 📁 Project Structure

```
NNH-AI-Studio/
├── app/                          # Next.js app directory
│   ├── [locale]/                 # Internationalized routes
│   │   ├── (dashboard)/          # Dashboard pages
│   │   └── landing.tsx           # Landing page
│   └── api/                      # API routes
├── components/                   # React components
│   ├── dashboard/                # Dashboard-specific
│   ├── layout/                   # Layout components
│   ├── ui/                       # UI primitives
│   └── common/                   # Shared components
├── lib/                          # Utility libraries
│   ├── ai/                       # AI integrations
│   ├── supabase/                 # Supabase client
│   └── services/                 # Business logic
├── server/                       # Server actions
├── hooks/                        # Custom React hooks
├── messages/                     # i18n translations
├── supabase/                     # Database migrations
└── public/                       # Static assets
```

---

## 🎨 BETA Implementation

### BETA Indicator Banner
All pages display a prominent BETA indicator at the top:
- **Location:** Fixed at top of all pages
- **Height:** 2rem (32px)
- **Content:** "BETA - New features weekly" + feedback link
- **Component:** `components/common/beta-badge.tsx`

### Layout Adjustments
All layouts have been adjusted to accommodate the BETA banner:
- Headers: `top-8` instead of `top-0`
- Containers: `pt-8` for proper spacing
- Sidebars: `top-8` and `h-[calc(100vh-2rem)]`

**Important:** When adding new components, always account for the BETA banner!

See `BETA_STATUS_GUIDE.md` for detailed guidelines.

---

## 📝 Available Scripts

```bash
npm run dev              # Development server (port 5050)
npm run build            # Build for production
npm run start            # Start production server (port 5000)
npm run lint             # Run ESLint
npm run test             # Run Jest tests
npm run test:e2e         # Run Playwright E2E tests
npm run storybook        # Start Storybook
```

---

## 🌐 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Sentry (Optional)
SENTRY_DSN=your_sentry_dsn
```

---

## 🤝 Contributing

We welcome feedback and contributions! Since this is in BETA, your input is valuable.

### How to Contribute
1. 📧 Send feedback: feedback@nnh.ae
2. 🐛 Report bugs: Use the "Share feedback" link in the BETA banner
3. 💡 Suggest features: Email us your ideas
4. 🔧 Submit PRs: Follow standard Git workflow

---

## 📚 Documentation

### 🎯 Start Here
- **📖 Documentation Index:** `DOCUMENTATION_INDEX.md` - Complete guide to all documentation

### 🌍 Essential Reading
- **⭐ Read This First:** `IMPORTANT_READ_THIS.md` - **Start here!** (1 minute)
- **Environments Guide:** `ENVIRONMENTS.md` - Understanding Dev vs Production (5 minutes)
- **Project Status:** `PROJECT_STATUS.md` - Current development status (5 minutes)

### 🎨 BETA Guidelines
- **BETA Status Guide:** `BETA_STATUS_GUIDE.md` - Detailed BETA implementation guide
- **Quick Reference:** `BETA_QUICK_REFERENCE.md` - Quick checklist for BETA rules

### 🚀 Deployment
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md` - Deployment instructions

> **⚠️ New to the project?** Read `IMPORTANT_READ_THIS.md` first, then check `DOCUMENTATION_INDEX.md` for the complete guide!

---

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- CSRF protection on forms
- Rate limiting on API endpoints
- Encrypted credentials storage
- OAuth 2.0 authentication

**Found a security issue?** Please email security@nnh.ae

---

## 📄 License

Proprietary - © 2025 NNH AI Studio  
All rights reserved.

---

## 📞 Contact

- **Website:** [https://www.nnh.ae](https://www.nnh.ae)
- **Email:** info@nnh.ae
- **Feedback:** feedback@nnh.ae
- **Support:** support@nnh.ae

---

## 🎉 What's New

Check the [Changelog](/changelog) page for latest updates, new features, and bug fixes.

---

<div align="center">

**Built with ❤️ by NNH AI Studio**

*Making GMB & YouTube management smarter with AI*

</div>

