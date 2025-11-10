# White-Label Client Branding Feature

## Overview

This feature enables clients to fully customize the NNH AI Studio platform with their own brand identity, including logo, cover images, colors, and brand name. The implementation provides a seamless white-label experience while maintaining all platform functionality.

## Features

### 1. Branding Settings Page

Located at **Settings > Branding** (`/settings?tab=branding`), this page provides:

- **Brand Name**: Custom text to replace "NNH AI Studio" throughout the platform
- **Logo Upload**: Upload a square logo (max 2MB, PNG/JPG/SVG)
- **Cover Image Upload**: Upload a banner image (max 5MB, PNG/JPG, 16:9 recommended)
- **Primary Color**: Custom color picker for primary brand color (buttons, active states, etc.)
- **Secondary Color**: Custom color picker for secondary brand color (backgrounds, borders)

### 2. Database Structure

#### Table: `client_profiles`
```sql
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  brand_name TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#FFA500',
  secondary_color TEXT DEFAULT '#1A1A1A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Storage Structure

#### Bucket: `branding_assets`
- **Public Access**: Read-only for displaying images
- **User Isolation**: Files stored at `/{user_id}/logo.{ext}` and `/{user_id}/cover.{ext}`
- **Security**: RLS policies ensure users can only upload/modify their own assets

## Implementation Details

### Frontend Components

#### 1. BrandProfileContext (`contexts/BrandProfileContext.tsx`)
- Global React Context for brand profile data
- Provides `useBrandProfile()` hook
- Automatically fetches profile on mount
- Supports manual refresh via `refetchProfile()`

```typescript
const { profile, loading, refetchProfile } = useBrandProfile();
```

#### 2. DynamicThemeProvider (`components/theme/DynamicThemeProvider.tsx`)
- Applies CSS variables based on brand colors
- Listens for `brand-profile-updated` events
- Sets `--brand-primary` and `--brand-secondary` CSS variables

#### 3. BrandingTab (`components/settings/branding-tab.tsx`)
- Main settings UI component
- Handles file uploads to Supabase Storage
- Validates file types and sizes
- Saves changes to `client_profiles` table
- Dispatches `brand-profile-updated` event on save

#### 4. DashboardBanner (`components/dashboard/dashboard-banner.tsx`)
- Optional banner component
- Displays cover image when available
- Responsive with gradient overlay

### Sidebar Integration

The sidebar (`components/layout/sidebar.tsx`) now displays:
- Custom logo if `logo_url` is set
- Brand name if `brand_name` is set
- Falls back to default "NNH AI Studio" branding

### CSS Variables

Two new CSS variables are available globally:
- `--brand-primary`: Primary brand color (default: #FFA500)
- `--brand-secondary`: Secondary brand color (default: #1A1A1A)

These can be used in any component:
```css
.custom-button {
  background-color: var(--brand-primary);
}
```

## Usage Guide

### For End Users

1. Navigate to **Settings > Branding**
2. Fill in your brand information:
   - Enter your brand name
   - Upload your logo (square format recommended)
   - Upload a cover image (16:9 aspect ratio recommended)
   - Select your primary brand color
   - Select your secondary brand color
3. Click "Save Changes"
4. The platform will immediately reflect your branding

### For Developers

#### Adding Branding to a New Component

```tsx
import { useBrandProfile } from '@/contexts/BrandProfileContext';

function MyComponent() {
  const { profile, loading } = useBrandProfile();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{profile?.brand_name || 'Default Name'}</h1>
      {profile?.logo_url && (
        <img src={profile.logo_url} alt="Logo" />
      )}
    </div>
  );
}
```

#### Using Brand Colors

```tsx
// In a component
<button style={{ backgroundColor: 'var(--brand-primary)' }}>
  Click me
</button>

// Or with Tailwind (if needed)
<button className="bg-[var(--brand-primary)]">
  Click me
</button>
```

## Security Considerations

### Row Level Security (RLS)

All Supabase policies ensure:
1. Users can only view/edit their own profile
2. Users can only upload to their own storage folder
3. Public can view uploaded assets (for display purposes)

### File Upload Validation

- **File Types**: Only image files (PNG, JPG, SVG, etc.)
- **Size Limits**: 
  - Logo: 2MB max
  - Cover: 5MB max
- **Path Validation**: Files always stored in user-specific folders

### Data Sanitization

- All user inputs are validated
- File names are normalized
- Color values are validated (hex format)

## Database Migrations

Two migrations were created:

1. **`20251110_create_client_profiles.sql`**: Creates the table and RLS policies
2. **`20251110_create_branding_storage.sql`**: Creates the storage bucket and policies

To apply migrations (if running locally with Supabase CLI):
```bash
supabase db push
```

## Testing

### Manual Testing Checklist

- [ ] Upload logo and verify it appears in sidebar
- [ ] Upload cover image and verify it appears on dashboard
- [ ] Change colors and verify they apply throughout the app
- [ ] Change brand name and verify it replaces default name
- [ ] Test with no profile (should show default branding)
- [ ] Test file size validation (try uploading >2MB logo)
- [ ] Test file type validation (try uploading non-image)
- [ ] Test saving and refreshing page (persistence)
- [ ] Test on mobile devices
- [ ] Test deleting and re-uploading images

### Automated Testing

Security scan completed with CodeQL: ✅ No vulnerabilities found

Build test completed: ✅ No TypeScript errors

Lint test completed: ✅ No linting errors in new code

## Future Enhancements

Potential future improvements:
1. More color customization options (accent colors, button variants)
2. Font customization
3. Custom favicon upload
4. Email template branding
5. PDF report branding
6. Custom domain support
7. Branding preview before saving
8. Undo/Reset to defaults functionality

## Troubleshooting

### Images Not Showing

1. Check Supabase storage bucket is public
2. Verify RLS policies are correctly applied
3. Check browser console for CORS errors
4. Ensure image URLs are valid and accessible

### Colors Not Applying

1. Check CSS variables are being set (inspect document.documentElement.style)
2. Verify DynamicThemeProvider is wrapping the app
3. Check for CSS specificity conflicts

### Profile Not Loading

1. Verify user is authenticated
2. Check `client_profiles` table exists in database
3. Check RLS policies allow user to read their profile
4. Verify BrandProfileProvider is at the correct level in component tree

## Support

For issues or questions:
- Create an issue in the GitHub repository
- Contact: info@nnh.ae
- Documentation: [Project README](../README.md)

---

**Implementation Date**: November 10, 2025
**Author**: NNH AI Studio Development Team
**Version**: 1.0.0
