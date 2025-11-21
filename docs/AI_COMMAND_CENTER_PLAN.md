# 🤖 AI Command Center - Implementation Plan

## 📋 Overview

Option B: AI Command Center as a Hub with links to detailed pages

---

## 🎯 Core Concept

```
AI Command Center (Hub)
├─ Overview Dashboard (70% width)
│  ├─ Quick Stats Grid
│  ├─ Urgent Items Feed
│  ├─ AI Insights Panel
│  └─ Management Section Cards
│     ├─ Reviews → /reviews
│     ├─ Posts → /posts
│     └─ Q&A → /questions
│
└─ AI Companion (30% width)
   ├─ Context-aware Chat
   ├─ Smart Suggestions
   ├─ Quick Actions
   └─ Proactive Alerts
```

---

## 🏗️ Implementation Phases

### Phase 1: Basic Layout (Day 1) ⏰ 4 hours

**Goal:** Create the main layout structure

#### Files to Create:

```
components/ai-command-center/
├─ layout/
│  ├─ ai-command-center-layout.tsx
│  └─ ai-companion-sidebar.tsx
├─ stats/
│  ├─ stats-grid.tsx
│  └─ stat-card.tsx
└─ index.ts
```

#### Tasks:

- [x] Create basic layout component
- [ ] Implement 70/30 split layout
- [ ] Add responsive design (mobile = stacked)
- [ ] Setup i18n for all text

---

### Phase 2: Stats Grid (Day 1-2) ⏰ 5 hours

**Goal:** Display real-time stats overview

#### Components:

```tsx
<StatsGrid>
  <StatCard
    icon={Star}
    title={t("reviews")}
    value={150}
    change="+12%"
    urgent={5}
    href="/reviews"
  />
  <StatCard
    icon={FileText}
    title={t("posts")}
    value={24}
    change="+8%"
    href="/posts"
  />
  <StatCard
    icon={HelpCircle}
    title={t("questions")}
    value={18}
    urgent={3}
    href="/questions"
  />
</StatsGrid>
```

#### API Integration:

- Fetch review count from `/api/gmb/reviews/stats`
- Fetch post count from `/api/gmb/posts/stats`
- Fetch questions count from `/api/gmb/questions/stats`

---

### Phase 3: Urgent Items Feed (Day 2-3) ⏰ 6 hours

**Goal:** Show items requiring immediate attention

#### Components:

```tsx
<UrgentItemsFeed>
  <UrgentItem
    type="review"
    priority="high"
    title="Negative review needs reply"
    content="Slow service during lunch..."
    timestamp="2h ago"
    actions={[
      { label: "AI Reply", icon: Sparkles, onClick: handleAIReply },
      { label: "View Full", icon: ArrowRight, href: "/reviews/123" },
    ]}
  />
</UrgentItemsFeed>
```

#### Logic:

- Filter reviews with rating < 3 and no reply
- Filter questions unanswered > 24h
- Show scheduled posts for today
- Sort by priority (negative reviews = highest)

---

### Phase 4: AI Companion Chat (Day 3-5) ⏰ 10 hours

**Goal:** Interactive AI assistant

#### Components:

```tsx
<AICompanionSidebar>
  <AIStatus status="monitoring" />

  <AIAlerts>
    <Alert severity="high">2 urgent reviews need attention</Alert>
  </AIAlerts>

  <ChatInterface>
    <MessageList messages={messages} />
    <ChatInput placeholder={t("askAI")} onSend={handleSendMessage} />
  </ChatInterface>

  <QuickActions>
    <ActionButton onClick={replyAllPending}>Reply to All Pending</ActionButton>
    <ActionButton onClick={generatePost}>Generate Post</ActionButton>
  </QuickActions>
</AICompanionSidebar>
```

#### AI Features:

- Context awareness (knows which location, stats, etc.)
- Proactive suggestions based on data
- Quick actions with AI assistance
- Conversation memory

---

### Phase 5: Management Cards (Day 5-6) ⏰ 6 hours

**Goal:** Quick access to detailed pages

#### Components:

```tsx
<ManagementSectionsGrid>
  <ManagementCard
    icon={Star}
    title={t("reviewsManagement")}
    stats={{
      total: 150,
      pending: 5,
      responseRate: "85%",
    }}
    actions={[
      { label: t("viewAll"), href: "/reviews", variant: "default" },
      { label: t("respondPending"), href: "/reviews?status=pending" },
    ]}
  />

  <ManagementCard
    icon={FileText}
    title={t("postsManagement")}
    stats={{
      published: 24,
      scheduled: 3,
      nextPost: "3:00 PM",
    }}
    actions={[
      { label: t("createNew"), href: "/posts/create", variant: "default" },
      { label: t("manage"), href: "/posts" },
    ]}
  />

  <ManagementCard
    icon={HelpCircle}
    title={t("qaManagement")}
    stats={{
      total: 18,
      unanswered: 3,
      avgResponseTime: "2.5h",
    }}
    actions={[
      {
        label: t("answer"),
        href: "/questions?status=pending",
        variant: "default",
      },
      { label: t("viewAll"), href: "/questions" },
    ]}
  />
</ManagementSectionsGrid>
```

