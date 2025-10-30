# 📊 GMB Manager Platform - Project Summary

## 🎯 Overview

This is a **Google My Business Management Platform** built with **Next.js 14** and **Supabase**. The project provides complete management for GMB locations, reviews, analytics, and AI-powered content generation.

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Next.js 14** (App Router)
- **React 18.3**
- **TypeScript**
- **Tailwind CSS 4** (Custom dark theme with Orange accents)
- **shadcn/ui** components
- **Framer Motion** (animations)
- **Recharts** (data visualization)

### Backend Stack
- **Supabase** (PostgreSQL database + Auth + Real-time)
- **Next.js API Routes**
- **Google OAuth 2.0**

### Third-Party Integrations
- **Google My Business API** (GMB Management)
- **YouTube Data API** (Content management)
- **Supabase Auth** (Authentication)

---

## 📁 Project Structure

```
app/
├── (dashboard)/          # Protected dashboard routes
│   ├── dashboard/       # Main dashboard with stats
│   ├── locations/       # GMB locations management
│   ├── reviews/         # Reviews management & responses
│   ├── accounts/        # Google accounts connection
│   ├── ai-studio/       # AI content generation
│   ├── analytics/       # Analytics & insights
│   └── settings/        # User settings
├── auth/                # Authentication pages
│   ├── login/          # Login with multiple methods
│   ├── signup/         # User registration
│   ├── reset/          # Password reset
│   └── callback/       # OAuth callback handler
├── api/
│   ├── gmb/            # Google My Business API routes
│   │   ├── create-auth-url/     # OAuth initiation
│   │   ├── oauth-callback/      # OAuth callback handler
│   │   └── sync/                # Sync GMB data
│   └── youtube/        # YouTube API routes
├── home/               # Landing page for logged-in users
├── about/              # About page
├── contact/            # Contact page
├── pricing/            # Pricing page
├── privacy/            # Privacy policy
└── terms/              # Terms of service

components/
├── accounts/           # Account management components
├── analytics/          # Analytics charts & widgets
├── dashboard/          # Dashboard widgets
├── layout/             # Header, sidebar, footer
├── locations/          # Location management UI
├── reviews/            # Review management UI
└── ui/                 # shadcn/ui base components

lib/
├── supabase/           # Supabase client configs
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── types/              # TypeScript types

supabase/
├── migrations/         # Database migrations
└── config.toml         # Supabase local config
```

---

## 🔐 Authentication System

### Supported Methods
1. **Email & Password** (Traditional login)
2. **Google OAuth** (Google Sign-In)
3. **Magic Link** (Passwordless email)
4. **Phone OTP** (SMS authentication)

### Protected Routes
All routes under `/dashboard/*` require authentication via middleware.

### OAuth Flow
```
User clicks "Connect Account" 
  ↓
GET /api/gmb/create-auth-url
  ↓
Save OAuth state to DB
  ↓
Redirect to Google OAuth
  ↓
User authorizes
  ↓
Google redirects to /api/gmb/oauth-callback
  ↓
Exchange code for tokens
  ↓
Fetch GMB account info
  ↓
Save to database
  ↓
Redirect to /accounts
```

---

## 🗄️ Database Schema

### Core Tables
- **profiles** - User profile information
- **gmb_accounts** - Connected Google accounts
- **gmb_locations** - Business locations
- **gmb_reviews** - Customer reviews
- **oauth_states** - OAuth security states

### Key Relationships
```
users (Supabase Auth)
  ↓
profiles
  ↓
gmb_accounts (1:N)
  ↓
gmb_locations (1:N)
  ↓
gmb_reviews (1:N)
```

---

## 🎨 Design System

### Color Palette
- **Background**: Pure Black `#000000`
- **Cards**: Dark Gray `#111111`
- **Primary**: Electric Orange `#FF6B00`
- **Accent**: Deep Orange `#FF8C00`
- **Secondary**: Space Dark `#0A0A0A`
- **Borders**: Orange with 30% opacity

### Key Features
- Full dark theme
- Glassmorphism effects
- Gradient text & backgrounds
- Smooth animations
- Responsive design (mobile-first)

---

