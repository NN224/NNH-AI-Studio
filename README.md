NNH AI Studio

Professional GMB & YouTube Management Platform (BETA)

Overview
- NNH AI Studio is a Next.js 14 application that helps teams manage Google Business Profiles (GMB), analyze YouTube performance, and generate content using multiple AI providers.
- Tech stack: Next.js App Router, React 18, TypeScript, Tailwind CSS, Supabase, Sentry, Playwright, Jest, Storybook, i18n.
- Homepage: https://www.nnh.ae

Key Features
- Google Business Profile management and scheduled sync
- YouTube analytics and content workflows
- AI-assisted content generation and responses (OpenAI, Anthropic, Groq, DeepSeek, Together)
- Realtime dashboards with charts and metrics
- Internationalization and theming
- Robust security: CSRF, HTML sanitization, rate limiting, Sentry monitoring

Quick Start
1) Prerequisites
- Node.js 18+ and npm 9+ (or pnpm/yarn)
- Supabase project credentials
- At least one AI provider API key (e.g., OpenAI or Anthropic)

2) Install dependencies
```
npm install
```

3) Configure environment variables
- Create a .env.local file in the project root. Below are commonly used variables. Only a subset is required to run basic features; others enable optional integrations.

Required (minimum for local dev)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- OPENAI_API_KEY or ANTHROPIC_API_KEY (at least one AI provider)

Common/Optional
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_APP_URL, APP_URL, VERCEL_URL
- GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- GROQ_API_KEY, DEEPSEEK_API_KEY, TOGETHER_API_KEY, SYSTEM_OPENAI_API_KEY, SYSTEM_ANTHROPIC_API_KEY
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, YT_CLIENT_ID
- CRON_SECRET, UPTIME_ROBOT_API_KEY, GOOGLE_WEBHOOK_SECRET, GMB_WEBHOOK_SECRET
- SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME
- EMAIL_USER, EMAIL_PASSWORD, EMAIL_HOST
- SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN (build-time for uploading source maps)

4) Run the app
```
npm run dev
```
- App runs by default at http://localhost:5050

Useful Scripts
- npm run dev — Start the development server (port 5050)
- npm run build — Production build (with CSS extraction helper)
- npm start — Start the production server (port 5000)
- npm run lint — Lint the codebase
- npm run test — Run unit tests (Jest)
- npm run test:coverage — Unit test coverage
- npm run test:e2e — Run Playwright end-to-end tests
- npm run storybook — Start Storybook
- npm run build-storybook — Build Storybook
- npm run db:update-docs — Update database schema docs

Project Structure
- See PROJECT_STRUCTURE.txt for a generated overview of files and directories.

Documentation
- API & Database docs: google-api-docs/README.md
- Full database schema: google-api-docs/DATABASE_SCHEMA.md
- Supabase migrations guide: supabase/migrations/README.md
- AI Command Center docs: components/ai-command-center/README.md
- Home page performance notes: docs/HOME_PAGE_PERFORMANCE.md

Testing
- Unit tests: npm run test (Jest + @testing-library)
- E2E tests: npm run test:e2e (Playwright)
  - First run: npm run test:e2e:install
- Accessibility checks: jest-axe integration available in tests

Deployment
- The app is designed for platforms like Vercel or any Node.js host that supports Next.js 14.
- Ensure runtime environment variables are configured (see Environment section).
- Sentry: set SENTRY_DSN (runtime) and SENTRY_AUTH_TOKEN (build-time for source maps).

Security
- See SECURITY_AUDIT_REPORT.md for the latest audit notes and recommendations.
- Important security modules live under lib/security/ (CSRF, sanitization, encryption, rate limiting).

Contributing
- This repository is currently marked as private in package.json.
- For questions, suggestions, or access requests, please contact the authors below.

Support / Contact
- Email: info@nnh.ae
- Website: https://www.nnh.ae

License
- No license file is included. All rights reserved by NNH AI Studio unless otherwise specified.
