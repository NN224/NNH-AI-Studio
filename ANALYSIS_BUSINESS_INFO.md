# Business Info Page - Full Analysis

## 1. What does the page need?

### Frontend Requirements (Business Info Page)
From `app/[locale]/(dashboard)/features/page.tsx` and `app/api/features/profile/[locationId]/route.ts`:

**Basic Info:**
- `location_name` - Location name
- `description` - Business description
- `phone` - Phone number
- `website` - Website URL
- `category` - Primary category (e.g., "Bar", "Night Club")
- `rating` - Average rating (e.g., 4.5)
- `review_count` - Number of reviews

**Media:**
- `logo_url` - Logo image URL
- `cover_photo_url` - Cover photo URL

**Action Links (from Place Actions API):**
- `menu_url` - Menu link
- `booking_url` - Booking/Reservation link
- `order_url` - Order link
- `appointment_url` - Appointment link

**Categories & Features:**
- `additional_categories` - Array of additional categories
- `from_the_business` - Array of attributes/features
- Features stored in `metadata.attributes` (from Attributes API)

**Business Hours:**
- `business_hours` - JSONB - Regular business hours
- `metadata.regularHours` - From GMB API
- `metadata.moreHours` - Special hours (breakfast, lunch, dinner, etc.)

**Service Items:**
- `metadata.serviceItems` - Services offered with pricing

**Additional Settings:**
- `opening_date` - When business opened
- `service_area_enabled` - Boolean - Does business serve a service area?
- `profile_completeness` - Percentage of profile completion

**Metadata (CRITICAL):**
- `metadata` - JSONB - Full GMB API response including:
  - `metadata.attributes` - From Attributes API
  - `metadata.placeActionLinks` - From Place Actions API
  - `metadata.regularHours` - Business hours
  - `metadata.moreHours` - Additional hours
  - `metadata.serviceItems` - Services list
  - Full location object from GMB

---

## 2. Current Database Schema

### Table: `gmb_locations`

