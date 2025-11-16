# تحليل My Business Lodging API

## نظرة عامة

**My Business Lodging API** هو API خاص بإدارة معلومات الفنادق والإقامات على Google Business Profile.

---

## الحالة الحالية في المشروع

### ❌ **غير مستخدم حالياً**

بعد البحث في الكود، تبين أن:
- ✅ الـ API Schema موجود في الملف التوثيقي
- ❌ لا يوجد أي استدعاء فعلي للـ API في الكود
- ❌ لا توجد endpoints محلية تستخدمه
- ❌ لا توجد components تتعامل معه

```bash
# نتائج البحث
grep -r "mybusinesslodging" → لا توجد نتائج
grep -r "getLodging" → فقط في ملف التوثيق
grep -r "updateLodging" → فقط في ملف التوثيق
```

---

## معلومات الـ API

### الـ Base URL
```
https://mybusinesslodging.googleapis.com/v1
```

### الـ Endpoints المتاحة

#### 1. **GET Lodging Information**
```
GET /v1/locations/{location_id}/lodging
```
**الوصف**: جلب معلومات الإقامة لموقع محدد.

**Parameters**:
- `name` (required): `locations/{location_id}/lodging`
- `readMask` (required): الحقول المطلوبة (استخدم `*` لجميع الحقول)

**Response**: كائن `Lodging` كامل

---

#### 2. **PATCH Update Lodging**
```
PATCH /v1/locations/{location_id}/lodging
```
**الوصف**: تحديث معلومات الإقامة لموقع محدد.

**Parameters**:
- `name` (required): `locations/{location_id}/lodging`
- `updateMask` (required): الحقول المراد تحديثها

**Body**: كائن `Lodging` مع التحديثات

---

#### 3. **GET Google Updated Lodging**
```
GET /v1/locations/{location_id}/lodging:getGoogleUpdated
```
**الوصف**: جلب التحديثات التي أجرتها Google على معلومات الإقامة.

**Response**: 
```json
{
  "lodging": { /* Lodging object */ },
  "diffMask": "field1,field2,..." // الحقول التي حدثتها Google
}
```

---

## الـ Lodging Schema

### الحقول الرئيسية

```typescript
interface Lodging {
  name: string;                    // Required: locations/{location_id}/lodging
  metadata: LodgingMetadata;       // Required: تاريخ آخر تحديث
  
  // معلومات العقار
  property?: Property;             // سنة البناء، عدد الغرف، الطوابق
  
  // الخدمات والمرافق
  services?: Services;             // مكتب الاستقبال، المصعد، الكونسيرج
  policies?: Policies;             // أوقات تسجيل الدخول/الخروج، السياسات
  foodAndDrink?: FoodAndDrink;     // المطاعم، خدمة الغرف، الإفطار
  pools?: Pools;                   // المسابح، الجاكوزي
  wellness?: Wellness;             // الجيم، السبا، الساونا
  activities?: Activities;         // الأنشطة الترفيهية
  transportation?: Transportation; // المواصلات، المطار
  families?: Families;             // خدمات العائلات والأطفال
  connectivity?: Connectivity;     // الواي فاي، الإنترنت
  business?: Business;             // مركز الأعمال، قاعات الاجتماعات
  accessibility?: Accessibility;   // مرافق ذوي الاحتياجات الخاصة
  pets?: Pets;                     // سياسة الحيوانات الأليفة
  parking?: Parking;               // مواقف السيارات
  housekeeping?: Housekeeping;     // خدمات التنظيف
  
  // COVID-19 & Sustainability
  healthAndSafety?: HealthAndSafety;
  sustainability?: Sustainability;
  
  // الغرف
  commonLivingArea?: LivingArea;   // المساحات المشتركة
  guestUnits?: GuestUnitType[];    // أنواع الغرف المختلفة
  allUnits?: GuestUnitFeatures;    // (readonly) ميزات موجودة في كل الغرف
  someUnits?: GuestUnitFeatures;   // (readonly) ميزات موجودة في بعض الغرف
}
```

