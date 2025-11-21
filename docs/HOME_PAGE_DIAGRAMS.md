# 📊 Home Page Redesign - Visual Diagrams

> **ملف مخصص للرسوم التوضيحية والـ Diagrams**

---

## 🗺️ Overall Architecture

```mermaid
graph TB
    subgraph Client["Client Side"]
        UI[User Interface]
        State[State Management]
        Cache[Query Cache]
    end

    subgraph Server["Server Side - Next.js"]
        SSR[Server Components]
        API[API Routes]
        Middleware[Middleware]
    end

    subgraph Backend["Backend - Supabase"]
        DB[(Database)]
        Auth[Authentication]
        Realtime[Realtime Engine]
        Storage[File Storage]
    end

    subgraph AI["AI Services"]
        OpenAI[OpenAI API]
        Groq[Groq API]
        Custom[Custom Models]
    end

    UI --> State
    State --> Cache
    UI --> SSR
    SSR --> API
    API --> DB
    API --> Auth
    API --> Storage
    Realtime --> Cache
    API --> OpenAI
    API --> Groq
    API --> Custom

    style Client fill:#3b82f6,stroke:#2563eb,color:#fff
    style Server fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Backend fill:#10b981,stroke:#059669,color:#fff
    style AI fill:#f97316,stroke:#ea580c,color:#fff
```

---

## 🎯 User Journey Flow

```mermaid
flowchart TD
    Start([User Opens App]) --> Auth{Authenticated?}

    Auth -->|No| Login[Login Page]
    Login --> Auth

    Auth -->|Yes| FirstTime{First Time?}

    FirstTime -->|Yes| Onboarding[🎓 Onboarding Tour]
    Onboarding --> Wizard[Setup Wizard]
    Wizard --> Connect[Connect Accounts]
    Connect --> Home

    FirstTime -->|No| Home[🏠 Home Dashboard]

    Home --> HasData{Has Data?}

    HasData -->|No| EmptyState[📭 Empty State]
    EmptyState --> ConnectCTA[Connect Account CTA]
    ConnectCTA --> Connect

    HasData -->|Yes| Dashboard[📊 Full Dashboard]

    Dashboard --> QuickAction[Quick Actions]
    Dashboard --> Stats[View Stats]
    Dashboard --> Insights[AI Insights]
    Dashboard --> Activity[Activity Feed]

    QuickAction --> Features[App Features]
    Stats --> Details[Stats Details Modal]
    Insights --> AIChat[AI Chat Widget]
    Activity --> ReviewReply[Reply to Review]

    Features --> Home
    Details --> Home
    AIChat --> Home
    ReviewReply --> Home

    style Start fill:#10b981,stroke:#059669,color:#fff
    style Home fill:#f97316,stroke:#ea580c,color:#fff
    style Dashboard fill:#3b82f6,stroke:#2563eb,color:#fff
```

---

## 📱 Page Layout Structure

```mermaid
graph TB
    Page[Home Page Container]

    Page --> BG[Background Layer]
    Page --> Content[Content Layer]

    BG --> Gradient[Animated Gradient]
    BG --> Blobs[Floating Blobs]

    Content --> Header[Smart Header]
    Content --> Main[Main Content]

    Header --> Avatar[User Avatar]
    Header --> Welcome[Welcome Message]
    Header --> Actions[Header Actions]

    Actions --> Lang[Language Switcher]
    Actions --> Notif[Notifications]
    Actions --> Settings[Settings Button]
    Actions --> Logout[Logout Button]

    Main --> Hero[Dashboard Hero]
    Main --> Quick[Quick Actions]
    Main --> Stats[Stats Overview]
    Main --> AI[AI Insights]
    Main --> Activities[Activities Section]

    Hero --> Greeting[Personalized Greeting]
    Hero --> Progress[Profile Progress]
    Hero --> Summary[Quick Summary]

    Quick --> QA1[Upload Video]
    Quick --> QA2[View Analytics]
    Quick --> QA3[Reply Reviews]
    Quick --> QA4[Manage Locations]
    Quick --> QA5[Create Post]
    Quick --> QA6[AI Studio]

    Stats --> SC1[Locations Card]
    Stats --> SC2[Reviews Card]
    Stats --> SC3[Rating Card]
    Stats --> SC4[Accounts Card]
    Stats --> SC5[YouTube Card]

    AI --> InsightsList[Insights List]
    AI --> ChatWidget[AI Chat Widget]
    AI --> NotifCenter[Notification Center]

    Activities --> Feed[Activity Feed]
    Activities --> Recent[Recent Timeline]

    style Page fill:#000,stroke:#f97316,color:#fff
    style Content fill:#111827,stroke:#f97316,color:#fff
    style Hero fill:#f97316,stroke:#ea580c,color:#fff
```

