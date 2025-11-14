# Business Profile Database Optimization Plan

## Current Situation

### Data Storage
- **Features/Attributes**: Stored in `gmb_locations.metadata.features` (JSONB)
- **Categories**: Stored in `gmb_locations.additional_categories` (array) and `metadata.additionalCategories`
- **Special Links**: Stored in `gmb_locations.menu_url`, `booking_url`, etc. AND `metadata.specialLinks`
- **From the Business**: Stored in `gmb_locations.from_the_business` (array) and `metadata.from_the_business`

### Existing Tables
- `gmb_attributes` table exists but is NOT used by Business Profile tab
- Used only for syncing attributes from Google API

## Problems with Current Approach

1. **Query Performance**: Can't efficiently query locations by feature/category
2. **Data Integrity**: No foreign key constraints
3. **Analytics**: Hard to generate statistics (e.g., "how many locations have wheelchair access?")
4. **Data Duplication**: Data stored in both columns and metadata
5. **Scalability**: JSONB queries become slow with large datasets

## Proposed Solutions

### Option 1: Use Existing `gmb_attributes` Table (Recommended)

**Pros:**
- Table already exists with proper structure
- Has RLS policies
- Has indexes
- Can store all features/attributes

**Cons:**
- Need to migrate existing data
- Need to update Business Profile tab to use it

**Implementation:**
- Store features in `gmb_attributes` table
- Use `attribute_name` for feature key (e.g., "amenities/wheelchair_accessible")
- Use `attribute_value` for feature value (JSONB array)
- Use `group_name` for category (e.g., "amenities", "payment_methods")

### Option 2: Create New Dedicated Tables

#### Table 1: `gmb_location_categories`
```sql
CREATE TABLE gmb_location_categories (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, category_name)
);
```

#### Table 2: `gmb_location_features`
```sql
CREATE TABLE gmb_location_features (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_category TEXT NOT NULL, -- 'amenities', 'payment_methods', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, feature_key)
);
```

#### Table 3: `gmb_location_special_links`
```sql
CREATE TABLE gmb_location_special_links (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL, -- 'menu', 'booking', 'order', 'appointment'
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, link_type)
);
```

#### Table 4: `gmb_location_business_info`
```sql
CREATE TABLE gmb_location_business_info (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  info_type TEXT NOT NULL, -- 'black_owned', 'women_led', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, info_type)
);
```

### Option 3: Hybrid Approach (Best for Migration)

1. **Keep basic columns** in `gmb_locations`:
   - `description`, `phone`, `website`, `category`
   - `menu_url`, `booking_url`, `order_url`, `appointment_url`

2. **Use `gmb_attributes`** for features:
   - Migrate features from `metadata.features` to `gmb_attributes`

3. **Create `gmb_location_categories`** for additional categories:
   - Better for many-to-many relationship
   - Easier to query and filter

4. **Keep `from_the_business`** as array column:
   - Simple boolean flags
   - Not frequently queried

## Recommendation

**Use Option 3 (Hybrid Approach)** because:
- ✅ Minimal disruption to existing code
- ✅ Better query performance for frequently accessed data
- ✅ Maintains backward compatibility
- ✅ Gradual migration possible

## Migration Steps

1. Create `gmb_location_categories` table
2. Migrate `additional_categories` to new table
3. Migrate features from `metadata.features` to `gmb_attributes`
4. Update Business Profile API to read/write from new tables
5. Keep metadata as fallback for old data
6. Eventually deprecate metadata storage

## Benefits After Migration

- ✅ Fast queries: `SELECT * FROM locations WHERE id IN (SELECT location_id FROM gmb_location_features WHERE feature_key = 'wheelchair_accessible')`
- ✅ Better analytics: Easy to count locations by feature/category
- ✅ Data integrity: Foreign key constraints
- ✅ Scalability: Proper indexes for large datasets
- ✅ Maintainability: Clear data structure

