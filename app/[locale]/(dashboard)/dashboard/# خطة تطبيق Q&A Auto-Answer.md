# خطة تطبيق Q&A Auto-Answer

## النطاق والهدف

تطوير نظام رد تلقائي ذكي على أسئلة Google My Business يعمل على مدار الساعة بدون تدخل بشري، مع الحفاظ على دقة عالية (80%+) وسرعة استجابة (<2 دقيقة).

## المراحل الرئيسية

### المرحلة 1: Backend - البنية التحتية (يومين)

- إعداد قاعدة البيانات
- بناء خدمة AI للأسئلة  
- تطوير APIs الأساسية
- نظام المعالجة التلقائية

### المرحلة 2: Frontend - الواجهات (يومين)  

- واجهة الإعدادات
- لوحة المراقبة
- عرض الأسئلة المحسّن
- أدوات الاختبار

### المرحلة 3: التكامل والاختبار (يوم)

- ربط Frontend مع Backend
- اختبارات شاملة
- نشر للمستخدمين التجريبيين

---

## تفاصيل التنفيذ

### BACKEND (3 أيام)

#### 1. قاعدة البيانات

**ملف**: `supabase/migrations/20250122_question_auto_answer.sql`

```sql
-- جدول إعدادات الرد التلقائي للأسئلة
CREATE TABLE question_auto_answer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  location_id UUID REFERENCES gmb_locations(id),
  
  -- الإعدادات الأساسية
  enabled BOOLEAN DEFAULT false,
  confidence_threshold INTEGER DEFAULT 80, -- 0-100
  
  -- التحكم بنوع الأسئلة
  answer_hours_questions BOOLEAN DEFAULT true,
  answer_location_questions BOOLEAN DEFAULT true,  
  answer_services_questions BOOLEAN DEFAULT true,
  answer_pricing_questions BOOLEAN DEFAULT true,
  answer_general_questions BOOLEAN DEFAULT false,
  
  -- إعدادات اللغة والأسلوب
  language_preference TEXT DEFAULT 'auto', -- auto/ar/en
  tone TEXT DEFAULT 'professional',
  include_business_name BOOLEAN DEFAULT true,
  add_call_to_action BOOLEAN DEFAULT true,
  
  -- التتبع
  total_answers_sent INTEGER DEFAULT 0,
  successful_answers INTEGER DEFAULT 0,
  last_answer_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول سجل الإجابات التلقائية
CREATE TABLE question_auto_answers_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES gmb_questions(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- تفاصيل الإجابة
  answer_text TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  ai_provider TEXT,
  ai_model TEXT,
  
  -- البيانات المستخدمة
  context_used JSONB, -- business info used
  question_category TEXT,
  language_detected TEXT,
  
  -- الأداء
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  
  -- الحالة
  status TEXT DEFAULT 'pending', -- pending/posted/failed
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. خدمة AI للأسئلة

**ملف**: `lib/services/ai-question-answer-service.ts`

```typescript
interface QuestionContext {
  question: string;
  businessInfo: {
    name: string;
    category: string;
    description?: string;
    hours?: BusinessHours;
    services?: string[];
    attributes?: Record<string, any>;
    location?: {
      address: string;
      phone?: string;
      website?: string;
    };
  };
  previousQuestions?: Array<{
    question: string;
    answer: string;
  }>;
  language: 'ar' | 'en' | 'auto';
  tone: string;
}

export class AIQuestionAnswerService {
  async generateAnswer(context: QuestionContext): Promise<AnswerResult> {
    // 1. تحليل السؤال وتحديد الفئة
    const category = await this.categorizeQuestion(context.question);
    
    // 2. جمع المعلومات ذات الصلة
    const relevantInfo = this.extractRelevantInfo(category, context.businessInfo);
    
    // 3. اختيار مزود AI المناسب
    const provider = category === 'factual' ? 'gemini' : 'anthropic';
    
    // 4. بناء prompt محسّن
    const prompt = this.buildPrompt(context, category, relevantInfo);
    
    // 5. توليد الإجابة
    const answer = await this.callAIProvider(provider, prompt);
    
    // 6. حساب درجة الثقة
    const confidence = this.calculateConfidence(answer, category, relevantInfo);
    
    return {
      answer: answer.text,
      confidence,
      category,
      provider,
      processingTime: Date.now() - startTime
    };
  }
  