---

## 🎨 Component Hierarchy

```mermaid
graph LR
    HomePage[HomePage] --> Layout1[Header Section]
    HomePage --> Layout2[Hero Section]
    HomePage --> Layout3[Quick Actions]
    HomePage --> Layout4[Stats Section]
    HomePage --> Layout5[AI Section]
    HomePage --> Layout6[Activity Section]
    HomePage --> Layout7[Modals & Overlays]

    Layout1 --> C1[SmartHeader]

    Layout2 --> C2[DashboardHero]
    C2 --> C2A[PersonalizedGreeting]
    C2 --> C2B[ProgressTracker]
    C2 --> C2C[QuickStatsSummary]

    Layout3 --> C3[QuickActions]
    C3 --> C3A[ActionButton x6]

    Layout4 --> C4[StatsOverview]
    C4 --> C4A[StatCard]
    C4A --> C4A1[MiniChart]
    C4A --> C4A2[TrendIndicator]

    Layout5 --> C5[AIInsights]
    C5 --> C5A[InsightCard]
    C5 --> C5B[AIChatWidget]
    C5 --> C5C[SmartNotifications]

    Layout6 --> C6A[ActivityFeed]
    Layout6 --> C6B[RecentActivity]
    C6A --> C6A1[ActivityFilters]
    C6A --> C6A2[ActivityItem]

    Layout7 --> C7A[OnboardingTour]
    Layout7 --> C7B[SetupWizard]
    Layout7 --> C7C[CelebrationModal]
    Layout7 --> C7D[StatsModal]

    style HomePage fill:#f97316,stroke:#ea580c,color:#fff
    style Layout2 fill:#3b82f6,stroke:#2563eb,color:#fff
    style Layout5 fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## 🔄 Data Flow Diagram

```mermaid
sequenceDiagram
    autonumber

    participant U as User
    participant HP as Home Page
    participant SC as Server Component
    participant SB as Supabase
    participant AI as AI Engine
    participant RT as Realtime

    U->>HP: Navigate to /home
    HP->>SC: Server-side render

    par Parallel Data Fetching
        SC->>SB: Fetch user profile
        SC->>SB: Fetch stats (locations, reviews)
        SC->>SB: Fetch recent activities
        SC->>SB: Fetch YouTube data
    end

    SB-->>SC: Return all data
    SC->>AI: Generate insights
    AI-->>SC: AI recommendations

    SC-->>HP: Render with data
    HP-->>U: Show dashboard

    Note over HP,RT: Real-time subscriptions start

    RT->>HP: Subscribe to reviews table
    RT->>HP: Subscribe to activities

    SB-->>RT: New review created
    RT-->>HP: Push update
    HP->>HP: Update UI + Toast notification
    HP-->>U: Show new activity

    U->>HP: Click on stat card
    HP->>HP: Show stats modal
    HP-->>U: Display detailed stats

    U->>HP: Interact with AI insight
    HP->>AI: Request AI assistance
    AI-->>HP: AI response
    HP-->>U: Show AI suggestion
```

---

## 📊 State Management Structure

```mermaid
graph TD
    subgraph Global["Global State (Zustand)"]
        UI[UI State]
        User[User State]
        Prefs[Preferences]
    end

    subgraph Server["Server State (React Query)"]
        Stats[Stats Query]
        Activities[Activities Query]
        Insights[Insights Query]
        Profile[Profile Query]
    end

    subgraph Local["Local State (useState)"]
        Modals[Modal States]
        Forms[Form States]
        Filters[Filter States]
    end

    subgraph Realtime["Realtime State"]
        Reviews[Reviews Channel]
        Notifications[Notifications Channel]
        Updates[Updates Channel]
    end

    UI --> Modals
    UI --> Filters
    User --> Profile
    Prefs --> UI

    Stats --> Activities
    Activities --> Insights

    Reviews --> Stats
    Notifications --> UI
    Updates --> Activities

    style Global fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Server fill:#3b82f6,stroke:#2563eb,color:#fff
    style Realtime fill:#f97316,stroke:#ea580c,color:#fff