**Query to check actual schema:**
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_locations'
ORDER BY ordinal_position;
```

**Query to check constraints:**
```sql
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'gmb_locations'::regclass
ORDER BY conname;
```

---

## 3. Google My Business APIs Used

### A. Business Information API
**Endpoint:** `GET /v1/{parent=accounts/*/locations/*}`
**File:** `google-api-docs/mybusinessbusinessinformation/v1/mybusinessbusinessinformation-api.json`

**Returns:**
- `name` - Resource name (e.g., "locations/123456")
- `title` - Business name
- `storefrontAddress` - Address object
- `phoneNumbers.primaryPhone` - Phone
- `websiteUri` - Website
- `categories.primaryCategory` - Primary category
- `categories.additionalCategories` - Additional categories array
- `profile.description` - Business description (ONLY field in profile!)
- `regularHours` - Business hours object
- `moreHours` - Additional hours array
- `serviceItems` - Services array
- `openInfo` - Opening date info
- `metadata` - Additional metadata

**Important:** `profile` object ONLY contains `description`!

### B. Attributes API
**Endpoint:** `GET /v1/{parent=accounts/*/locations/*}/attributes`
**File:** `google-api-docs/mybusinessbusinessinformation/v1/` (part of Business Information)

**Returns:**
```json
{
  "attributes": [
    {
      "name": "attribute_id",
      "values": ["value1", "value2"],
      "uriValues": [{"uri": "https://..."}]
    }
  ]
}
```

**Usage:** Store in `metadata.attributes`

### C. Place Actions API
**Endpoint:** `GET /v1/{parent=accounts/*/locations/*}/placeActionLinks`
**File:** `google-api-docs/mybusinessplaceactions/v1/mybusinessplaceactions-api.json`

**Returns:**
```json
{
  "placeActionLinks": [
    {
      "placeActionType": "ORDER",
      "uri": "https://order.example.com"
    }
  ]
}
```

**Types:**
- `ORDER` - Order link
- `MENU` or `FOOD_MENU` - Menu link
- `BOOK` or `APPOINTMENT` - Booking link

**Usage:** Store in `metadata.placeActionLinks`

---

## 4. Data Flow

### Sync Process (app/api/gmb/sync/route.ts):

1. **Fetch Locations:**
   ```
   GET /v1/accounts/{accountId}/locations
   readMask: name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels
   ```

2. **For Each Location:**
   - Fetch Attributes: `GET /v1/{location}/attributes`
   - Fetch Place Actions: `GET /v1/{location}/placeActionLinks`
   - Fetch Media: `GET /v4/{location}/media` (for logo/cover)

3. **Build Enhanced Metadata:**
   ```javascript
   const enhancedMetadata = {
     ...location,                    // Full GMB location object
     attributes: fetchedAttributes,  // From Attributes API
     placeActionLinks: placeActionLinks, // From Place Actions API
     regularHours: location.regularHours,
     moreHours: location.moreHours,
     serviceItems: location.serviceItems
   }
   ```

4. **Save to Database:**
   ```javascript
   {
     location_name: location.title,
     description: location.profile.description,
     phone: location.phoneNumbers.primaryPhone,
     website: location.websiteUri,
     category: location.categories.primaryCategory.displayName,
     logo_url: logoUrl,
     cover_photo_url: coverUrl,
     metadata: enhancedMetadata, // ← ALL data goes here!
     // ... other fields
   }
   ```

### Read Process (app/api/features/profile/[locationId]/route.ts):

1. **Query Database:**
   ```javascript
   SELECT * FROM gmb_locations WHERE id = ? AND user_id = ?
   ```

2. **Extract Data from metadata:**
   - Attributes: `metadata.attributes` → extract to `features` and `fromTheBusiness`
   - Place Actions: `metadata.placeActionLinks` → extract to `specialLinks`
   - Hours: `metadata.regularHours`, `metadata.moreHours`
   - Services: `metadata.serviceItems`

---

## 5. Current Issues

### Issue 1: Status Constraint Violation ✅ FIXED
**Error:** `violates check constraint "gmb_locations_status_check"`

**Cause:** GMB returns status like "OPEN", but database expects specific values.

**Solution:** Set `status = NULL` temporarily

### Issue 2: Attributes Not Saved ⚠️ INVESTIGATING
**Symptom:** 
- Logs show: `✅ Fetched 50 attributes`
- But database has: `metadata.attributes = null`

**Possible Causes:**
1. Upsert fails due to constraint → attributes never saved
2. Metadata not being passed correctly in upsert
3. JSONB field not accepting the data structure

**Next Step:** Fix status constraint, then verify attributes are saved

---

## 6. Action Plan

### Step 1: Fix Database Constraints ✅
```sql
-- Check current constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'gmb_locations'::regclass;

-- Fix status constraint
ALTER TABLE gmb_locations DROP CONSTRAINT IF EXISTS gmb_locations_status_check;
ALTER TABLE gmb_locations ADD CONSTRAINT gmb_locations_status_check 
  CHECK (status IS NULL OR status IN ('active', 'inactive', 'pending', 'closed'));
```

### Step 2: Verify Schema Has All Required Columns
```sql
-- Must have these columns:
- logo_url TEXT
- cover_photo_url TEXT
- menu_url TEXT
- booking_url TEXT
- order_url TEXT
- appointment_url TEXT
- from_the_business TEXT[]
- additional_categories TEXT[]
- business_hours JSONB
- metadata JSONB (CRITICAL!)
- opening_date DATE
- service_area_enabled BOOLEAN
```

### Step 3: Test Sync Again
After fixing constraints:
1. Import from GMB
2. Verify no errors in logs
3. Check `metadata.attributes` is populated
4. Check `metadata.placeActionLinks` is populated

### Step 4: Fix Frontend Data Extraction
Ensure `normalizeBusinessProfile()` correctly extracts:
- `metadata.attributes` → `features` + `fromTheBusiness`
- `metadata.placeActionLinks` → `specialLinks`
- `metadata.regularHours` → `regularHours`
- `metadata.moreHours` → `moreHours`
- `metadata.serviceItems` → `serviceItems`

---

## 7. Verification Queries

### After successful sync:
```sql
-- 1. Check if location updated
SELECT location_name, updated_at, status
FROM gmb_locations
ORDER BY updated_at DESC
LIMIT 1;

-- 2. Check if attributes exist
SELECT 
  location_name,
  jsonb_typeof(metadata->'attributes') as attr_type,
  jsonb_array_length(metadata->'attributes') as attr_count,
  jsonb_typeof(metadata->'placeActionLinks') as actions_type
FROM gmb_locations
LIMIT 1;

-- 3. Check metadata keys
SELECT jsonb_object_keys(metadata) as key
FROM gmb_locations
LIMIT 1;

-- 4. Sample attributes
SELECT metadata->'attributes'->0 as first_attribute
FROM gmb_locations
WHERE metadata->'attributes' IS NOT NULL
LIMIT 1;
```

---

## 8. Expected Final State

After everything works:

```json
{
  "location_name": "XO Club Dubai",
  "description": "...",
  "logo_url": "https://...",
  "cover_photo_url": "https://...",
  "menu_url": "https://...",
  "booking_url": "https://...",
  "metadata": {
    "attributes": [
      {"name": "wifi", "values": ["free_wifi"]},
      {"name": "payment", "values": ["credit_cards", "cash"]}
    ],
    "placeActionLinks": [
      {"placeActionType": "ORDER", "uri": "https://..."}
    ],
    "regularHours": {
      "monday": {"open": "09:00", "close": "17:00"}
    },
    "moreHours": [...],
    "serviceItems": [...]
  }
}
```

Frontend extracts:
- `features.amenities` = ["wifi"]
- `features.payment_methods` = ["credit_cards", "cash"]
- `specialLinks.order` = "https://..."
- `regularHours` = displayed in BusinessHoursDisplay component

