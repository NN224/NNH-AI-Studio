'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/lib/navigation';
import { ArrowLeft, Calendar, Image as ImageIcon, Loader2, Send, Timer, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { logActivity } from '@/lib/services/activity'

type LocationItem = { id: string; location_name: string };

// تعريف أنواع أزرار CTA المتاحة في GMB
const ctaOptions = [
  { value: 'BOOK', label: 'Book' },
  { value: 'ORDER', label: 'Order Online' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CALL', label: 'Call' },
];

export default function GMBPostsPage() {
  const supabase = createClient();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // حالة جديدة لتعقب تحميل الميديا
  const [mediaUploading, setMediaUploading] = useState(false);
  // استخدام خدمة التسجيل الموحّدة عبر المشروع

  const [locationId, setLocationId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  // استخدام قيمة CTA (value) التي تطابق الخيارات المحددة
  const [cta, setCta] = useState<string>('none');
  const [ctaUrl, setCtaUrl] = useState('');
  const [schedule, setSchedule] = useState<string>('');
  const [genLoading, setGenLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const handleGenerate = async () => {
    try {
      setGenLoading(true);
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'gmb', prompt: content || title, tone: 'friendly' }),
      });
      const j = await res.json();
      if (j?.title) setTitle(j.title);
      if (j?.description) setContent(j.description);
      toast.success('تم توليد المحتوى بالذكاء الاصطناعي', { description: 'راجع النص قبل الحفظ أو النشر', duration: 4500 });
      logActivity({ type: 'ai', message: '🎨 Generated GMB post content using AI', metadata: { prompt: (content || title).substring(0, 100) } })
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      toast.error('حدث خطأ أثناء توليد المحتوى', { description: 'تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى', duration: 7000 });
      logActivity({ type: 'ai', message: '❌ AI content generation failed', metadata: { error: errorMsg } })
    } finally {
      setGenLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('gmb_locations')
        .select('id, location_name')
        .eq('user_id', user.id)
        .order('location_name');
      setLocations((data ?? []) as { id: string; location_name: string }[]);
      setLoading(false);
      // fetch posts
      try {
        const res = await fetch('/api/gmb/posts/list');
        const j = await res.json();
        if (res.ok) setPosts(j.items || []);
      } finally {
        setListLoading(false);
      }
    };
    fetchData();
  }, [supabase]);

  const handleSave = async () => {
    // يجب أن يكون ctaUrl مطلوباً إذا تم تحديد CTA، لكننا سنسمح بالحفظ بدونها الآن
    if (!locationId || !content.trim()) return;
    try {
      setSaving(true);
      const res = await fetch('/api/gmb/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          title: title || undefined,
          content,
          mediaUrl: mediaUrl || undefined,
          // إرسال قيمة CTA فقط إذا كانت محددة (تجاهل "none")
          callToAction: cta && cta !== 'none' ? cta : undefined,
          callToActionUrl: (cta && cta !== 'none' && ctaUrl) || undefined,
          scheduledAt: schedule || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to save post');
      toast.success('تم حفظ المنشور بنجاح!', { description: 'يمكنك نشره الآن أو العودة لاحقاً', duration: 5000 });
      logActivity({ type: 'post_saved', message: '💾 Saved GMB post to drafts', metadata: { locationId, hasMedia: Boolean(mediaUrl), hasCta: Boolean(cta), contentLength: content.length } })
      return j.post?.id as string | undefined;
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      toast.error('تعذر حفظ المنشور', { description: 'تحقق من اتصالك أو حاول بعد قليل', duration: 6500 });
      logActivity({ type: 'post', message: '❌ Post save failed', metadata: { error: errorMsg } })
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!locationId || !content.trim()) return;
    // التأكد من أن لدينا saved post id أولاً
    const postId = await handleSave();
    if (!postId) return;
    try {
      setSaving(true); // نستخدم حالة الحفظ هنا أيضًا للإشارة إلى العمل الجاري
      const res = await fetch('/api/gmb/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to publish');
      toast.success('تم النشر على Google بنجاح!', { description: 'قد يستغرق الظهور بضع دقائق', duration: 6000 });
      logActivity({ type: 'post', message: '✅ Published GMB post to Google', metadata: { postId, hasMedia: Boolean(mediaUrl), hasCta: Boolean(cta) } })
      // مسح النموذج بعد النشر
      setTitle('');
      setContent('');
      setMediaUrl('');
      setCta('none');
      setCtaUrl('');
      setSchedule('');
      // تحديث القائمة بعد النشر (بدلًا من جلبها بالكامل، يمكننا إزالة المنشور القديم وإضافة المنشور الجديد إذا لزم الأمر)
      const r = await fetch('/api/gmb/posts/list');
      const jj = await r.json();
      if (r.ok) setPosts(jj.items || []);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      toast.error('تعذر النشر على Google', { description: 'تحقق من الاتصال أو أعد المحاولة لاحقاً', duration: 7000 });
      logActivity({ type: 'post', message: '❌ Post publish failed', metadata: { error: errorMsg } })
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMediaUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      const j = await res.json();
      if (res.ok && j.url) {
        setMediaUrl(j.url);
        toast.success('تم رفع الصورة', { description: 'سيتم استخدامها في المنشور', duration: 4000 });
        logActivity({ type: 'post', message: '📸 Uploaded image for GMB post', metadata: { fileSize: file.size, fileName: file.name } })
      } else {
        toast.error(j.error ? `فشل رفع الصورة: ${j.error}` : 'فشل رفع الصورة. جرب صورة بحجم أقل أو تحقق من الاتصال.', { duration: 7000 });
        logActivity({ type: 'post', message: '❌ Image upload failed', metadata: { error: j.error } })
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      toast.error('حدث خطأ أثناء رفع الصورة', { description: 'تحقق من الاتصال أو نوع الملف', duration: 6500 });
      logActivity({ type: 'post', message: '❌ Image upload error', metadata: { error: errorMsg } })
    } finally {
      setMediaUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 py-4 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

  <Card className="border border-primary/20 glass-strong">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>GMB Post Composer</CardTitle>
                <CardDescription>Create and schedule Business Profile posts</CardDescription>
              </div>
              <Button variant="ghost" size="sm" aria-label="Help" title="شرح الوظائف" onClick={() => {
                window.alert('لإنشاء منشور جديد: اختر الموقع، أدخل المحتوى، أضف صورة أو رابط إذا رغبت، وحدد زر Call to Action وجدولة النشر إذا لزم الأمر. يمكنك توليد المحتوى تلقائياً بالذكاء الاصطناعي عبر زر Generate with AI. بعد الانتهاء، اضغط حفظ أو نشر.');
              }}>
                ?
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Location */}
            <div className="grid gap-2">
              <label htmlFor="location-select" className="text-sm text-muted-foreground">Location
                <span className="ml-2 text-xs text-muted-foreground">اختر الموقع الذي تريد النشر عليه</span>
              </label>
              <Select onValueChange={setLocationId} value={locationId}>
                <SelectTrigger id="location-select" aria-label="Select business location">
                  <SelectValue placeholder={loading ? 'Loading locations...' : 'Select a location'} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id} aria-label={l.location_name}>
                      {l.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <label htmlFor="post-title" className="text-sm text-muted-foreground">Title (optional)
                <span className="ml-2 text-xs text-muted-foreground">يمكنك تركه فارغاً</span>
              </label>
              <Input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Post title" />
            </div>

            {/* Content */}
            <div className="grid gap-2">
              <label htmlFor="post-content" className="text-sm text-muted-foreground">Content
                <span className="ml-2 text-xs text-muted-foreground">اكتب نص المنشور أو استخدم الذكاء الاصطناعي</span>
              </label>
              <Textarea
                id="post-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Write your post content..."
                aria-label="Post content"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  variant="outline"
                  className="gap-2"
                  disabled={genLoading}
                  aria-label="Generate post content with AI"
                >
                  {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate with AI
                </Button>
              </div>
            </div>

            {/* Media */}
            <div className="grid gap-2">
              <label htmlFor="media-url" className="text-sm text-muted-foreground">Image/Media (optional)
                <span className="ml-2 text-xs text-muted-foreground">ارفع صورة أو أدخل رابط صورة</span>
              </label>
              <div className="flex gap-2">
                <Input id="media-url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="URL or upload file" disabled={mediaUploading} aria-label="Media URL or upload" />
                <label className="cursor-pointer" htmlFor="media-upload">
                  <Button variant="outline" type="button" className="gap-2" asChild disabled={mediaUploading} aria-label="Upload image">
                    {mediaUploading ? (
                      <span>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                      </span>
                    ) : (
                      <span>
                        <Upload className="w-4 h-4" /> Upload
                      </span>
                    )}
                  </Button>
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMediaUpload}
                    disabled={mediaUploading}
                    aria-label="Upload image file"
                  />
                </label>
              </div>
              {mediaUrl && (
                <div className="mt-2">
                  <img src={mediaUrl} alt="Media preview" className="max-w-xs rounded border border-primary/20" />
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">Call to Action (optional)
                  <span className="ml-2 text-xs text-muted-foreground">زر تفاعل مثل Book أو Order</span>
                </label>
                {/* ⭐️ تم استبدال Input بـ Select لتحسين UX */}
                <Select onValueChange={setCta} value={cta} defaultValue="none">
                    <SelectTrigger>
                        <SelectValue placeholder="Select CTA type (Book, Order, etc.)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {ctaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">CTA URL
                  <span className="ml-2 text-xs text-muted-foreground">رابط صفحة الحجز أو الطلب</span>
                </label>
                {/* الحقل الآن معطّل إذا لم يتم تحديد CTA */}
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." disabled={!cta || cta === 'none'} />
              </div>
            </div>

            {/* Schedule */}
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground">Schedule (optional)
                  <span className="ml-2 text-xs text-muted-foreground">حدد وقت النشر إذا رغبت</span>
                </label>
                <div className="flex gap-2">
                  <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                  <Button variant="outline" type="button" className="gap-2" disabled>
                    <Calendar className="w-4 h-4" /> Pick
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button onClick={handleSave} disabled={!locationId || !content.trim() || saving} className="gap-2 w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Save Post
              </Button>
              <Button variant="outline" type="button" className="gap-2 w-full sm:w-auto" onClick={handlePublish} disabled={saving}>
                <Timer className="w-4 h-4" /> Publish to Google
              </Button>
            </div>

            {/* Preview */}
            {(title || content) && (
              <div className="mt-6 border border-primary/20 rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-2">Preview</div>
                {title && <div className="font-semibold mb-1">{title}</div>}
                <div className="whitespace-pre-wrap text-sm">{content}</div>
                {cta && cta !== 'none' && ctaOptions.find(o => o.value === cta) && (
                    <Button size="sm" className="mt-3" variant="secondary" disabled={!ctaUrl}>
                        {ctaOptions.find(o => o.value === cta)?.label || 'CTA'}
                    </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

  {/* Recent Posts Card remains the same */}
  <Card className="border border-primary/20 glass mt-8">
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Your latest drafts and published posts</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No posts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p.id} className="border-t border-primary/10">
                        <td className="py-2 pr-4">{p.title || p.content?.slice(0, 50) || 'Untitled'}</td>
                        <td className="py-2 pr-4 capitalize">{p.status}</td>
                        <td className="py-2 pr-4">{new Date(p.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setTitle(p.title || '');
                              setContent(p.content || '');
                              setLocationId(p.location_id);
                              // تحميل CTA و CTA URL عند التعديل
                              setCta(p.call_to_action?.type || 'none');
                              setCtaUrl(p.call_to_action?.url || '');
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const r = await fetch(`/api/gmb/posts/delete?id=${encodeURIComponent(p.id)}`, {
                                method: 'DELETE',
                              });
                              if (r.ok) {
                                setPosts((s) => s.filter((x) => x.id !== p.id));
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Activity Feed backed by Supabase */}
        <div className="mt-8">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}