```

---

## 🎮 Gamification System

```mermaid
graph TB
    User[User Actions] --> Tracker[Achievement Tracker]

    Tracker --> Check{Check Criteria}

    Check -->|Met| Unlock[Unlock Achievement]
    Check -->|Not Met| Progress[Update Progress]

    Unlock --> Celebrate[🎉 Celebration Animation]
    Unlock --> Points[Award Points]
    Unlock --> Badge[Award Badge]

    Celebrate --> Toast[Show Toast]
    Celebrate --> Confetti[Confetti Effect]
    Celebrate --> Sound[Sound Effect]

    Points --> Level{Level Up?}
    Level -->|Yes| LevelUp[🆙 Level Up!]
    Level -->|No| Continue[Continue]

    LevelUp --> Rewards[Unlock Rewards]
    Rewards --> Features[New Features]
    Rewards --> Themes[New Themes]
    Rewards --> Perks[Perks]

    Badge --> Collection[Badge Collection]
    Collection --> Display[Profile Display]

    Progress --> Goals[Daily Goals]
    Goals --> Streak[Streak Counter]

    style Unlock fill:#10b981,stroke:#059669,color:#fff
    style Celebrate fill:#f97316,stroke:#ea580c,color:#fff
    style LevelUp fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## 🎯 AI Insights Engine

```mermaid
flowchart TD
    Start[User Data Input] --> Collect[Data Collection]

    Collect --> Stats[Fetch Stats]
    Collect --> Reviews[Fetch Reviews]
    Collect --> Activities[Fetch Activities]
    Collect --> History[Fetch History]

    Stats --> Analyze[AI Analysis Engine]
    Reviews --> Analyze
    Activities --> Analyze
    History --> Analyze

    Analyze --> Score[Score & Prioritize]

    Score --> Category{Categorize}

    Category -->|Low Performance| Alert[⚠️ Alert Insight]
    Category -->|Opportunity| Recommend[💡 Recommendation]
    Category -->|Good| Success[✅ Success Insight]
    Category -->|Trend| Tip[📊 Tip Insight]

    Alert --> Priority1[High Priority]
    Recommend --> Priority2[Medium Priority]
    Success --> Priority3[Low Priority]
    Tip --> Priority2

    Priority1 --> Generate[Generate Insight]
    Priority2 --> Generate
    Priority3 --> Generate

    Generate --> Impact[Calculate Impact]
    Impact --> Action[Attach Action]

    Action --> Display[Display to User]

    Display --> UserAction{User Action}

    UserAction -->|Act| Execute[Execute Action]
    UserAction -->|Dismiss| Learn[Learn Preference]
    UserAction -->|Ignore| Track[Track Engagement]

    Execute --> Feedback[Collect Feedback]
    Learn --> Improve[Improve Algorithm]
    Track --> Improve

    Improve --> Start

    style Analyze fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Alert fill:#ef4444,stroke:#dc2626,color:#fff
    style Recommend fill:#f97316,stroke:#ea580c,color:#fff
    style Success fill:#10b981,stroke:#059669,color:#fff
```

---

## 📱 Responsive Layout

```mermaid
graph TD
    Layout[Responsive Layout]

    Layout --> Mobile[📱 Mobile <768px]
    Layout --> Tablet[📱 Tablet 768-1024px]
    Layout --> Desktop[💻 Desktop 1024-1440px]
    Layout --> Large[🖥️ Large >1440px]

    Mobile --> M1[Single Column]
    Mobile --> M2[Stacked Components]
    Mobile --> M3[Bottom Navigation]
    Mobile --> M4[Compact Header]

    Tablet --> T1[2 Column Grid]
    Tablet --> T2[Side-by-Side Stats]
    Tablet --> T3[Collapsible Sidebar]

    Desktop --> D1[3 Column Grid]
    Desktop --> D2[Full Stats Grid]
    Desktop --> D3[Split Activity View]
    Desktop --> D4[Expanded Header]

    Large --> L1[4 Column Grid]
    Large --> L2[Wide Layout]
    Large --> L3[Side Panels]
    Large --> L4[More Whitespace]

    style Mobile fill:#ef4444,stroke:#dc2626,color:#fff
    style Tablet fill:#f97316,stroke:#ea580c,color:#fff
    style Desktop fill:#3b82f6,stroke:#2563eb,color:#fff
    style Large fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## 🔔 Notification System

```mermaid
graph LR
    Source[Notification Sources] --> Types[Notification Types]

    Source --> S1[New Review]
    Source --> S2[AI Insight]
    Source --> S3[Achievement]
    Source --> S4[System Alert]
    Source --> S5[User Action]

    Types --> T1[Toast]
    Types --> T2[Badge]
    Types --> T3[Modal]
    Types --> T4[Sound]
    Types --> T5[Push]

    T1 --> Display[Display System]
    T2 --> Display
    T3 --> Display
    T4 --> Display
    T5 --> Display

    Display --> Priority{Priority Level}

    Priority -->|High| Immediate[Immediate Show]
    Priority -->|Medium| Queue[Add to Queue]
    Priority -->|Low| Passive[Passive Display]

    Immediate --> Action[Action Required]
    Queue --> Batch[Batch Display]
    Passive --> Indicator[Indicator Only]

    Action --> Response{User Response}
    Response -->|Act| Execute[Execute Action]
    Response -->|Dismiss| Store[Store in History]
    Response -->|Ignore| Remind[Set Reminder]

    style Source fill:#3b82f6,stroke:#2563eb,color:#fff
    style Priority fill:#f97316,stroke:#ea580c,color:#fff
    style Immediate fill:#ef4444,stroke:#dc2626,color:#fff
