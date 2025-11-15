# 📦 NNH-AI-Studio Project Structure

## 📁 Root Structure

```
NNH-AI-Studio/
├── 📂 app/                    # Next.js App Router
│   ├── (dashboard)/          # Dashboard routes
│   │   └── dashboard/        # Main dashboard page
│   ├── [locale]/             # Internationalized routes
│   │   ├── (auth)/           # Authentication pages
│   │   ├── (dashboard)/      # Dashboard pages
│   │   └── ...               # Other locale pages
│   └── api/                  # API routes
│       ├── gmb/              # GMB API
│       ├── reviews/          # Reviews API
│       ├── locations/        # Locations API
│       └── ...               # Other APIs
│
├── 📂 components/            # React components
│   ├── dashboard/           # Dashboard components (NEW!)
│   │   ├── stats-overview.tsx
│   │   ├── reviews-widget.tsx
│   │   ├── locations-widget.tsx
│   │   ├── quick-actions.tsx
│   │   ├── recent-activity.tsx
│   │   ├── dashboard-skeleton.tsx
│   │   ├── dashboard-client-wrapper.tsx
│   │   ├── dashboard-error-boundary-wrapper.tsx
│   │   ├── animated-wrapper.tsx
│   │   ├── theme-toggle.tsx
│   │   └── charts/          # Chart components (NEW!)
│   │       ├── reviews-trend-chart.tsx
│   │       ├── rating-distribution-chart.tsx
│   │       ├── response-rate-chart.tsx
│   │       ├── activity-heatmap.tsx
│   │       └── dashboard-charts.tsx
│   ├── ui/                  # shadcn/ui components
│   ├── gmb/                 # Google My Business components
│   ├── locations/           # Location components
│   ├── reviews/             # Review components
│   └── ...                  # Other components
│
├── 📂 lib/                   # Utility libraries
│   ├── supabase/            # Supabase client
│   │   ├── server.ts        # Server client
│   │   └── client.ts        # Client client
│   ├── utils/               # Utility functions
│   │   ├── pdf-export.ts    # PDF export (NEW!)
│   │   └── ...              # Other utilities
│   ├── types/               # TypeScript types
│   ├── services/            # Business logic
│   └── ...                  # Other utilities
│
├── 📂 hooks/                 # Custom React hooks
│   ├── use-dashboard.ts
│   ├── use-reviews.ts
│   └── ...
│
├── 📂 types/                 # TypeScript types
│   ├── dashboard.ts
│   └── features.ts
│
├── 📂 server/                # Server actions
│   └── actions/              # Server actions
│
├── 📂 tests/                 # Test files
│   ├── dashboard/
│   ├── e2e/
│   └── ...
│
├── 📂 supabase/              # Supabase config
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions
│
├── 📂 public/                # Static assets
│   └── locales/              # Translation files
│
└── 📂 docs/                  # Documentation

```

## 📊 Dashboard Components Structure

### Main Components

```
components/dashboard/
├── stats-overview.tsx              # 4 stat cards (Accounts, Locations, Rating, Response Rate)
├── reviews-widget.tsx              # Recent reviews list
├── locations-widget.tsx            # Active locations list
├── quick-actions.tsx               # Quick action buttons (Sync, Autopilot, Analytics, Reviews)
├── recent-activity.tsx             # Activity feed
├── dashboard-skeleton.tsx          # Loading skeletons
├── dashboard-client-wrapper.tsx    # Client wrapper with real-time updates
├── dashboard-error-boundary-wrapper.tsx # Error boundaries
├── animated-wrapper.tsx            # Framer Motion animations
├── theme-toggle.tsx                # Dark mode toggle
├── index.ts                        # Exports
└── charts/                         # Chart components (NEW!)
    ├── reviews-trend-chart.tsx     # Line chart (30 days)
    ├── rating-distribution-chart.tsx # Pie chart (1-5 stars)
    ├── response-rate-chart.tsx     # Area chart (weekly)
    ├── activity-heatmap.tsx        # Heatmap (24/7)
    ├── dashboard-charts.tsx        # Charts container
    └── index.ts                    # Chart exports
```

## 📄 Main Dashboard Page

```
app/(dashboard)/dashboard/
└── page.tsx                        # Main dashboard page (Server Component)
    ├── Authentication check
    ├── Data fetching (parallel)
    ├── DashboardClientWrapper
    ├── StatsOverview
    ├── QuickActions
    ├── ReviewsWidget
    ├── LocationsWidget
    ├── RecentActivity
    └── DashboardCharts (NEW!)
```

## 🗄️ Database Tables Used

```
gmb_accounts           # Google Business accounts
gmb_locations          # Business locations
gmb_reviews            # Customer reviews
gmb_posts              # Business posts
activity_logs          # User activities
v_dashboard_stats      # Dashboard statistics view
profiles               # User profiles
```

## 📦 Key Dependencies

```
Production:
├── next@14.2.33
├── react@18.3.1
├── @supabase/ssr
├── recharts@3.4.1          # Charts (NEW!)
├── framer-motion@12.23.24  # Animations (NEW!)
├── date-fns@4.1.0          # Date formatting (NEW!)
├── lucide-react@0.454.0    # Icons
├── next-themes@0.4.6       # Dark mode
└── jspdf@3.0.3             # PDF export (NEW!)

Development:
├── jest@30.2.0
├── @testing-library/react
├── playwright@1.56.1
└── typescript@5.9.3
```

## 🎯 Features

### Dashboard Features
- ✅ Stats Overview (4 cards)
- ✅ Quick Actions (4 buttons)
- ✅ Reviews Widget
- ✅ Locations Widget
- ✅ Recent Activity
- ✅ Charts Section (4 charts) (NEW!)
- ✅ Real-time Updates
- ✅ Dark Mode
- ✅ Animations
- ✅ PDF Export
- ✅ Error Boundaries
- ✅ Loading Skeletons

### Charts Features (NEW!)
- ✅ Reviews Trend Chart (30 days line chart)
- ✅ Rating Distribution (Pie chart)
- ✅ Response Rate (Area chart)
- ✅ Activity Heatmap (24/7 grid)

## 📝 Configuration Files

```
Root:
├── package.json            # Dependencies
├── pnpm-lock.yaml         # pnpm lockfile
├── tsconfig.json          # TypeScript config
├── next.config.mjs        # Next.js config
├── tailwind.config.ts     # Tailwind config
├── jest.config.mjs        # Jest config
└── playwright.config.ts   # Playwright config
```

## 📚 Documentation

```
docs/
├── DASHBOARD_COMPLETE.md          # Dashboard implementation summary
├── DASHBOARD_CHARTS_COMPLETE.md   # Charts implementation summary
├── BRANDING_USER_GUIDE.md
├── BRANDING_DEVELOPER_GUIDE.md
└── ...                            # Other documentation

components/dashboard/
├── README.md                      # Dashboard components docs
├── ENHANCEMENTS.md                # Enhancements documentation
└── charts/README.md               # Charts documentation
```

---

**Last Updated:** Dashboard implementation with charts complete ✅

