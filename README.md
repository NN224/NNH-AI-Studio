# 🚀 NNH AI Studio - GMB & YouTube Management Platform

<div align="center">

**Professional Management Platform for Google My Business & YouTube**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)](https://tailwindcss.com/)

**Production Ready ✅ | MVP Launch**

</div>

---

## 📋 Overview

NNH AI Studio is a comprehensive SaaS platform for managing Google My Business locations and YouTube channels. Built with Next.js 14 (App Router) and Supabase, it provides AI-powered features for content generation, review management, analytics, and more.

### 🎯 Key Features

#### ✅ Google My Business (GMB) Management
- **Multi-Account OAuth** - Connect multiple GMB accounts securely
- **Multi-Location Support** - Manage unlimited business locations
- **Reviews Management** - View and respond to customer reviews
- **AI-Powered Responses** - Generate intelligent review replies automatically
- **Analytics Dashboard** - Track views, calls, directions, and website clicks
- **Data Sync** - Automatic synchronization with Google Business Profile
- **Account Management** - Easy connect/disconnect functionality

#### ✅ YouTube Management
- **OAuth Integration** - Connect YouTube channels seamlessly
- **Channel Statistics** - Track subscribers, views, and video count
- **Recent Videos** - Display latest uploads with filters
- **Advanced Analytics** - Chart.js visualizations for views & videos per month
- **CSV Export** - Export videos and comments data
- **AI Composer** - Generate titles, descriptions, and hashtags
- **Draft Management** - Save, load, and delete content drafts
- **Comments Display** - View recent comments with search/filter
- **Auto Token Refresh** - Automatic OAuth token renewal

#### ✅ AI Features
- **Review Reply Generator** - Context-aware responses for reviews
- **Content Composer** - AI-powered YouTube content creation
- **Multi-Provider Support** - Groq, Together AI, Deepseek integration
- **Draft System** - Save and manage AI-generated content

#### ✅ User Experience
- **Modern UI** - Glassmorphism dark theme with orange accents
- **Responsive Design** - Mobile-first, works on all devices
- **Real-time Updates** - Live data synchronization
- **Loading States** - Smooth user experience
- **Error Handling** - Graceful error management
- **Toast Notifications** - User-friendly feedback

---

## 🏗️ Technical Stack

### Frontend
- **Next.js 14** - App Router, Server Components
- **React 18.3** - UI library
- **TypeScript 5.0** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Chart.js** - Data visualization
- **Recharts** - Charts and graphs

### Backend
- **Supabase** - PostgreSQL database + Auth + Real-time
- **Next.js API Routes** - Serverless functions
- **Row Level Security** - Data protection
- **OAuth 2.0** - Secure authentication

### Integrations
- **Google My Business API** - Business management
- **YouTube Data API v3** - Channel management
- **Google OAuth** - Authentication
- **Groq AI** - Fast AI inference
- **Together AI** - AI content generation
- **Deepseek AI** - AI capabilities

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Cloud Console project
- Replit account (for deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/NNH-AI-Studio/nnh_new.git
cd nnh_new

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Set up environment variables (see ENV_VARIABLES.md)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# GOOGLE_CLIENT_ID=...
# etc.

# Run database migrations (see SQL_SETUP_COMPLETE.sql)
# Execute in Supabase SQL Editor

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 Documentation

- **[MVP Launch Plan](./MVP_LAUNCH_PLAN.md)** - Feature roadmap and launch strategy
- **[Pre-Publish Checklist](./PRE_PUBLISH_CHECKLIST.md)** - Pre-launch verification
- **[Environment Variables](./ENV_VARIABLES.md)** - Required configuration
- **[SQL Setup](./SQL_SETUP_COMPLETE.sql)** - Database schema
- **[Legacy Comparison](./LEGACY_COMPARISON.md)** - Feature comparison

---

## 🔐 Environment Variables

Required environment variables for production:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google OAuth (GMB)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://www.nnh.ae/api/gmb/oauth-callback

# YouTube OAuth
YT_CLIENT_ID=xxx.apps.googleusercontent.com
YT_CLIENT_SECRET=GOCSPX-xxx

# AI Providers (Optional)
GROQ_API_KEY=gsk_xxx
TOGETHER_API_KEY=xxx
DEEPSEEK_API_KEY=xxx

# Base URL
NEXT_PUBLIC_BASE_URL=https://www.nnh.ae
NEXT_PUBLIC_SITE_URL=https://www.nnh.ae
```

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete details.

---

## 🗄️ Database Schema

### Core Tables
- `gmb_accounts` - Connected GMB accounts
- `gmb_locations` - Business locations
- `gmb_reviews` - Customer reviews
- `oauth_tokens` - OAuth tokens (GMB + YouTube)
- `youtube_drafts` - YouTube content drafts
- `oauth_states` - OAuth state management
- `profiles` - User profiles
- `activity_logs` - Activity tracking

Run [SQL_SETUP_COMPLETE.sql](./SQL_SETUP_COMPLETE.sql) in Supabase SQL Editor.

---

## 🔒 Security

- **Row Level Security (RLS)** - Database-level access control
- **OAuth 2.0** - Secure authentication
- **CSRF Protection** - Cross-site request forgery prevention
- **Session Management** - Secure session handling
- **Token Encryption** - AES-256-GCM for sensitive data
- **Environment Variables** - Secrets management

---

## 📊 API Routes

### GMB Endpoints
- `POST /api/gmb/create-auth-url` - Initiate OAuth
- `GET /api/gmb/oauth-callback` - Handle OAuth callback
- `POST /api/gmb/sync` - Sync GMB data

### YouTube Endpoints
- `POST /api/youtube/create-auth-url` - Initiate OAuth
- `GET /api/youtube/oauth-callback` - Handle OAuth callback
- `GET /api/youtube/videos` - Fetch videos
- `GET /api/youtube/comments` - Fetch comments
- `GET /api/youtube/analytics` - Analytics data
- `POST /api/youtube/composer/generate` - AI content generation
- `POST /api/youtube/token/refresh-if-needed` - Auto token refresh
- `POST /api/youtube/disconnect` - Disconnect channel

---

## 🎨 UI Components

Built with **shadcn/ui** and **Tailwind CSS**:

- Dashboard widgets
- Analytics charts (Chart.js, Recharts)
- Account cards
- Review management UI
- Location cards
- Settings panels
- Toast notifications

---

## 🚢 Deployment

### Replit Deployment
1. Push to GitHub
2. Connect Replit to GitHub repository
3. Set environment variables in Secrets
4. Deploy automatically on push

### Pre-Deployment Checklist
- ✅ Run SQL migrations in Supabase
- ✅ Enable Google APIs (GMB + YouTube)
- ✅ Configure redirect URIs in Google Console
- ✅ Set all environment variables
- ✅ Test OAuth flows
- ✅ Verify database connections

See [PRE_PUBLISH_CHECKLIST.md](./PRE_PUBLISH_CHECKLIST.md).

---

## 🧪 Testing

### Manual Testing
- GMB OAuth flow
- YouTube OAuth flow
- Review sync
- Stats display
- Analytics charts
- AI Composer
- CSV export
- Token refresh

### Automated Testing
```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 🗺️ Roadmap

### Phase 2 (1-2 months)
- YouTube Video Upload
- GMB Keyword Rankings
- GMB Posts Management

### Phase 3 (3-4 months)
- Comment Management & Replies
- Media Gallery Management
- Local Directories/Citations

### Phase 4 (5-6 months)
- Autopilot/Automations
- Advanced Analytics
- AI Voice Studio

See [MVP_LAUNCH_PLAN.md](./MVP_LAUNCH_PLAN.md) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Proprietary - NNH AI Studio © 2025

---

## 📞 Contact

- **Website**: [nnh.ae](https://www.nnh.ae)
- **Email**: info@nnh.ae
- **Phone**: +971 543 6655 48
- **WhatsApp**: +971 58 883 9119

---

<div align="center">

**Made with ❤️ by NNH AI Studio**

[Documentation](./MVP_LAUNCH_PLAN.md) · [Issues](https://github.com/NNH-AI-Studio/nnh_new/issues) · [Features](./LEGACY_COMPARISON.md)

</div>

