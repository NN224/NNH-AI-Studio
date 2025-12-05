# NNH AI Studio

**Professional GMB & YouTube Management Platform**

[![Version](https://img.shields.io/badge/version-0.9.0--beta-blue.svg)](https://github.com/NN224/NNH-AI-Studio)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)

---

## Overview

NNH AI Studio is a comprehensive Next.js 14 application designed to help businesses manage their Google Business Profiles (GMB), analyze YouTube performance, and generate AI-powered content. The platform features an innovative **AI Command Center** that acts as a "10-year veteran employee" - working 24/7 to prepare responses, detect patterns, and provide actionable insights.

**Homepage:** [https://www.nnh.ae](https://www.nnh.ae)

---

## Key Features

### AI Command Center
- **Proactive Pattern Detection** - Automatically identifies complaint clusters, day/time patterns, rating trends, and service issues
- **Smart Reply Generation** - AI-generated responses for reviews and Q&A using Claude (Anthropic)
- **Autopilot Mode** - Auto-publish high-confidence responses
- **Batch Operations** - Approve or reject multiple items with one click
- **24/7 Background Processing** - Hourly action preparation and daily insights

### Google Business Profile (GMB) Management
- **Location Management** - Multi-location support with unified dashboard
- **Review Management** - View, reply, and analyze customer reviews
- **Q&A Management** - Respond to customer questions
- **Post Management** - Create and schedule GMB posts
- **Media Management** - Upload and manage photos/videos
- **Analytics Dashboard** - Performance metrics and insights

### YouTube Integration
- **Channel Analytics** - Video performance and audience metrics
- **Content Workflows** - Streamlined content creation process
- **Dashboard** - Unified view of YouTube performance

### AI Capabilities
- **Multi-Provider Support** - OpenAI, Anthropic (Claude), Google Gemini, Groq, DeepSeek, Together AI
- **Business DNA** - AI learns your business personality for consistent responses
- **Bilingual Support** - English-first with Arabic language detection
- **Content Generation** - AI-assisted posts, replies, and recommendations

### Platform Features
- **Internationalization (i18n)** - Multi-language support via next-intl
- **Dark/Light Theme** - Full theme customization
- **Responsive Design** - Mobile-first, works on all devices
- **Real-time Dashboards** - Live charts and metrics with Recharts
- **Command Palette** - Quick keyboard navigation (cmdk)

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript 5.9 |
| **Styling** | Tailwind CSS 4, Framer Motion, shadcn/ui (Radix UI) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Authentication** | Supabase Auth, Google OAuth |
| **AI/ML** | OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Together AI |
| **State Management** | Zustand, React Query (TanStack Query) |
| **Forms** | React Hook Form, Zod validation |
| **Charts** | Recharts, Chart.js |
| **Testing** | Jest, Playwright, Storybook |
| **Monitoring** | Sentry, Vercel Analytics |
| **Email** | SendGrid, Nodemailer |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+ (or pnpm/yarn)
- Supabase project with credentials
- At least one AI provider API key (OpenAI or Anthropic)

### Installation

```bash
# Clone the repository
git clone https://github.com/NN224/NNH-AI-Studio.git
cd NNH-AI-Studio

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run the development server
npm run dev
```

The app runs at [http://localhost:5050](http://localhost:5050) by default.

---

## Environment Variables

### Required (Minimum for Local Development)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key
```

### Common/Optional

```env
# Supabase
SUPABASE_SERVICE_ROLE_KEY=

# App URLs
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_APP_URL=
APP_URL=
VERCEL_URL=

# Google APIs
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
YT_CLIENT_ID=

# Additional AI Providers
GOOGLE_GEMINI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
TOGETHER_API_KEY=
SYSTEM_OPENAI_API_KEY=
SYSTEM_ANTHROPIC_API_KEY=

# Cron & Webhooks
CRON_SECRET=
GOOGLE_WEBHOOK_SECRET=
GMB_WEBHOOK_SECRET=

# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
UPTIME_ROBOT_API_KEY=
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5050) |
| `npm run build` | Production build with CSS optimization |
| `npm start` | Start production server (port 5000) |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:install` | Install Playwright browsers |
| `npm run storybook` | Start Storybook (port 6006) |
| `npm run build-storybook` | Build static Storybook |
| `npm run db:update-docs` | Update database schema documentation |
| `npm run clean` | Clean build cache |
| `npm run rebuild` | Clean and rebuild |

---

## Project Structure

```
NNH-AI-Studio/
├── app/
│   ├── [locale]/           # Internationalized routes
│   │   ├── (dashboard)/    # Protected dashboard pages
│   │   ├── (marketing)/    # Public marketing pages
│   │   ├── admin/          # Admin panel
│   │   └── auth/           # Authentication pages
│   └── api/                # API routes
│       ├── ai/             # AI endpoints
│       ├── gmb/            # Google Business Profile
│       ├── youtube/        # YouTube integration
│       ├── cron/           # Scheduled jobs
│       └── ...
├── components/
│   ├── command-center/     # AI Command Center
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   └── ...
├── lib/
│   ├── services/           # Business logic services
│   ├── security/           # Security utilities
│   └── ...
├── supabase/
│   └── migrations/         # Database migrations
├── google-api-docs/        # API documentation
└── docs/                   # Additional documentation
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [AI Command Center Architecture](AI-COMMAND-CENTER-ARCHITECTURE.md) | Complete system architecture |
| [AI Command Center Summary](AI-COMMAND-CENTER-SUMMARY.md) | Implementation details |
| [Database Schema](google-api-docs/DATABASE_SCHEMA.md) | Full database documentation |
| [Supabase Migrations](supabase/migrations/README.md) | Migration guide |
| [OAuth Flow Guide](docs/OAUTH-QUICK-SUMMARY.md) | OAuth implementation |
| [Production Checklist](PRODUCTION_CHECKLIST.md) | Deployment checklist |

---

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time)
npm run test:e2e:install

# Run E2E tests
npm run test:e2e

# Run in headed mode (visible browser)
npm run test:e2e:headed
```

### Component Testing

```bash
# Start Storybook
npm run storybook
```

---

## Deployment

### Vercel (Recommended)

The app is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Cron Jobs (Vercel)

The following cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/prepare-actions",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/daily-insights",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/process-questions",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/refresh-expiring-tokens",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

| Cron Job | Schedule | Description |
|----------|----------|-------------|
| `process-queue` | Every minute | Process background job queue |
| `prepare-actions` | Every 30 min | Generate AI-prepared review/Q&A responses |
| `daily-insights` | Daily 6 AM | Pattern detection and insights generation |
| `process-questions` | Every 15 min | Auto-answer GMB questions |
| `cleanup` | Daily 2 AM | Database cleanup and maintenance |
| `refresh-expiring-tokens` | Every 6 hours | Refresh OAuth tokens before expiry |

### Other Platforms

Works on any Node.js host supporting Next.js 14. Ensure:
- Runtime environment variables are configured
- Database connections are allowed from host IP
- Cron jobs are configured via external scheduler if needed

---

## Security

The platform implements comprehensive security measures:

- **Authentication** - Supabase Auth with OAuth providers
- **Row Level Security (RLS)** - Database-level access control
- **CSRF Protection** - Token-based CSRF prevention
- **Rate Limiting** - Upstash Redis rate limiting
- **HTML Sanitization** - XSS prevention
- **Input Validation** - Zod schema validation
- **Error Monitoring** - Sentry integration

Security modules: `lib/security/`

See [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) for the latest audit.

---

## Contributing

This repository is currently private. For questions, suggestions, or access requests, please contact the team.

---

## Support

- **Email:** [info@nnh.ae](mailto:info@nnh.ae)
- **Website:** [https://www.nnh.ae](https://www.nnh.ae)

---

## License

All rights reserved. This is proprietary software owned by NNH AI Studio.

---

*Last Updated: December 2025*