---

## أمثلة على البيانات المتاحة

### 1. Property (معلومات العقار)
```typescript
{
  builtYear: 2015,
  lastRenovatedYear: 2020,
  roomsCount: 150,
  floorsCount: 10
}
```

### 2. Services (الخدمات)
```typescript
{
  frontDesk: true,
  twentyFourHourFrontDesk: true,
  concierge: true,
  elevator: true,
  baggageStorage: true,
  fullServiceLaundry: true,
  languagesSpoken: [
    { languageCode: "en", spoken: true },
    { languageCode: "ar", spoken: true }
  ]
}
```

### 3. FoodAndDrink (الطعام والشراب)
```typescript
{
  restaurant: true,
  restaurantsCount: 3,
  roomService: true,
  twentyFourHourRoomService: true,
  breakfastAvailable: true,
  freeBreakfast: true,
  bar: true
}
```

### 4. GuestUnitType (أنواع الغرف)
```typescript
{
  codes: ["DELUXE_KING", "DLX_K"],
  label: "Deluxe King Room",
  features: {
    tier: "DELUXE_UNIT",
    maxOccupantsCount: 2,
    maxAdultOccupantsCount: 2,
    suite: false,
    views: {
      oceanView: true,
      cityView: false
    },
    totalLivingAreas: {
      layout: {
        livingAreaSqMeters: 35.5,
        balcony: true
      },
      sleeping: {
        bedsCount: 1,
        kingBedsCount: 1
      },
      features: {
        airConditioning: true,
        tv: true,
        inunitWifiAvailable: true
      }
    }
  }
}
```

---

## متى يُستخدم هذا الـ API؟

### ✅ **يجب استخدامه إذا كان المشروع يدعم:**

1. **الفنادق والمنتجعات**
   - إدارة معلومات الغرف والأجنحة
   - عرض المرافق والخدمات
   - تحديث السياسات والأسعار

2. **بيوت الضيافة (B&B)**
   - معلومات الإفطار
   - أنواع الغرف المتاحة

3. **الشقق الفندقية**
   - معلومات المطابخ
   - الغسالات والمجففات
   - المساحات المعيشية

4. **النزل والموتيلات**
   - معلومات أساسية عن الغرف
   - المرافق المتاحة

### ❌ **لا يُستخدم إذا كان المشروع يدعم:**

- المطاعم فقط
- المتاجر
- الخدمات المهنية
- الأعمال التي لا تقدم إقامة

---

## التكامل المقترح

### إذا أردت إضافة دعم الفنادق:

#### 1. إنشاء API Route
```typescript
// app/api/gmb/location/[locationId]/lodging/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Authentication required", 401)
  }

  // Get location resource name
  const { data: location } = await supabase
    .from("gmb_locations")
    .select("location_id")
    .eq("id", params.locationId)
    .eq("user_id", user.id)
    .single()

  if (!location) {
    return errorResponse("NOT_FOUND", "Location not found", 404)
  }

  const accessToken = await getValidAccessToken(supabase, accountId)
  
  const url = new URL(
    `https://mybusinesslodging.googleapis.com/v1/${location.location_id}/lodging`
  )
  url.searchParams.set("readMask", "*")

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    return errorResponse(
      "GOOGLE_API_ERROR",
      errorData.error?.message || "Failed to fetch lodging info",
      response.status,
      errorData
    )
  }

  const lodging = await response.json()
  return NextResponse.json({ data: lodging })
}
```

#### 2. إنشاء Component
```typescript
// components/locations/lodging-info.tsx