```

---

## 🎨 Animation Timeline

```mermaid
gantt
    title Page Load Animation Sequence
    dateFormat X
    axisFormat %L ms

    section Background
    Gradient Fade In        :a1, 0, 300
    Blobs Appear           :a2, 100, 400

    section Header
    Header Slide Down      :b1, 200, 300
    Avatar Pop In          :b2, 300, 200
    Actions Fade In        :b3, 400, 300

    section Hero
    Greeting Appear        :c1, 500, 400
    Progress Bar Fill      :c2, 600, 600
    Quick Stats Count Up   :c3, 700, 800

    section Quick Actions
    Action 1              :d1, 800, 100
    Action 2              :d2, 850, 100
    Action 3              :d3, 900, 100
    Action 4              :d4, 950, 100
    Action 5              :d5, 1000, 100
    Action 6              :d6, 1050, 100

    section Stats
    Stat Card 1           :e1, 1100, 200
    Stat Card 2           :e2, 1150, 200
    Stat Card 3           :e3, 1200, 200
    Stat Card 4           :e4, 1250, 200

    section Content
    AI Insights           :f1, 1300, 300
    Activity Feed         :f2, 1400, 300
    Recent Activity       :f3, 1500, 300
```

---

## 🧩 Component Dependencies

```mermaid
graph TD
    subgraph External["External Dependencies"]
        React[React 18]
        Next[Next.js 14]
        Framer[Framer Motion]
        Tailwind[Tailwind CSS]
        Shadcn[shadcn/ui]
    end

    subgraph UI["UI Components"]
        Button[Button]
        Card[Card]
        Badge[Badge]
        Avatar[Avatar]
        Modal[Modal]
    end

    subgraph Home["Home Components"]
        Header[SmartHeader]
        Hero[DashboardHero]
        Quick[QuickActions]
        Stats[StatsOverview]
        AI[AIInsights]
        Activity[ActivityFeed]
    end

    subgraph Utils["Utilities"]
        i18n[next-intl]
        DateFns[date-fns]
        Query[React Query]
        Zustand[Zustand]
    end

    React --> Next
    Next --> Home
    Framer --> Home
    Tailwind --> UI
    Shadcn --> UI
    UI --> Home
    Utils --> Home

    style External fill:#64748b,stroke:#475569,color:#fff
    style UI fill:#3b82f6,stroke:#2563eb,color:#fff
    style Home fill:#f97316,stroke:#ea580c,color:#fff
    style Utils fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## 🔐 Security & Privacy

