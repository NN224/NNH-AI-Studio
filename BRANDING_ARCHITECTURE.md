# White-Label Branding - Implementation Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WHITE-LABEL BRANDING SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              1. USER INTERFACE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Settings Page (/settings?tab=branding)                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ BrandingTab Component                                               │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │ Brand Name   │  │ Logo Upload  │  │ Cover Upload │             │    │
│  │  │ Text Input   │  │ + Preview    │  │ + Preview    │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │ Primary      │  │ Secondary    │  │ Save Changes │             │    │
│  │  │ Color Picker │  │ Color Picker │  │ Button       │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  │                                                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           2. DATA PERSISTENCE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Supabase Client                                                             │
│  ┌────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Database: client_profiles      │  │ Storage: branding_assets         │  │
│  │                                 │  │                                   │  │
│  │ - id (UUID)                     │  │ /{user_id}/                      │  │
│  │ - user_id (UUID)                │  │   ├── logo.png                   │  │
│  │ - brand_name (TEXT)             │  │   └── cover.jpg                  │  │
│  │ - logo_url (TEXT)               │  │                                   │  │
│  │ - cover_image_url (TEXT)        │  │ Public read, auth write          │  │
│  │ - primary_color (TEXT)          │  │                                   │  │
│  │ - secondary_color (TEXT)        │  │                                   │  │
│  │ - created_at (TIMESTAMP)        │  │                                   │  │
│  │ - updated_at (TIMESTAMP)        │  │                                   │  │
│  │                                 │  │                                   │  │
│  │ RLS: User-scoped access         │  │ RLS: User-scoped access          │  │
│  └────────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3. STATE MANAGEMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BrandProfileContext                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  • Fetches profile from database on mount                           │    │
│  │  • Provides profile data to all components                          │    │
│  │  • Exposes useBrandProfile() hook                                   │    │
│  │  • Listens for 'brand-profile-updated' events                       │    │
│  │  • Handles loading and error states                                 │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────┐      │    │
│  │  │ Exported Hook: useBrandProfile()                          │      │    │
│  │  │                                                            │      │    │
│  │  │ Returns:                                                   │      │    │
│  │  │   - profile: ClientProfile | null                         │      │    │
│  │  │   - loading: boolean                                      │      │    │
│  │  │   - refetchProfile: () => Promise<void>                   │      │    │
│  │  └──────────────────────────────────────────────────────────┘      │    │
│  │                                                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         4. THEME PROVIDER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DynamicThemeProvider                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  1. Gets profile from useBrandProfile()                             │    │
│  │  2. Converts hex colors to RGB                                      │    │
│  │  3. Sets CSS variables on document root:                            │    │
│  │     • --brand-primary: #FFA500                                      │    │
│  │     • --brand-secondary: #1A1A1A                                    │    │
│  │     • --brand-primary-rgb: 255 165 0                                │    │
│  │     • --brand-secondary-rgb: 26 26 26                               │    │
│  │  4. Provides fallback colors                                        │    │
│  │  5. Updates on profile change                                       │    │
│  │                                                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        5. CSS STYLING LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CSS Variables & Utility Classes                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  Variables:                       Utility Classes:                  │    │
│  │  • var(--brand-primary)           • .bg-brand-primary               │    │
│  │  • var(--brand-secondary)         • .text-brand-primary             │    │
│  │  • var(--brand-primary-rgb)       • .border-brand-primary           │    │
│  │  • var(--brand-secondary-rgb)     • .bg-brand-secondary             │    │
│  │                                   • .text-brand-secondary           │    │
│  │                                   • .border-brand-secondary         │    │
│  │                                                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        6. UI COMPONENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│  │   Sidebar         │  │   Dashboard       │  │   Buttons         │      │
│  │                   │  │                   │  │                   │      │
│  │ • Logo display    │  │ • Cover banner    │  │ • Primary color   │      │
│  │ • Brand name      │  │ • Welcome msg     │  │ • Hover states    │      │
│  │ • Active states   │  │ • Stats cards     │  │ • Focus states    │      │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘      │
│                                                                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│  │   Links           │  │   Active Items    │  │   Headers         │      │
│  │                   │  │                   │  │                   │      │
│  │ • Primary color   │  │ • Primary bg      │  │ • Brand name      │      │
│  │ • Underline       │  │ • Highlight       │  │ • Logo display    │      │
│  │ • Hover effects   │  │ • Selection       │  │ • Colors          │      │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Navigate to Settings → Branding
     ▼
┌─────────────────┐
│ BrandingTab     │
│ Component       │
└────┬────────────┘
     │ 2. Upload images & set colors
     ▼