  private categorizeQuestion(question: string): QuestionCategory {
    // استخدام ML للتصنيف
    const patterns = {
      hours: /ساعات|مفتوح|opening hours|open|close/i,
      location: /موقع|عنوان|location|address|where/i,
      services: /خدمات|services|what do you|offer/i,
      pricing: /سعر|تكلفة|price|cost|how much/i,
      general: /.*/
    };
    
    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(question)) return category as QuestionCategory;
    }
    
    return 'general';
  }
  
  private calculateConfidence(answer: AnswerResult, category: string, info: any): number {
    let confidence = 50; // Base confidence
    
    // معايير رفع الثقة
    if (category !== 'general') confidence += 20;
    if (info && Object.keys(info).length > 0) confidence += 20;
    if (answer.text.length > 50) confidence += 10;
    
    // معايير خفض الثقة
    if (answer.text.includes('may') || answer.text.includes('قد')) confidence -= 10;
    if (!info || Object.keys(info).length === 0) confidence -= 20;
    
    return Math.max(0, Math.min(100, confidence));
  }
}
```

#### 3. API للرد التلقائي

**ملف**: `app/api/questions/auto-answer/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { questionId } = await request.json();
  
  // 1. جلب تفاصيل السؤال
  const question = await getQuestion(questionId);
  
  // 2. جلب إعدادات المستخدم
  const settings = await getAutoAnswerSettings(question.user_id, question.location_id);
  
  // 3. التحقق من التفعيل
  if (!settings.enabled) {
    return NextResponse.json({ error: 'Auto-answer disabled' });
  }
  
  // 4. جلب معلومات العمل
  const businessInfo = await getBusinessInfo(question.location_id);
  
  // 5. توليد الإجابة
  const service = new AIQuestionAnswerService();
  const result = await service.generateAnswer({
    question: question.question_text,
    businessInfo,
    language: settings.language_preference,
    tone: settings.tone
  });
  
  // 6. التحقق من درجة الثقة
  if (result.confidence < settings.confidence_threshold) {
    await logLowConfidenceAnswer(questionId, result);
    return NextResponse.json({ 
      queued: true, 
      reason: 'Low confidence',
      confidence: result.confidence 
    });
  }
  
  // 7. نشر الإجابة
  await postAnswer(questionId, result.answer);
  
  // 8. تسجيل في السجل
  await logAutoAnswer(questionId, result);
  
  return NextResponse.json({ 
    success: true, 
    answer: result.answer,
    confidence: result.confidence 
  });
}
```

#### 4. Webhook للأسئلة الجديدة

**ملف**: `app/api/webhooks/gmb/questions/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const payload = await request.json();
  
  // 1. التحقق من صحة Webhook
  if (!verifyWebhookSignature(request)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // 2. معالجة السؤال الجديد
  const { question, locationId } = payload;
  
  // 3. حفظ في قاعدة البيانات
  const savedQuestion = await saveQuestion(question, locationId);
  
  // 4. تشغيل الرد التلقائي
  await fetch('/api/questions/auto-answer', {
    method: 'POST',
    body: JSON.stringify({ questionId: savedQuestion.id })
  });
  
  return NextResponse.json({ received: true });
}
```

#### 5. Background Job للمعالجة

**ملف**: `app/api/cron/process-questions/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // يعمل كل 5 دقائق
  
  // 1. جلب الأسئلة غير المجابة
  const unansweredQuestions = await getUnansweredQuestions();
  
  // 2. معالجة كل سؤال
  for (const question of unansweredQuestions) {
    try {
      await fetch('/api/questions/auto-answer', {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id })
      });
    } catch (error) {
      console.error(`Failed to process question ${question.id}:`, error);
    }
  }
  
  return NextResponse.json({ 
    processed: unansweredQuestions.length 
  });
}
```

### FRONTEND (2 يوم)

#### 1. صفحة إعدادات الرد التلقائي

**ملف**: `app/[locale]/(dashboard)/settings/auto-pilot/questions/page.tsx`

```typescript
export default function QuestionAutoAnswerSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          إعدادات الرد التلقائي على الأسئلة
        </h2>
        
        {/* التفعيل الرئيسي */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-medium">تفعيل الرد التلقائي</h3>
            <p className="text-sm text-gray-500">
              الرد على الأسئلة تلقائياً خلال دقيقتين
            </p>
          </div>
          <Switch />
        </div>
        
        {/* عتبة الثقة */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            الحد الأدنى للثقة: <span className="text-primary">80%</span>
          </label>
          <Slider
            min={50}
            max={100}
            step={5}
            defaultValue={[80]}
          />
          <p className="text-xs text-gray-500 mt-1">
            الأسئلة بثقة أقل ستحتاج لمراجعتك
          </p>
        </div>
        
        {/* أنواع الأسئلة */}
        <div className="space-y-3">
          <h4 className="font-medium mb-2">أنواع الأسئلة المسموح بالرد عليها</h4>
          
          <div className="flex items-center justify-between">
            <label className="text-sm">أسئلة ساعات العمل</label>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm">أسئلة الموقع والعنوان</label>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm">أسئلة الخدمات</label>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm">أسئلة الأسعار</label>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm">أسئلة عامة</label>
            <Switch />
          </div>
        </div>
        
        {/* إعدادات الأسلوب */}
        <div className="mt-6">
          <h4 className="font-medium mb-2">أسلوب الرد</h4>
          <RadioGroup defaultValue="professional">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="professional" />
              <Label>احترافي</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="friendly" />
              <Label>ودود</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="casual" />
              <Label>عادي</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
```

#### 2. لوحة مراقبة الرد التلقائي

**ملف**: `components/questions/AutoAnswerMonitoring.tsx`

```typescript
export function AutoAnswerMonitoring() {
  const [stats, setStats] = useState<AutoAnswerStats | null>(null);
  const [recentAnswers, setRecentAnswers] = useState<RecentAnswer[]>([]);
  
  useEffect(() => {
    // جلب الإحصائيات كل 30 ثانية
    const fetchStats = async () => {
      const res = await fetch('/api/questions/auto-answer/stats');
      const data = await res.json();
      setStats(data.stats);
      setRecentAnswers(data.recentAnswers);
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* بطاقات الإحصائيات */}
      <Card>
        <CardHeader>
          <CardTitle>الردود اليوم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.todayCount || 0}</div>
          <p className="text-sm text-muted-foreground">
            متوسط الوقت: {stats?.avgResponseTime || '0'} ثانية
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>معدل النجاح</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.successRate || '0'}%
          </div>
          <Progress value={stats?.successRate || 0} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>متوسط الثقة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.avgConfidence || '0'}%
          </div>
          <p className="text-sm text-muted-foreground">
            الحد الأدنى: {stats?.confidenceThreshold || 80}%
          </p>
        </CardContent>
      </Card>
      
      {/* قائمة الردود الأخيرة */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>الردود الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAnswers.map((answer) => (
              <div key={answer.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium">
                    {answer.question}
                  </div>
                  <Badge variant={answer.confidence >= 80 ? 'success' : 'warning'}>
                    ثقة {answer.confidence}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {answer.answer}
                </p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{answer.locationName}</span>
                  <span>{formatRelativeTime(answer.answeredAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* رسم بياني للأداء */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>أداء الرد التلقائي (آخر 7 أيام)</CardTitle>
        </CardHeader>
        <CardContent>
          <AnswerPerformanceChart data={stats?.weeklyData || []} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3. تحسين عرض الأسئلة

**ملف**: `components/questions/enhanced-questions-list.tsx`

```typescript
export function EnhancedQuestionsList() {
  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card key={question.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{question.location_name}</Badge>
                  {question.ai_answered && (
                    <Badge variant="secondary" className="gap-1">
                      <Bot className="w-3 h-3" />
                      رد تلقائي
                    </Badge>
                  )}
                  {question.confidence_score && (
                    <Badge variant={question.confidence_score >= 80 ? 'success' : 'warning'}>
                      ثقة {question.confidence_score}%
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-medium mb-2">{question.question_text}</h3>
                
                {question.answer_text && (
                  <div className="bg-gray-50 rounded p-3 mt-2">
                    <p className="text-sm">{question.answer_text}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>
                        {question.answered_by || 'AI Assistant'}
                      </span>
                      <span>
                        {formatRelativeTime(question.answered_at)}
                      </span>
                      {question.ai_provider && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {question.response_time_ms}ms
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {!question.answer_text && (
                  <Button 
                    size="sm"
                    onClick={() => handleManualAnswer(question.id)}
                  >
                    أجب
                  </Button>
                )}
                {question.answer_text && !question.published && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublish(question.id)}
                  >
                    نشر
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 4. مكون اختبار الرد التلقائي

**ملف**: `components/questions/TestAutoAnswer.tsx`

```typescript
export function TestAutoAnswer() {
  const [testQuestion, setTestQuestion] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/questions/test-auto-answer', {
        method: 'POST',
        body: JSON.stringify({ 
          question: testQuestion,
          locationId: selectedLocation 
        })
      });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>اختبار الرد التلقائي</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>أدخل سؤال تجريبي</Label>
            <Textarea
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              placeholder="مثال: ما هي ساعات العمل؟"
            />
          </div>
          
          <Button 
            onClick={handleTest} 
            disabled={!testQuestion || loading}
          >
            {loading ? 'جاري الاختبار...' : 'اختبر'}
          </Button>
          
          {testResult && (
            <div className="mt-4 space-y-3">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">الإجابة المقترحة</h4>
                <p className="text-sm">{testResult.answer}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">درجة الثقة:</span>
                  <span className="font-medium ml-2">
                    {testResult.confidence}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">التصنيف:</span>
                  <span className="font-medium ml-2">
                    {testResult.category}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">المزود:</span>
                  <span className="font-medium ml-2">
                    {testResult.provider}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">وقت المعالجة:</span>
                  <span className="font-medium ml-2">
                    {testResult.processingTime}ms
                  </span>
                </div>
              </div>
              
              {testResult.confidence < 80 && (
                <Alert variant="warning">
                  <AlertDescription>
                    درجة الثقة أقل من 80%، لن يتم الرد تلقائياً
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### التكامل والاختبار

#### 1. ربط الأجزاء

- توصيل Frontend APIs مع Backend endpoints
- تأكيد تدفق البيانات بشكل صحيح
- اختبار السيناريوهات المختلفة

#### 2. اختبارات الوحدة

```typescript
// tests/question-auto-answer.test.ts
describe('Question Auto Answer', () => {
  test('should categorize hours question correctly', () => {
    const category = categorizeQuestion('What are your opening hours?');
    expect(category).toBe('hours');
  });
  
  test('should generate answer with high confidence for factual questions', async () => {
    const result = await generateAnswer({
      question: 'What is your address?',
      businessInfo: { location: { address: '123 Main St' } }
    });
    expect(result.confidence).toBeGreaterThan(80);
  });
  
  test('should not auto-answer low confidence questions', async () => {
    const result = await processQuestion({
      question: 'Do you have parking?',
      businessInfo: {} // No parking info
    });
    expect(result.queued).toBe(true);
  });
});
```

#### 3. اختبار التكامل

- اختبار تدفق كامل: سؤال جديد → تحليل → إجابة → نشر
- اختبار مع 10+ أسئلة حقيقية
- اختبار الأداء تحت الضغط

#### 4. المراقبة

- إضافة logging شامل
- تتبع الأخطاء في Sentry
- مراقبة معدلات النجاح

### الملفات المطلوبة

**Backend:**

- `supabase/migrations/20250122_question_auto_answer.sql`
- `lib/services/ai-question-answer-service.ts`
- `app/api/questions/auto-answer/route.ts`
- `app/api/questions/auto-answer/stats/route.ts`
- `app/api/questions/test-auto-answer/route.ts`
- `app/api/webhooks/gmb/questions/route.ts`
- `app/api/cron/process-questions/route.ts`
- `server/actions/questions-auto-answer.ts`

**Frontend:**

- `app/[locale]/(dashboard)/settings/auto-pilot/questions/page.tsx`
- `components/questions/AutoAnswerMonitoring.tsx`
- `components/questions/enhanced-questions-list.tsx`
- `components/questions/TestAutoAnswer.tsx`
- `components/questions/AnswerPerformanceChart.tsx`

**Utils:**

- `lib/utils/question-categorizer.ts`
- `lib/utils/confidence-calculator.ts`

### معايير النجاح

- **وقت الرد**: < 2 دقيقة (متوسط)
- **دقة الإجابات**: > 90% للأسئلة الواقعية
- **معدل الثقة**: > 85% متوسط
- **رضا المستخدمين**: > 4.5/5
- **تقليل العمل اليدوي**: > 80%