# Dashboard Charts Documentation

## Overview

مجموعة شاملة من الرسوم البيانية التفاعلية لعرض تحليلات أداء Google My Business باستخدام Recharts.

---

## الرسوم البيانية المتاحة

### 1. Reviews Trend Chart
**الملف:** `reviews-trend-chart.tsx`

#### الوصف
رسم بياني خطي يعرض اتجاه المراجعات خلال آخر 30 يومًا مع متوسط التقييم.

#### الميزات
- عرض عدد المراجعات يومياً
- متوسط التقييم لكل يوم
- حساب الاتجاه (Trend) مقارنة بالأسبوع السابق
- مؤشرات بصرية للاتجاه (↑↓)
- إحصائيات ملخصة

#### الاستخدام

```tsx
import { ReviewsTrendChart } from '@/components/dashboard/charts'

<ReviewsTrendChart reviews={reviews} />
```

#### Props

```typescript
interface ReviewsTrendChartProps {
  reviews: {
    created_at: string
    rating: number
  }[]
}
```

#### الإحصائيات المعروضة
- Total Reviews - إجمالي المراجعات
- Daily Average - المتوسط اليومي
- Trend Percentage - نسبة التغيير

---

### 2. Rating Distribution Chart
**الملف:** `rating-distribution-chart.tsx`

#### الوصف
رسم بياني دائري (Pie Chart) يعرض توزيع التقييمات من 1 إلى 5 نجوم.

#### الميزات
- توزيع بصري للتقييمات
- نسب مئوية لكل فئة
- متوسط التقييم الإجمالي
- جدول تفصيلي للأعداد
- ألوان تدرجية حسب التقييم

#### الاستخدام

```tsx
import { RatingDistributionChart } from '@/components/dashboard/charts'

<RatingDistributionChart reviews={reviews} />
```

#### Props

```typescript
interface RatingDistributionChartProps {
  reviews: {
    rating: number
  }[]
}
```

#### نظام الألوان
- 5 نجوم: أخضر داكن
- 4 نجوم: أخضر فاتح
- 3 نجوم: أصفر
- 2 نجوم: برتقالي
- 1 نجمة: أحمر

---

### 3. Response Rate Chart
**الملف:** `response-rate-chart.tsx`

#### الوصف
رسم بياني مساحي (Area Chart) يعرض معدل الرد على المراجعات أسبوعياً.

#### الميزات
- معدل الرد الأسبوعي
- اتجاه التحسن أو التراجع
- إحصائيات شاملة
- نصائح تحسينية
- مؤشر الأداء

#### الاستخدام

```tsx
import { ResponseRateChart } from '@/components/dashboard/charts'

<ResponseRateChart reviews={reviews} />
```

#### Props

```typescript
interface ResponseRateChartProps {
  reviews: {
    created_at: string
    has_reply?: boolean
    review_reply?: string
    replied_at?: string
  }[]
}
```

#### الإحصائيات
- Overall Rate - المعدل الإجمالي
- Responded - عدد الردود
- Trend - اتجاه التحسن

---

### 4. Activity Heatmap
**الملف:** `activity-heatmap.tsx`

#### الوصف
خريطة حرارية تعرض توزيع النشاط حسب الساعة واليوم.

#### الميزات
- توزيع النشاط 24/7
- أوقات الذروة
- تدرج لوني حسب الكثافة
- Tooltip تفاعلي
- نصائح تحسينية

#### الاستخدام

```tsx
import { ActivityHeatmap } from '@/components/dashboard/charts'

<ActivityHeatmap activities={activities} />
```

#### Props

```typescript
interface ActivityHeatmapProps {
  activities: {
    created_at: string
  }[]
}
```

#### نظام التدرج
- No Activity: رمادي
- Low Activity: أزرق فاتح (20%)
- Medium-Low: أزرق (40%)
- Medium: أزرق متوسط (60%)
- Medium-High: أزرق داكن (80%)
- High Activity: أزرق أدكن (100%)

---

## Dashboard Charts Container

### الملف: `dashboard-charts.tsx`

مكون حاوي يجمع جميع الرسوم البيانية مع تخطيط responsive.

#### الاستخدام

```tsx
import { DashboardCharts } from '@/components/dashboard/charts'

<DashboardCharts 
  reviews={reviews}
  activities={activities}
/>
```

#### Layout

```
┌─────────────────────────────────────┐
│   Reviews Trend Chart (Full Width) │
├──────────────────┬──────────────────┤
│ Rating Dist.     │ Response Rate    │
├──────────────────┴──────────────────┤
│   Activity Heatmap (Full Width)    │
└─────────────────────────────────────┘
```

---

## التقنيات المستخدمة

### Recharts Components

- **LineChart** - للرسوم الخطية
- **AreaChart** - للرسوم المساحية
- **PieChart** - للرسوم الدائرية
- **ResponsiveContainer** - للتجاوب
- **Tooltip** - للمعلومات التفاعلية
- **Legend** - للمفاتيح

