# AI-First GMB Platform - Project Context

## What We're Building
A revolutionary AI-powered Google My Business management platform with:
- **Automatic Review Replies** (no approval needed)
- **Automatic Question Answers** (confidence-based)
- **AI Profile Suggestions** (user approves before applying)
- **AI Co-Pilot Chat** (conversational interface)
- **Predictive Analytics** (alerts before problems)
- **Competitor Intelligence** (24/7 monitoring)

---

## Core Philosophy

### Fully Automatic (No Approval)
✅ Review Replies - AI responds immediately (< 1 minute)
✅ Question Answers - AI answers if confidence > 80%

### User Approval Required
⚠️ Profile Changes (description, hours, attributes, categories)
⚠️ All GMB direct updates

**Reason:** User maintains full control over business profile while enjoying instant customer service automation.

---

## Key Technical Decisions

### 1. Backend-First Development
**Decision:** Build backend → Test → Frontend → Test → Deploy
**Reason:** Ensures APIs work before building UI, less rework
**Consequence:** Must maintain discipline to complete frontend for each feature

### 2. Feature-by-Feature Deployment
**Decision:** Complete each feature 100% before moving to next
**Reason:** Continuous value delivery, early feedback
**Consequence:** Requires strict checklist adherence

### 3. Multi-AI Routing
**Decision:** Use best AI model for each task
- Gemini: Creative content (descriptions, posts)
- Claude: Empathetic responses (reviews, questions)
- GPT-4: Analysis and structured data
- Groq: Speed-critical real-time responses
- DeepSeek: Code generation

**Reason:** Optimize for quality, speed, and cost
**Consequence:** More complex routing logic, but better results

### 4. No Mock Data
**Decision:** Production-ready code from day 1
**Reason:** User wants real, working platform
**Consequence:** More testing required, but better quality

---

## Current Phase
**Week 1:** Enhanced Auto-Reply System
**Status:** Day 1 - In Progress
**Focus:** Remove approval requirement, add per-rating settings

---

## Architecture

### Database
- Supabase PostgreSQL
- RLS (Row Level Security) enabled
- Multi-tenancy support

### Backend
- Next.js API Routes
- Server Actions
- TypeScript

### Frontend
- Next.js 14 App Router
- React Server Components
- Tailwind CSS
- Radix UI components

### AI Providers
- Primary: Gemini, Claude, Groq
- Fallback: DeepSeek, Together AI, OpenAI
- Routing: Smart selection based on task type

---

## Success Metrics

### Technical
- Review response time: < 1 minute
- Question answer time: < 2 minutes
- AI accuracy rate: > 95%
- System uptime: > 99.9%

### Business
- User time saved: > 5 hours/week
- Profile completeness: +40%
- AI suggestion acceptance: > 70%
- Customer satisfaction: > 4.5/5

---

## Team
- Developer: Working with AI Assistant
- Language: Arabic (documentation in English for code clarity)
- Timeline: 4 weeks (MVP in 1 day)