export function LodgingInfo({ locationId }: { locationId: string }) {
  const [lodging, setLodging] = useState<Lodging | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLodging() {
      const response = await fetch(`/api/gmb/location/${locationId}/lodging`)
      const data = await response.json()
      setLodging(data.data)
      setLoading(false)
    }
    fetchLodging()
  }, [locationId])

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {/* Property Info */}
      {lodging?.property && (
        <Card>
          <CardHeader>
            <CardTitle>معلومات العقار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>سنة البناء</Label>
                <p>{lodging.property.builtYear}</p>
              </div>
              <div>
                <Label>عدد الغرف</Label>
                <p>{lodging.property.roomsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {lodging?.services && (
        <Card>
          <CardHeader>
            <CardTitle>الخدمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lodging.services.frontDesk && (
                <Badge>مكتب استقبال 24 ساعة</Badge>
              )}
              {lodging.services.concierge && (
                <Badge>خدمة الكونسيرج</Badge>
              )}
              {lodging.services.elevator && (
                <Badge>مصعد</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guest Units */}
      {lodging?.guestUnits && (
        <Card>
          <CardHeader>
            <CardTitle>أنواع الغرف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lodging.guestUnits.map((unit, index) => (
                <div key={index} className="border p-4 rounded">
                  <h4 className="font-semibold">{unit.label}</h4>
                  <p className="text-sm text-muted-foreground">
                    الرموز: {unit.codes.join(", ")}
                  </p>
                  {unit.features && (
                    <div className="mt-2">
                      <p>الحد الأقصى: {unit.features.maxOccupantsCount} شخص</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### 3. إضافة Tab في Location Profile
```typescript
// في components/locations/location-profile-tabs.tsx

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
    <TabsTrigger value="attributes">السمات</TabsTrigger>
    <TabsTrigger value="lodging">معلومات الإقامة</TabsTrigger> {/* جديد */}
  </TabsList>
  
  <TabsContent value="lodging">
    <LodgingInfo locationId={location.id} />
  </TabsContent>
</Tabs>
```

---

## الفوائد المحتملة

### 1. **للفنادق**
- ✅ عرض شامل لجميع المرافق والخدمات
- ✅ إدارة أنواع الغرف المختلفة
- ✅ تحديث معلومات الإقامة بسهولة
- ✅ عرض سياسات الفندق (تسجيل الدخول/الخروج)

### 2. **للمستخدمين**
- ✅ معلومات تفصيلية عن الغرف
- ✅ معرفة المرافق المتاحة
- ✅ مقارنة أنواع الغرف المختلفة

### 3. **للـ SEO**
- ✅ بيانات منظمة (Structured Data)
- ✅ ظهور أفضل في نتائج البحث
- ✅ معلومات دقيقة على Google Maps

---

## الخلاصة

### الحالة الحالية
❌ **غير مستخدم في المشروع**

### التوصية
- ✅ **إذا كان المشروع يستهدف الفنادق**: يجب إضافة التكامل
- ❌ **إذا كان المشروع للأعمال العامة فقط**: لا حاجة له

### الخطوات التالية (إذا قررت الإضافة)
1. ✅ إنشاء API route للـ lodging
2. ✅ إنشاء component لعرض المعلومات
3. ✅ إضافة tab جديد في location profile
4. ✅ إضافة form لتحديث معلومات الإقامة
5. ✅ اختبار التكامل مع موقع فندق حقيقي

---

## ملاحظات مهمة

### 1. **الـ Scope المطلوب**
```
https://www.googleapis.com/auth/business.manage
```
هذا الـ scope موجود بالفعل في المشروع ✅

### 2. **القيود**
- ⚠️ يعمل فقط مع locations من نوع "hotel" أو "lodging"
- ⚠️ بعض الحقول قد تكون read-only
- ⚠️ Google قد تحدث بعض الحقول تلقائياً

### 3. **الـ Exception Handling**
كل حقل له `exception` field يوضح سبب عدم التوفر:
- `UNDER_CONSTRUCTION`: تحت الصيانة
- `DEPENDENT_ON_SEASON`: موسمي
- `DEPENDENT_ON_DAY_OF_WEEK`: حسب اليوم

---

## التاريخ
- **تاريخ التحليل**: 2024-11-16
- **الحالة**: غير مستخدم حالياً
- **التوصية**: إضافة إذا كان المشروع يستهدف الفنادق

