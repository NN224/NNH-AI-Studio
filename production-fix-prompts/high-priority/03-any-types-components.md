# 🔴 High Priority: `any` Types in Components

> **Priority:** P1 - Should Fix Soon
> **Count:** ~200 instances
> **Impact:** Type safety, component reusability, props validation

---

## Overview

Components with `any` types can:

- Accept invalid props without TypeScript catching it
- Break at runtime with confusing errors
- Make components harder to reuse

---

## 📊 Files with Most `any` Types (Components)

| File                                                      | Count | Priority  |
| --------------------------------------------------------- | ----- | --------- |
| `components/locations/edit-location-dialog.tsx`           | 13    | 🔴 High   |
| `components/locations/horizontal-location-card.tsx`       | 12    | 🔴 High   |
| `components/locations/locations-map-tab.tsx`              | 9     | 🔴 High   |
| `components/features/bulk-update-dialog.tsx`              | 8     | 🟠 Medium |
| `components/analytics/google-analytics.tsx`               | 8     | 🟠 Medium |
| `components/questions/question-card.tsx`                  | 7     | 🟠 Medium |
| `components/features/change-history-panel.tsx`            | 7     | 🟠 Medium |
| `components/locations/location-qa-section.tsx`            | 5     | 🟡 Low    |
| `components/locations/location-media-section.tsx`         | 5     | 🟡 Low    |
| `components/locations/search-google-locations-dialog.tsx` | 4     | 🟡 Low    |
| `components/locations/location-filters-panel.tsx`         | 4     | 🟡 Low    |
| `components/command-center/command-center-chat.tsx`       | 4     | 🟡 Low    |
| `components/analytics/response-time-chart.tsx`            | 4     | 🟡 Low    |

---

## 1. `components/locations/edit-location-dialog.tsx` (13 any) 🔴

### Common Issues

#### Issue 1: Untyped Props

```typescript
// ❌ BEFORE
interface EditLocationDialogProps {
  location: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

// ✅ AFTER
import type { GMBLocation } from "@/lib/types/database";

interface LocationUpdateData {
  title?: string;
  description?: string;
  phone?: string;
  website?: string;
  address?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
    regionCode: string;
  };
  categories?: string[];
  regularHours?: {
    periods: Array<{
      openDay: string;
      openTime: string;
      closeDay: string;
      closeTime: string;
    }>;
  };
}

interface EditLocationDialogProps {
  location: GMBLocation;
  onSave: (data: LocationUpdateData) => Promise<void>;
  onClose: () => void;
}
```

#### Issue 2: Untyped Form State

```typescript
// ❌ BEFORE
const [formData, setFormData] = useState<any>({});

// ✅ AFTER
interface FormState {
  title: string;
  description: string;
  phone: string;
  website: string;
  categories: string[];
  hours: BusinessHours;
}

const [formData, setFormData] = useState<FormState>({
  title: location.title || "",
  description: location.description || "",
  phone: location.phone || "",
  website: location.website || "",
  categories: location.categories || [],
  hours: location.regularHours || { periods: [] },
});
```

#### Issue 3: Untyped Event Handlers

```typescript
// ❌ BEFORE
const handleChange = (e: any) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

// ✅ AFTER
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};
```

---

## 2. `components/locations/horizontal-location-card.tsx` (12 any)

### Typical Fixes

```typescript
// ❌ BEFORE
interface HorizontalLocationCardProps {
  location: any;
  onSelect?: (location: any) => void;
  actions?: any[];
}

// ✅ AFTER
import type { GMBLocation } from "@/lib/types/database";

interface LocationAction {
  icon: React.ReactNode;
  label: string;
  onClick: (locationId: string) => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface HorizontalLocationCardProps {
  location: GMBLocation;
  onSelect?: (location: GMBLocation) => void;
  actions?: LocationAction[];
  isSelected?: boolean;
  showMetrics?: boolean;
}
```

---

## 3. `components/locations/locations-map-tab.tsx` (9 any)

### Map Component Types