---

### Phase 6: AI Smart Features (Day 7-10) ⏰ 12 hours

#### 6.1: Smart Alerts System

```typescript
interface AIAlert {
  id: string;
  type: "review" | "question" | "post" | "insight";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestedAction?: AIAction;
  timestamp: Date;
}

// Examples:
-"Negative review pattern detected (3 complaints about parking)" -
  "Competitor posted similar content 2h ago" -
  "Best time to post is in 30 minutes" -
  "Response rate dropped below 80%";
```

#### 6.2: Pattern Recognition

```typescript
// Detect trends and patterns
- Common complaint topics
- Best performing post types
- Peak customer question times
- Rating trends
```

#### 6.3: Predictive Actions

```typescript
// AI suggests before you ask
-"Draft reply ready for John's review" -
  "Generate post about [topic] now for max engagement" -
  "Similar question answered before - use template?";
```

---

## 📂 File Structure

```
components/
├─ ai-command-center/
│  ├─ layout/
│  │  ├─ ai-command-center-layout.tsx
│  │  └─ ai-companion-sidebar.tsx
│  ├─ stats/
│  │  ├─ stats-grid.tsx
│  │  └─ stat-card.tsx
│  ├─ urgent/
│  │  ├─ urgent-items-feed.tsx
│  │  └─ urgent-item-card.tsx
│  ├─ management/
│  │  ├─ management-sections-grid.tsx
│  │  └─ management-card.tsx
│  ├─ ai/
│  │  ├─ ai-chat-interface.tsx
│  │  ├─ ai-alerts.tsx
│  │  ├─ ai-quick-actions.tsx
│  │  └─ ai-suggestions.tsx
│  └─ insights/
│     ├─ ai-insights-panel.tsx
│     └─ insight-card.tsx
│
├─ shared/
│  └─ (existing components)
│
app/[locale]/(dashboard)/
├─ ai-command-center/
│  └─ page.tsx
├─ reviews/
│  └─ page.tsx (existing)
├─ posts/
│  └─ page.tsx (existing)
└─ questions/
   └─ page.tsx (existing)
```

---

## 🌐 API Endpoints Needed

```typescript
// Stats
GET /api/gmb/stats/overview
Response: {
  reviews: { total: 150, pending: 5, responseRate: 0.85, trend: '+12%' },
  posts: { total: 24, scheduled: 3, nextPostTime: '15:00' },
  questions: { total: 18, unanswered: 3, avgResponseTime: '2.5h' }
}

// Urgent Items
GET /api/gmb/urgent-items
Response: {
  items: [
    {
      type: 'review',
      id: '123',
      priority: 'high',
      title: 'Negative review',
      content: '...',
      timestamp: '...'
    }
  ]
}

// AI Chat
POST /api/ai/chat
Request: { message: '...', context: {...} }
Response: { message: '...', suggestions: [...], actions: [...] }

// AI Actions
POST /api/ai/actions/reply-review
POST /api/ai/actions/generate-post
POST /api/ai/actions/answer-question
```

---

## 🎨 Design Tokens

```typescript
// Layout
const LAYOUT = {
  mainWidth: "70%",
  sidebarWidth: "30%",
  gap: "1.5rem",
  mobile: {
    mainWidth: "100%",
    sidebarWidth: "100%",
  },
};

// Colors
const COLORS = {
  urgent: "red-500",
  warning: "yellow-500",
  success: "green-500",
  info: "blue-500",
  aiPrimary: "purple-500",
  aiSecondary: "violet-500",
};
```

---

## 📊 Timeline

```
Week 1: Foundation
├─ Day 1-2: Layout + Stats Grid
├─ Day 3: Urgent Items
└─ Day 4-5: Management Cards

Week 2: AI Features
├─ Day 6-7: AI Chat Interface
├─ Day 8: Smart Alerts
└─ Day 9-10: AI Actions

Week 3: Polish & Advanced
├─ Day 11-12: AI Insights + Patterns
├─ Day 13: Testing
└─ Day 14: Documentation
```

---

## ✅ Success Criteria

- [ ] AI Command Center loads in < 2 seconds
- [ ] All stats display real data from API
- [ ] AI chat responds within 3 seconds
- [ ] Urgent items update in real-time
- [ ] Links to detail pages work correctly
- [ ] Mobile responsive design works
- [ ] i18n works for EN/AR
- [ ] AI suggestions are contextually relevant
- [ ] Quick actions execute successfully

---

## 🚀 Next Steps

1. Start with Phase 1: Create basic layout
2. Implement stats grid with mock data
3. Connect to real API endpoints
4. Add AI chat interface
5. Integrate AI features progressively