┌─────────────────┐
│ File Upload     │
│ + Validation    │
└────┬────────────┘
     │ 3. Upload to Storage
     ▼
┌─────────────────┐
│ Supabase        │
│ Storage         │
└────┬────────────┘
     │ 4. Get public URL
     ▼
┌─────────────────┐
│ Save to DB      │
│ (upsert)        │
└────┬────────────┘
     │ 5. Dispatch event
     ▼
┌─────────────────┐
│ brand-profile-  │
│ updated         │
└────┬────────────┘
     │ 6. Event listener
     ▼
┌─────────────────┐
│ BrandProfile    │
│ Context         │
└────┬────────────┘
     │ 7. Refetch profile
     ▼
┌─────────────────┐
│ Dynamic         │
│ ThemeProvider   │
└────┬────────────┘
     │ 8. Update CSS variables
     ▼
┌─────────────────┐
│ document.root   │
│ .style          │
└────┬────────────┘
     │ 9. Apply to components
     ▼
┌─────────────────┐
│ UI Updates      │
│ (no reload!)    │
└─────────────────┘
```

## Component Hierarchy

```
App (root)
│
├── [locale]/layout.tsx
│   └── BrandProfileProvider ◄─── Global state wrapper
│       └── DynamicThemeProvider ◄─── Theme application
│
├── (dashboard)/layout.tsx
│   ├── Sidebar ◄─── Uses useBrandProfile()
│   │   ├── Logo display (profile.logo_url)
│   │   └── Brand name (profile.brand_name)
│   │
│   └── Main Content
│       └── Dashboard page
│           └── DashboardBanner ◄─── Uses useBrandProfile()
│               └── Cover image (profile.cover_image_url)
│
└── /settings page
    └── GMBSettings
        └── BrandingTab ◄─── Uses useBrandProfile()
            ├── Form inputs
            ├── Image uploaders
            ├── Color pickers
            └── Save button
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Authentication                                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • Supabase session-based auth                               │    │
│  │ • All operations require valid session                      │    │
│  │ • Automatic token refresh                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Layer 2: Authorization (RLS)                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Database (client_profiles):                                 │    │
│  │ • SELECT: auth.uid() = user_id                              │    │
│  │ • INSERT: auth.uid() = user_id                              │    │
│  │ • UPDATE: auth.uid() = user_id                              │    │
│  │                                                              │    │
│  │ Storage (branding_assets):                                  │    │
│  │ • SELECT: public (read-only)                                │    │
│  │ • INSERT: folder matches user_id                            │    │
│  │ • UPDATE: folder matches user_id                            │    │
│  │ • DELETE: folder matches user_id                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Layer 3: Input Validation                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Client-side:                                                │    │
│  │ • File type validation (image/*)                            │    │
│  │ • File size limits (2MB logo, 5MB cover)                    │    │
│  │ • Color format validation (hex)                             │    │
│  │                                                              │    │
│  │ Server-side:                                                │    │
│  │ • Supabase validates uploads                                │    │
│  │ • Type checking on database                                 │    │
│  │ • Size limits enforced                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Layer 4: XSS Protection                                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • React auto-escapes all user input                         │    │
│  │ • No dangerouslySetInnerHTML used                           │    │
│  │ • Image URLs validated by Supabase                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE PROFILE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Initial Page Load                                                   │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • Context fetch: ~100-200ms (async, non-blocking)           │    │
│  │ • CSS variables: Instant (no layout shift)                  │    │
│  │ • Logo load: Optimized by Next.js Image                     │    │
│  │ • Cover load: Lazy loaded, optimized                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Brand Update                                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • Database write: ~50-100ms                                 │    │
│  │ • Image upload: Depends on size (1-5 seconds typical)       │    │
│  │ • Context refetch: ~50-100ms                                │    │
│  │ • CSS update: Instant (no re-render)                        │    │
│  │ • UI update: < 100ms                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Optimizations                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✓ Context memoization (prevents unnecessary re-renders)     │    │
│  │ ✓ CSS variables (no React re-renders on color change)       │    │
│  │ ✓ Next.js Image (automatic optimization & lazy loading)     │    │
│  │ ✓ CDN caching (Supabase Storage with CDN)                   │    │
│  │ ✓ Event-based updates (only when needed)                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Legend**:
- ◄─── Uses hook/context
- ▼ Data flow direction
- • Bullet points for features
- ┌─┐ Box borders for containers

**Document Version**: 1.0.0  
**Last Updated**: November 10, 2025