```typescript
// ❌ BEFORE
const markers: any[] = locations.map((loc: any) => ({
  position: { lat: loc.lat, lng: loc.lng },
  data: loc,
}));

// ✅ AFTER
interface MapMarker {
  position: {
    lat: number;
    lng: number;
  };
  data: GMBLocation;
  infoWindow?: {
    title: string;
    content: string;
  };
}

const markers: MapMarker[] = locations
  .filter(
    (loc): loc is GMBLocation & { lat: number; lng: number } =>
      loc.lat !== null && loc.lng !== null,
  )
  .map((loc) => ({
    position: { lat: loc.lat, lng: loc.lng },
    data: loc,
    infoWindow: {
      title: loc.title || loc.name,
      content: loc.address || "",
    },
  }));
```

---

## 4. `components/features/bulk-update-dialog.tsx` (8 any)

### Bulk Operation Types

```typescript
// ❌ BEFORE
interface BulkUpdateDialogProps {
  locations: any[];
  onUpdate: (updates: any) => void;
}

// ✅ AFTER
import type { GMBLocation } from "@/lib/types/database";

interface BulkUpdateField {
  field: "description" | "phone" | "website" | "categories" | "hours";
  value: string | string[] | BusinessHours;
}

interface BulkUpdateDialogProps {
  locations: GMBLocation[];
  onUpdate: (updates: BulkUpdateField[]) => Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }>;
  onClose: () => void;
}
```

---

## 5. `components/analytics/google-analytics.tsx` (8 any)

### Analytics Data Types

```typescript
// ❌ BEFORE
interface AnalyticsData {
  metrics: any[];
  dimensions: any[];
}

// ✅ AFTER
interface MetricValue {
  name: string;
  value: number;
  change?: number;
  changePercent?: number;
}

interface DimensionValue {
  name: string;
  values: Array<{
    label: string;
    value: number;
    percent?: number;
  }>;
}

interface AnalyticsData {
  metrics: MetricValue[];
  dimensions: DimensionValue[];
  dateRange: {
    start: string;
    end: string;
  };
  comparisonDateRange?: {
    start: string;
    end: string;
  };
}
```

---

## 🛠️ Common Patterns & Solutions

### Pattern 1: Generic List Component

```typescript
// ❌ BEFORE
interface ListProps {
  items: any[];
  renderItem: (item: any) => React.ReactNode;
}

// ✅ AFTER
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
```

### Pattern 2: Form Component with Validation

```typescript
// ❌ BEFORE
interface FormProps {
  initialValues: any;
  onSubmit: (values: any) => void;
}

// ✅ AFTER
import { z } from "zod";

const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface FormProps {
  initialValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
}
```

### Pattern 3: Event Handlers

```typescript
// ❌ BEFORE
const handleClick = (e: any) => { ... };
const handleChange = (e: any) => { ... };
const handleSubmit = (e: any) => { ... };

// ✅ AFTER
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { ... };
```

### Pattern 4: Children Props

```typescript
// ❌ BEFORE
interface WrapperProps {
  children: any;
}

// ✅ AFTER
interface WrapperProps {
  children: React.ReactNode;
}
```

---

## 📋 Checklist by Component Category

### Location Components

- [ ] `edit-location-dialog.tsx` - Typed props and form state
- [ ] `horizontal-location-card.tsx` - Typed location and actions
- [ ] `locations-map-tab.tsx` - Typed map markers
- [ ] `location-qa-section.tsx` - Typed Q&A data
- [ ] `location-media-section.tsx` - Typed media data
- [ ] `search-google-locations-dialog.tsx` - Typed search results
- [ ] `location-filters-panel.tsx` - Typed filter state

### Feature Components

- [ ] `bulk-update-dialog.tsx` - Typed bulk operations
- [ ] `change-history-panel.tsx` - Typed history entries

### Analytics Components

- [ ] `google-analytics.tsx` - Typed analytics data
- [ ] `response-time-chart.tsx` - Typed chart data

### Other Components

- [ ] `question-card.tsx` - Typed question data
- [ ] `command-center-chat.tsx` - Typed chat messages

---

## ✅ Acceptance Criteria

- [ ] All component props are typed
- [ ] All useState hooks have type parameters
- [ ] All event handlers have proper event types
- [ ] No `any` in component files
- [ ] Components are properly documented with JSDoc
- [ ] Build passes without errors

---

_Estimated Fix Time: 4-6 hours_