## 🌟 Key Features

### 1. Multi-Account Management
- Connect multiple GMB accounts
- Overview of all locations
- Automatic sync

### 2. Review Management
- View all reviews
- Sentiment Analysis
- AI auto-reply
- Response rate tracking

### 3. Analytics Dashboard
- Location statistics
- Charts and graphs
- Performance metrics
- PDF reports

### 4. AI Studio
- Content generation
- Review reply suggestions
- Description optimization
- Post creation

### 5. Locations Management
- Manage multiple locations
- Update information
- Media management
- Individual location stats

---

## 🔌 APIs Integration

### Google My Business API
**Base URL**: `https://mybusiness.googleapis.com`

**Scopes Required**:
- `business.manage`
- `userinfo.email`
- `userinfo.profile`

**Endpoints Used**:
- List accounts
- List locations
- Fetch reviews
- Update business info

### YouTube Data API
**Base URL**: `https://www.googleapis.com/youtube/v3`

**Features**:
- Video analytics
- Comment management
- Content generation
- Upload automation

---

## 🚀 Environment Variables

### Required Secrets
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://nnh.ae/api/gmb/oauth-callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Domain
NEXT_PUBLIC_BASE_URL=https://nnh.ae
NEXT_PUBLIC_SITE_URL=https://nnh.ae
```

---

## 📝 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud Console access

### Installation
```bash
# Clone repository
git clone <repo-url>
cd "nnhnew 3"

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start dev server (port 5000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push database migrations
```

---

## 🔒 Security Features

### Authentication
- JWT-based sessions
- Secure cookie handling
- OAuth state validation
- Session refresh tokens

### Data Protection
- Row Level Security (RLS) in Supabase
- Encrypted connections (HTTPS)
- Server-side API calls only
- Input validation with Zod

### OAuth Security
- Random state generation
- State expiry (30 minutes)
- One-time use states
- Token encryption

---

## 📊 Database Migrations

### Migration Files
1. `001_create_gmb_schema.sql` - Core GMB tables
2. `002_create_profile_trigger.sql` - Auto-profile creation
3. Additional migrations in `supabase/migrations/`

### Run Migrations
```bash
# Push to Supabase
npm run db:push

# Reset database
npm run db:reset
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration
- [ ] Login (all methods)
- [ ] GMB account connection
- [ ] Review fetching
- [ ] Review response
- [ ] Analytics display
- [ ] AI content generation
- [ ] Sync functionality

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: `redirect_uri_mismatch`
- **Solution**: Verify redirect URI in Google Console matches exactly

**Issue**: Database connection failed
- **Solution**: Check Supabase credentials and network

**Issue**: OAuth state not found
- **Solution**: Ensure admin client is used for state operations

**Issue**: CORS errors
- **Solution**: Verify NEXT_PUBLIC_BASE_URL matches deployment URL

---

## 📚 Documentation

### Internal Docs
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `SECRETS_CHECKLIST.txt` - Environment variables checklist
- `docs/gmb-oauth-production.md` - OAuth production guide

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google My Business API](https://developers.google.com/my-business)

---

## 🚢 Deployment

### Production Checklist
- [ ] All environment variables set
- [ ] Google OAuth configured
- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] CDN enabled (optional)

### Deployment Platforms
- **Replit** (Current)
- **Vercel** (Recommended)
- **Railway**
- **Fly.io**

---

## 📈 Future Enhancements

### Planned Features
- [ ] Multi-language support (AR/EN)
- [ ] Advanced AI analytics
- [ ] Bulk review responses
- [ ] White-label options
- [ ] Mobile app
- [ ] API access for developers
- [ ] Custom reporting
- [ ] Integration with other platforms

---

## 👥 Team

**Project**: NNH - AI Studio  
**Version**: 1.0.0  
**Last Updated**: October 2025  
**Domain**: https://nnh.ae

---

## 📄 License

Proprietary - All rights reserved

---

## 🙏 Credits

- Built with [Next.js](https://nextjs.org)
- Powered by [Supabase](https://supabase.com)
- UI Components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

---

**Created**: October 29, 2025  
**Last Updated**: October 30, 2025