### date-fns Functions

- `format` - تنسيق التواريخ
- `subDays` - طرح الأيام
- `eachDayOfInterval` - إنشاء نطاق
- `eachWeekOfInterval` - إنشاء أسابيع
- `getHours` - الحصول على الساعة
- `getDay` - الحصول على اليوم

---

## Responsive Design

### Breakpoints

```css
/* Mobile First */
default: 1 column

/* Tablet */
md: 2 columns

/* Desktop */
lg: 2 columns (charts side by side)
```

### Chart Heights

- Reviews Trend: 300px
- Rating Distribution: 250px + legend
- Response Rate: 280px
- Activity Heatmap: Dynamic (based on content)

---

## Customization

### ألوان مخصصة

```tsx
// في أي مكون
const CUSTOM_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(48, 96%, 53%)',
  danger: 'hsl(0, 84%, 60%)',
}
```

### Tooltip مخصص

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{label}</p>
        <p className="text-sm">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

<LineChart>
  <Tooltip content={<CustomTooltip />} />
</LineChart>
```

---

## Performance

### Optimizations

1. **Data Memoization**
```tsx
const chartData = useMemo(
  () => generateChartData(reviews),
  [reviews]
)
```

2. **Lazy Loading**
```tsx
const Charts = dynamic(() => import('./charts'), {
  loading: () => <DashboardChartsSkeleton />
})
```

3. **Virtualization**
- يتم عرض البيانات المرئية فقط
- التحميل التدريجي للرسوم الكبيرة

---

## Animations

### Framer Motion Integration

```tsx
import { AnimatedWrapper } from '../animated-wrapper'

<AnimatedWrapper variant="slideUp" delay={0.1}>
  <ReviewsTrendChart />
</AnimatedWrapper>
```

### Animation Types
- `slideUp` - الانزلاق للأعلى
- `fadeIn` - الظهور التدريجي
- `scale` - التكبير
- Staggered delays للتسلسل

---

## Dark Mode Support

جميع الرسوم البيانية تدعم Dark Mode تلقائياً:

```css
/* Light Mode */
stroke="hsl(var(--primary))"

/* Dark Mode */
className="text-muted-foreground"
```

---

## Accessibility

### Features

- **ARIA Labels** - وصف للشاشات القارئة
- **Keyboard Navigation** - التنقل بالكيبورد
- **High Contrast** - تباين عالي
- **Screen Reader Support** - دعم القراء

### Example

```tsx
<LineChart aria-label="Reviews trend over last 30 days">
  {/* Chart content */}
</LineChart>
```

---

## Testing

### Unit Tests

```tsx
import { render } from '@testing-library/react'
import { ReviewsTrendChart } from './reviews-trend-chart'

test('renders chart with data', () => {
  const reviews = [
    { created_at: '2024-01-01', rating: 5 }
  ]
  
  const { container } = render(
    <ReviewsTrendChart reviews={reviews} />
  )
  
  expect(container.querySelector('.recharts-responsive-container'))
    .toBeInTheDocument()
})
```

---

## Troubleshooting

### Common Issues

#### 1. Chart not rendering

**Problem:** Chart shows empty or undefined

**Solution:**
```tsx
// Check data is valid
if (!reviews || reviews.length === 0) {
  return <EmptyState />
}
```

#### 2. Responsive issues

**Problem:** Chart overflows container

**Solution:**
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

#### 3. Performance lag

**Problem:** Chart updates slowly

**Solution:**
```tsx
// Memoize data calculation
const chartData = useMemo(
  () => processData(reviews),
  [reviews]
)
```

---

## Examples

### Basic Usage

```tsx
import { DashboardCharts } from '@/components/dashboard/charts'

function MyDashboard() {
  const { reviews, activities } = useDashboardData()
  
  return (
    <DashboardCharts 
      reviews={reviews}
      activities={activities}
    />
  )
}
```

### With Error Boundary

```tsx
import { ErrorBoundaryWrapper } from '@/components/dashboard'

<ErrorBoundaryWrapper>
  <DashboardCharts 
    reviews={reviews}
    activities={activities}
  />
</ErrorBoundaryWrapper>
```

### With Loading State

```tsx
import { Suspense } from 'react'
import { DashboardChartsSkeleton } from '@/components/dashboard/charts'

<Suspense fallback={<DashboardChartsSkeleton />}>
  <DashboardCharts 
    reviews={reviews}
    activities={activities}
  />
</Suspense>
```

---

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Dependencies

```json
{
  "recharts": "^3.3.0",
  "date-fns": "^4.1.0",
  "framer-motion": "latest"
}
```

جميع المكتبات موجودة في `package.json` ✅

---

**تم التنفيذ بنجاح!** 🎉

جميع الرسوم البيانية جاهزة ومدمجة بالكامل في Dashboard.