```mermaid
graph TD
    User[User Request] --> Auth[Authentication Check]

    Auth -->|Not Authenticated| Redirect[Redirect to Login]
    Auth -->|Authenticated| RLS[Row Level Security]

    RLS --> Validate{Validate Access}

    Validate -->|Denied| Error[403 Error]
    Validate -->|Allowed| Data[Fetch User Data]

    Data --> Sanitize[Sanitize Data]
    Sanitize --> Filter[Filter Sensitive Info]
    Filter --> Render[Render Page]

    Render --> Client[Client Side]

    Client --> Actions{User Actions}

    Actions --> API[API Request]
    API --> JWT[Verify JWT Token]

    JWT -->|Invalid| Error
    JWT -->|Valid| RBAC[Check Permissions]

    RBAC -->|Denied| Error
    RBAC -->|Allowed| Execute[Execute Action]

    Execute --> Audit[Audit Log]
    Audit --> Response[Return Response]

    style Auth fill:#ef4444,stroke:#dc2626,color:#fff
    style RLS fill:#f97316,stroke:#ea580c,color:#fff
    style RBAC fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## 📊 Performance Optimization

```mermaid
graph LR
    Optimization[Performance Optimization] --> SSR[Server Side]
    Optimization --> CSR[Client Side]

    SSR --> S1[Server Components]
    SSR --> S2[Static Generation]
    SSR --> S3[Incremental Static Regeneration]
    SSR --> S4[Edge Functions]

    CSR --> C1[Code Splitting]
    CSR --> C2[Lazy Loading]
    CSR --> C3[Memoization]
    CSR --> C4[Virtual Scrolling]

    S1 --> Results[Performance Results]
    S2 --> Results
    S3 --> Results
    S4 --> Results
    C1 --> Results
    C2 --> Results
    C3 --> Results
    C4 --> Results

    Results --> M1[TTFB < 200ms]
    Results --> M2[FCP < 1s]
    Results --> M3[LCP < 2s]
    Results --> M4[CLS < 0.1]
    Results --> M5[FID < 100ms]

    style Optimization fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style SSR fill:#3b82f6,stroke:#2563eb,color:#fff
    style CSR fill:#f97316,stroke:#ea580c,color:#fff
    style Results fill:#10b981,stroke:#059669,color:#fff
```

---

## 🎯 Testing Strategy

```mermaid
graph TB
    Testing[Testing Strategy] --> Unit[Unit Tests]
    Testing --> Integration[Integration Tests]
    Testing --> E2E[E2E Tests]
    Testing --> Visual[Visual Tests]
    Testing --> Performance[Performance Tests]

    Unit --> U1[Component Tests]
    Unit --> U2[Utility Tests]
    Unit --> U3[Hook Tests]

    Integration --> I1[API Tests]
    Integration --> I2[State Tests]
    Integration --> I3[Database Tests]

    E2E --> E1[Critical Paths]
    E2E --> E2[User Flows]
    E2E --> E3[Regression Tests]

    Visual --> V1[Component Screenshots]
    Visual --> V2[Theme Tests]
    Visual --> V3[Responsive Tests]

    Performance --> P1[Load Time]
    Performance --> P2[Bundle Size]
    Performance --> P3[Animation FPS]

    U1 --> Coverage[Coverage Report]
    U2 --> Coverage
    U3 --> Coverage
    I1 --> Coverage
    I2 --> Coverage
    I3 --> Coverage

    E1 --> CI[CI/CD Pipeline]
    E2 --> CI
    E3 --> CI

    V1 --> Review[Visual Review]
    V2 --> Review
    V3 --> Review

    P1 --> Metrics[Performance Metrics]
    P2 --> Metrics
    P3 --> Metrics

    Coverage --> Report[Test Report]
    CI --> Report
    Review --> Report
    Metrics --> Report

    style Testing fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Unit fill:#3b82f6,stroke:#2563eb,color:#fff
    style E2E fill:#f97316,stroke:#ea580c,color:#fff
    style Report fill:#10b981,stroke:#059669,color:#fff
```

---

## 🚀 Deployment Pipeline

```mermaid
flowchart LR
    Dev[Development] --> PR[Pull Request]
    PR --> Review{Code Review}

    Review -->|Changes Requested| Dev
    Review -->|Approved| Tests[Run Tests]

    Tests --> Unit[Unit Tests]
    Tests --> E2E[E2E Tests]
    Tests --> Lint[Linting]

    Unit --> Results{All Pass?}
    E2E --> Results
    Lint --> Results

    Results -->|Failed| Fix[Fix Issues]
    Fix --> Dev

    Results -->|Passed| Build[Build App]

    Build --> Preview[Preview Deploy]
    Preview --> QA[QA Testing]

    QA -->|Issues Found| Dev
    QA -->|Approved| Staging[Deploy to Staging]

    Staging --> Smoke[Smoke Tests]
    Smoke --> Final{Final Check}

    Final -->|Not Ready| Dev
    Final -->|Ready| Production[Deploy to Production]

    Production --> Monitor[Monitor]
    Monitor --> Metrics[Collect Metrics]

    style Dev fill:#64748b,stroke:#475569,color:#fff
    style Production fill:#10b981,stroke:#059669,color:#fff
    style Tests fill:#3b82f6,stroke:#2563eb,color:#fff
    style Monitor fill:#f97316,stroke:#ea580c,color:#fff
```

---

**🎨 جميع الـ Diagrams جاهزة للمراجعة!**

يمكنك عرض هذه الـ diagrams في أي Markdown viewer يدعم Mermaid (مثل GitHub, GitLab, VS Code, أو Obsidian).
