"use client";

import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { createClient } from "@/lib/supabase/client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import YouTubeComingSoon from "./coming-soon";

// Inline StatCard component
const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  index,
}: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p
          className={`text-xs ${changeType === "positive" ? "text-green-600" : "text-muted-foreground"}`}
        >
          {change}
        </p>
      )}
    </CardContent>
  </Card>
);
// Removed youtube-sidebar import - component deleted
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Globe,
  Hash,
  Image as ImageIcon,
  Info,
  Lightbulb,
  ListVideo,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Mic,
  Pencil,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tags,
  Target,
  ThumbsUp,
  Trash2,
  TrendingUp,
  TrendingUp as TrendingUpIcon,
  Unlock,
  Upload,
  Users,
  Video,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { toast } from "sonner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type YTStatistics = {
  subscriberCount?: string;
  viewCount?: string;
  videoCount?: string;
};
type YTMetadata = {
  email?: string | null;
  channel_title?: string | null;
  statistics?: YTStatistics | null;
};
type YTVideo = {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  publishedAt: string;
  url: string;
  status?: string;
};
type YTComment = {
  id: string;
  author: string;
  text: string;
  likes: number;
  publishedAt: string;
  videoUrl: string;
};
type YTAnalytics = {
  lastUpdated: string;
  months: string[];
  viewsPerMonth: number[];
  videosPerMonth: number[];
  totalViews: number;
  totalVideos: number;
};
type Draft = {
  id: string;
  title: string;
  description: string;
  hashtags: string;
  created_at: string;
};
type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: "published" | "scheduled" | "draft";
  thumbnail?: string;
};

// Video Categories
const videoCategories = [
  { value: "film", label: "Film & Animation" },
  { value: "autos", label: "Autos & Vehicles" },
  { value: "music", label: "Music" },
  { value: "pets", label: "Pets & Animals" },
  { value: "sports", label: "Sports" },
  { value: "travel", label: "Travel & Events" },
  { value: "gaming", label: "Gaming" },
  { value: "comedy", label: "Comedy" },
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "science", label: "Science & Technology" },
  { value: "howto", label: "Howto & Style" },
];

// Languages
const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];

// Feature flag: set NEXT_PUBLIC_DISABLE_YOUTUBE_DASHBOARD=0 to enable
const YT_ENABLED = process.env.NEXT_PUBLIC_DISABLE_YOUTUBE_DASHBOARD === "0";

export default function YoutubeDashboardPage() {
  // Gate before any hooks to satisfy React rules
  if (!YT_ENABLED) {
    return <YouTubeComingSoon />;
  }

  return <YoutubeDashboardContent />;
}

function YoutubeDashboardContent() {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [channelEmail, setChannelEmail] = useState<string | null>(null);
  const [stats, setStats] = useState({ subs: 0, views: 0, videos: 0 });
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [analytics, setAnalytics] = useState<YTAnalytics | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    "select" | "details" | "processing" | "complete"
  >("select");
  const [isDragging, setIsDragging] = useState(false);

  // Video details
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [videoCategory, setVideoCategory] = useState("");
  const [videoLanguage, setVideoLanguage] = useState("en");
  const [videoPrivacy, setVideoPrivacy] = useState<
    "public" | "unlisted" | "private"
  >("public");
  const [allowComments, setAllowComments] = useState(true);
  const [allowEmbedding, setAllowEmbedding] = useState(true);
  const [ageRestriction, setAgeRestriction] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  // AI Tools state
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [generatedSeoTitle, setGeneratedSeoTitle] = useState("");
  const [descPrompt, setDescPrompt] = useState("");
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [tagPrompt, setTagPrompt] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [hashtagPrompt, setHashtagPrompt] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);

  // Content Ideas state
  const [contentIdeasPrompt, setContentIdeasPrompt] = useState("");
  const [contentIdeasCategory, setContentIdeasCategory] = useState("all");
  const [contentIdeasLoading, setContentIdeasLoading] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<
    Array<{ id: string; idea: string; category: string; created_at: string }>
  >([]);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Video Analytics state
  const [selectedVideoForAnalytics, setSelectedVideoForAnalytics] = useState<
    string | null
  >(null);
  const [videoAnalyticsFilter, setVideoAnalyticsFilter] = useState<
    "all" | "top" | "recent"
  >("all");

  // Comments state
  const [commentSearch, setCommentSearch] = useState("");
  const [commentFilter, setCommentFilter] = useState<
    "all" | "recent" | "mostLiked"
  >("all");
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<
    string | null
  >(null);

  // Video Manager state
  const [videoSearch, setVideoSearch] = useState("");
  const [videoFilter, setVideoFilter] = useState<
    "all" | "published" | "scheduled" | "draft"
  >("all");
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [videoPage, setVideoPage] = useState(1);
  const videosPerPage = 10;

  // Refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Composer state
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<
    "neutral" | "friendly" | "professional" | "energetic"
  >("neutral");
  const [genLoading, setGenLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [schedule, setSchedule] = useState("");
  const [saving, setSaving] = useState(false);

  // Safe fetch helpers
  const safeGet = async (url: string) => {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const t = await r.text();
    let j: any = {};
    try {
      j = JSON.parse(t);
    } catch {}
    if (!r.ok)
      throw new Error(j.error || t.slice(0, 300) || `GET ${url} failed`);
    return j;
  };

  const safePost = async (url: string, body?: any) => {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    let j: any = {};
    try {
      j = JSON.parse(t);
    } catch {}
    if (!r.ok)
      throw new Error(j.error || t.slice(0, 300) || `POST ${url} failed`);
    return j;
  };

  const safeDelete = async (url: string) => {
    const r = await fetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const t = await r.text();
    let j: any = {};
    try {
      j = JSON.parse(t);
    } catch {}
    if (!r.ok)
      throw new Error(j.error || t.slice(0, 300) || `DELETE ${url} failed`);
    return j;
  };

  // Data loaders
  const fetchFromDB = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please login first");
    const { data, error: qErr } = await supabase
      .from("oauth_tokens")
      .select("provider, account_id, metadata")
      .eq("user_id", user.id)
      .eq("provider", "youtube")
      .maybeSingle();
    if (qErr) throw qErr;
    if (!data) {
      setChannelTitle(null);
      setChannelEmail(null);
      setStats({ subs: 0, views: 0, videos: 0 });
      setVideos([]);
      setComments([]);
      setAnalytics(null);
      return false;
    }
    const meta = (data.metadata || {}) as YTMetadata;
    const s = meta.statistics || {};
    setChannelTitle(meta.channel_title || "YouTube Channel");
    setChannelEmail(meta.email || null);
    setStats({
      subs: Number(s.subscriberCount || 0),
      views: Number(s.viewCount || 0),
      videos: Number(s.videoCount || 0),
    });
    return true;
  };

  const fetchVideos = async () => {
    try {
      const j = await safeGet("/api/youtube/videos");
      if (j.error && j.code === "INSUFFICIENT_SCOPES") {
        toast.error(
          "Please reconnect your YouTube account. The current connection doesn't have the required permissions.",
        );
        setVideos([]);
        setCalendarEvents([]);
        return;
      }
      const items = j.items || [];
      setVideos(items);
      // Generate calendar events from videos
      const events = items.map((v: YTVideo) => ({
        id: v.id,
        title: v.title,
        date: new Date(v.publishedAt),
        type: "published" as const,
        thumbnail: v.thumbnail,
      }));
      setCalendarEvents(events);
    } catch (e: any) {
      if (e.message?.includes("insufficient") || e.message?.includes("scope")) {
        toast.error(
          "Your YouTube connection needs to be updated. Please disconnect and reconnect your account.",
        );
      }
      setVideos([]);
      setCalendarEvents([]);
    }
  };

  const fetchComments = async () => {
    try {
      const j = await safeGet("/api/youtube/comments");
      if (j.error && j.code === "INSUFFICIENT_SCOPES") {
        toast.error(
          "Please reconnect your YouTube account to access comments. The current connection doesn't have the required permissions.",
        );
        // Optionally disconnect to force reconnection
        return;
      }
      setComments(j.items || []);
    } catch (e: any) {
      if (e.message?.includes("insufficient") || e.message?.includes("scope")) {
        toast.error(
          "Your YouTube connection needs to be updated. Please disconnect and reconnect your account.",
        );
      }
      setComments([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const j = await safeGet("/api/youtube/analytics");
      if (j.error && j.code === "INSUFFICIENT_SCOPES") {
        toast.error(
          "Please reconnect your YouTube account to access analytics.",
        );
        return;
      }
      setAnalytics(j as YTAnalytics);
    } catch (e: any) {
      if (e.message?.includes("insufficient") || e.message?.includes("scope")) {
        toast.error(
          "Your YouTube connection needs to be updated. Please disconnect and reconnect your account.",
        );
      }
      setAnalytics(null);
    }
  };

  const fetchDrafts = async () => {
    const j = await safeGet("/api/youtube/composer/drafts");
    setDrafts(j.items || []);
  };

  // Actions
  const handleConnectYoutube = async () => {
    try {
      setConnecting(true);
      const data = await safePost("/api/youtube/create-auth-url", {});
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (e: any) {
      toast.error(e.message || "Failed to start YouTube connection");
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await safePost("/api/youtube/token/refresh-if-needed");
      await safePost("/api/youtube/refresh");
      await Promise.all([
        fetchFromDB(),
        fetchVideos(),
        fetchComments(),
        fetchAnalytics(),
        fetchDrafts(),
      ]);
      toast.success("Data refreshed successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect YouTube?")) return;
    try {
      setDisconnecting(true);
      await safePost("/api/youtube/disconnect");
      setChannelTitle(null);
      setChannelEmail(null);
      setStats({ subs: 0, views: 0, videos: 0 });
      setVideos([]);
      setComments([]);
      setAnalytics(null);
      setDrafts([]);
      toast.success("YouTube disconnected successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to disconnect YouTube");
    } finally {
      setDisconnecting(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  // Upload handlers
  const handleVideoSelect = (file: File) => {
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      setUploadStage("details");
      setUploadProgress(25);
    } else {
      toast.error("Please select a valid video file");
    }
  };

  const handleThumbnailSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setThumbnailFile(file);
    } else {
      toast.error("Please select a valid image file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleVideoSelect(files[0]);
    }
  };

  const handleAddTag = () => {
    if (currentTag && videoTags.length < 30) {
      setVideoTags([...videoTags, currentTag]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setVideoTags(videoTags.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    // Validation
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }

    if (!videoTitle.trim()) {
      toast.error("Video title is required");
      return;
    }

    if (!videoDescription.trim()) {
      toast.error("Video description is required");
      return;
    }

    setUploadStage("processing");
    setUploadProgress(10);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("title", videoTitle);
      formData.append("description", videoDescription);
      formData.append("tags", JSON.stringify(videoTags));
      formData.append("category", videoCategory);
      formData.append("language", videoLanguage);
      formData.append("privacy", videoPrivacy);
      formData.append("allowComments", String(allowComments));
      formData.append("allowEmbedding", String(allowEmbedding));
      formData.append("ageRestriction", String(ageRestriction));
      if (scheduleDate) {
        formData.append("scheduledAt", scheduleDate);
      }
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      // Upload video with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 90) + 10; // 10-100%
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress(100);
          setUploadStage("complete");
          toast.success("Video uploaded successfully!");

          // Refresh videos list and show in Manager
          try {
            await Promise.all([fetchVideos(), fetchFromDB()]);
            // Switch to Manager tab to see the uploaded video
            setTimeout(() => {
              setActiveTab("manager");
            }, 1000);
          } catch (refreshError) {
            console.error("Failed to refresh videos:", refreshError);
            // Still switch to manager even if refresh fails
            setTimeout(() => {
              setActiveTab("manager");
            }, 1000);
          }
        } else {
          const error = JSON.parse(xhr.responseText || "{}");
          throw new Error(error.error || "Upload failed");
        }
      });

      xhr.addEventListener("error", () => {
        throw new Error("Network error during upload");
      });

      xhr.open("POST", "/api/youtube/videos/upload");
      xhr.send(formData);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload video");
      setUploadStage("details");
      setUploadProgress(0);
    }
  };

  // AI Generation handlers
  const generateScript = async () => {
    if (!scriptPrompt.trim()) return;
    setGenLoading(true);
    try {
      const res = await safePost("/api/youtube/composer/generate", {
        prompt: scriptPrompt,
        tone: "professional",
      });
      setGeneratedScript(res.description || "Script generated successfully");
      toast.success("Script generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate script");
    } finally {
      setGenLoading(false);
    }
  };

  const generateSEOTitle = async () => {
    if (!seoTitle.trim()) return;
    setGenLoading(true);
    try {
      const res = await safePost("/api/youtube/composer/generate", {
        prompt: `Generate an SEO-optimized YouTube title for: ${seoTitle}`,
        tone: "neutral",
      });
      setGeneratedSeoTitle(res.title || "SEO Optimized Title");
      toast.success("SEO title generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate SEO title");
    } finally {
      setGenLoading(false);
    }
  };

  const generateDescription = async () => {
    if (!descPrompt.trim()) return;
    setGenLoading(true);
    try {
      const res = await safePost("/api/youtube/composer/generate", {
        prompt: `Generate a YouTube video description for: ${descPrompt}`,
        tone: "professional",
      });
      setGeneratedDesc(res.description || "Description generated");
      toast.success("Description generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate description");
    } finally {
      setGenLoading(false);
    }
  };

  const generateTags = async () => {
    if (!tagPrompt.trim()) return;
    setGenLoading(true);
    try {
      const res = await safePost("/api/youtube/composer/generate", {
        prompt: `Generate YouTube tags for: ${tagPrompt}`,
        tone: "neutral",
      });
      const tagsStr = res.hashtags || "";
      const tagsArray = tagsStr
        .split(",")
        .map((t: string) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      setGeneratedTags(
        tagsArray.length > 0 ? tagsArray : ["youtube", "video", "content"],
      );
      toast.success("Tags generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate tags");
    } finally {
      setGenLoading(false);
    }
  };

  const generateHashtags = async () => {
    if (!hashtagPrompt.trim()) return;
    setGenLoading(true);
    try {
      const res = await safePost("/api/youtube/composer/generate", {
        prompt: `Generate YouTube hashtags for: ${hashtagPrompt}`,
        tone: "energetic",
      });
      const hashtagsStr = res.hashtags || "";
      const hashtagsArray = hashtagsStr
        .split(",")
        .map((h: string) =>
          h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`,
        )
        .filter(Boolean);
      setGeneratedHashtags(
        hashtagsArray.length > 0 ? hashtagsArray : ["#YouTube", "#Content"],
      );
      toast.success("Hashtags generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate hashtags");
    } finally {
      setGenLoading(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return calendarEvents.filter(
      (event) => event.date.toDateString() === date.toDateString(),
    );
  };

  // Init
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/auth/login");
          return;
        }

        setUser(authUser);
        await safePost("/api/youtube/token/refresh-if-needed");
        const has = await fetchFromDB();
        if (has) {
          await Promise.all([
            fetchVideos(),
            fetchComments(),
            fetchAnalytics(),
            fetchDrafts(),
          ]);
          // Load saved ideas
          try {
            const res = await safeGet("/api/youtube/composer/drafts");
            const drafts = res.items || [];
            const ideas = drafts
              .filter((d: any) => d.description?.includes("Content idea:"))
              .map((d: any) => ({
                id: d.id,
                idea:
                  d.title || d.description?.replace("Content idea: ", "") || "",
                category: "all",
                created_at: d.created_at,
              }));
            setSavedIdeas(ideas);
          } catch (e) {
            // Silent fail for saved ideas
          }
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load channel data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtered comments
  const filteredComments = useMemo(() => {
    let filtered = [...comments];

    // Filter by video
    if (selectedVideoForComments) {
      filtered = filtered.filter(
        (c) => c.videoUrl === selectedVideoForComments,
      );
    }

    // Filter by search
    if (commentSearch) {
      const searchLower = commentSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.author.toLowerCase().includes(searchLower) ||
          c.text.toLowerCase().includes(searchLower),
      );
    }

    // Filter by type
    if (commentFilter === "recent") {
      filtered.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } else if (commentFilter === "mostLiked") {
      filtered.sort((a, b) => b.likes - a.likes);
    }

    return filtered;
  }, [comments, selectedVideoForComments, commentSearch, commentFilter]);

  // Filtered videos for manager
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const matchesSearch =
        !videoSearch ||
        v.title.toLowerCase().includes(videoSearch.toLowerCase());
      const matchesFilter = videoFilter === "all" || v.status === videoFilter;
      return matchesSearch && matchesFilter;
    });
  }, [videos, videoSearch, videoFilter]);

  const paginatedVideos = useMemo(() => {
    const start = (videoPage - 1) * videosPerPage;
    return filteredVideos.slice(start, start + videosPerPage);
  }, [filteredVideos, videoPage]);

  const totalVideoPages = Math.ceil(filteredVideos.length / videosPerPage);

  // Chart data
  const viewsChartData = useMemo(() => {
    if (!analytics) return null;
    const labels = analytics.months.map((m: string) => m.slice(0, 7));
    return {
      labels,
      datasets: [
        {
          label: "Views",
          data: analytics.viewsPerMonth,
          borderColor: "#FF6B00",
          backgroundColor: "rgba(255,107,0,0.15)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: "#FF6B00",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [analytics]);

  const performanceChartData = useMemo(() => {
    if (!videos.length) return null;
    return {
      labels: ["Views", "Comments", "Likes"],
      datasets: [
        {
          data: [
            videos.reduce((sum, v) => sum + v.views, 0),
            comments.length * 100,
            videos.length * 500,
          ],
          backgroundColor: ["#FF6B00", "#FF8C00", "#FFD700"],
          borderColor: ["#FF6B00", "#FF8C00", "#FFD700"],
          borderWidth: 1,
        },
      ],
    };
  }, [videos, comments]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#888",
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#FF6B00",
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,107,0,0.05)" },
        ticks: { color: "#888" },
      },
      y: {
        grid: { color: "rgba(255,107,0,0.05)" },
        ticks: { color: "#888" },
      },
    },
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Removed (component deleted) */}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[240px] transition-all duration-300">
        {/* Header Bar */}
        <header className="sticky top-0 z-20 glass-header border-b border-primary/30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-1">
                <h1 className="text-2xl font-bold gradient-text-orange">
                  YouTube Studio
                </h1>
              </div>

              {/* Right side - Notifications and Refresh */}
              <div className="flex items-center gap-3">
                {channelTitle && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="hover:bg-primary hover:text-white transition-colors"
                  >
                    <RefreshCw
                      className={cn("h-5 w-5", refreshing && "animate-spin")}
                    />
                  </Button>
                )}

                <Popover
                  open={notificationsOpen}
                  onOpenChange={setNotificationsOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-primary hover:text-white transition-colors"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 md:w-96 p-0 glass-strong border-primary/30"
                    align="end"
                  >
                    <div className="border-b border-primary/20 p-4 flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {unreadCount} unread
                        </Badge>
                      )}
                    </div>
                    <ScrollArea className="h-[400px]">
                      {notificationsLoading ? (
                        <div className="p-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-primary/10">
                          {notifications.map((notif: any) => (
                            <div
                              key={notif.id}
                              onClick={() =>
                                !notif.read && markNotificationAsRead(notif.id)
                              }
                              className={cn(
                                "p-4 hover:bg-primary/5 transition-colors cursor-pointer",
                                !notif.read &&
                                  "bg-primary/5 border-l-2 border-primary",
                              )}
                            >
                              <div className="flex gap-3">
                                <div className="mt-1">
                                  {notif.type === "success" && (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                  {notif.type === "error" && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  )}
                                  {notif.type === "info" && (
                                    <Info className="h-4 w-4 text-blue-500" />
                                  )}
                                  {!notif.type && (
                                    <Bell className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                    {new Date(
                                      notif.created_at,
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-6">
              <LoadingSkeleton type="stat" count={4} />
              <LoadingSkeleton type="card" count={2} />
            </div>
          ) : !channelTitle ? (
            <Card className="glass-strong border-primary/30 shadow-xl">
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center glow-orange">
                    <Youtube className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold gradient-text-orange">
                      No YouTube Channel Connected
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Connect your YouTube channel to unlock powerful analytics,
                      content management, and AI-powered tools.
                    </p>
                  </div>
                  <Button
                    onClick={handleConnectYoutube}
                    disabled={connecting}
                    size="lg"
                    className="mt-4 gap-2 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white shadow-lg hover-glow"
                  >
                    {connecting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Youtube className="h-5 w-5" />
                    )}
                    {connecting ? "Connecting..." : "Connect YouTube Channel"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Content based on activeTab from Sidebar */}
              {/* Overview */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid gap-6 md:grid-cols-4">
                    <StatCard
                      title="Subscribers"
                      value={stats.subs.toLocaleString()}
                      icon={Users}
                      change={channelTitle ? "Active" : "Inactive"}
                      changeType={channelTitle ? "positive" : "neutral"}
                      index={0}
                    />
                    <StatCard
                      title="Total Views"
                      value={stats.views.toLocaleString()}
                      icon={Eye}
                      change="+12% from last month"
                      changeType="positive"
                      index={1}
                    />
                    <StatCard
                      title="Total Videos"
                      value={stats.videos.toLocaleString()}
                      icon={Video}
                      change="2 new this week"
                      changeType="positive"
                      index={2}
                    />
                    <StatCard
                      title="Channel Status"
                      value={channelTitle ? "Connected" : "Not Connected"}
                      icon={Youtube}
                      change={channelEmail || ""}
                      changeType={channelTitle ? "positive" : "neutral"}
                      index={3}
                    />
                  </div>

                  {/* Recent Videos & Performance */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Videos */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <Film className="w-5 h-5 text-primary" />
                          Recent Videos Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-3">
                            {videos.slice(0, 5).map((video) => (
                              <div
                                key={video.id}
                                className="flex gap-3 p-3 rounded-lg glass hover:bg-primary/10 transition-colors"
                              >
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-24 h-14 object-cover rounded"
                                />
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium line-clamp-1">
                                    {video.title}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      {video.views.toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(
                                        video.publishedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="hover:bg-primary hover:text-white"
                                >
                                  <a
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Performance Chart */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Channel Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="h-[300px]">
                          {performanceChartData ? (
                            <Doughnut
                              data={performanceChartData}
                              options={{
                                ...chartOptions,
                                maintainAspectRatio: false,
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              No data available
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card className="glass-strong border-primary/30 shadow-xl">
                    <CardHeader className="border-b border-primary/20">
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Button
                          variant="outline"
                          className="h-auto p-4 flex flex-col gap-2 hover:bg-primary hover:text-white transition-all hover-lift"
                          onClick={() => setActiveTab("composer")}
                        >
                          <Upload className="h-6 w-6" />
                          <span className="text-sm font-medium">
                            Upload Video
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto p-4 flex flex-col gap-2 hover:bg-primary hover:text-white transition-all hover-lift"
                          onClick={() => setActiveTab("ai-tools")}
                        >
                          <Sparkles className="h-6 w-6" />
                          <span className="text-sm font-medium">AI Tools</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto p-4 flex flex-col gap-2 hover:bg-primary hover:text-white transition-all hover-lift"
                          onClick={() => setActiveTab("analytics")}
                        >
                          <BarChart3 className="h-6 w-6" />
                          <span className="text-sm font-medium">Analytics</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto p-4 flex flex-col gap-2 hover:bg-primary hover:text-white transition-all hover-lift"
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                        >
                          <LogOut className="h-6 w-6" />
                          <span className="text-sm font-medium">
                            Disconnect
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Composer */}
              {activeTab === "composer" && (
                <div className="space-y-6">
                  <Card className="glass-strong border-primary/30 shadow-xl">
                    <CardHeader className="border-b border-primary/20">
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Upload className="w-6 h-6 text-primary" />
                        Upload Video
                      </CardTitle>
                      <CardDescription>
                        Upload your video with professional settings and
                        AI-powered optimization
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/* Upload Progress Indicator */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                          {["Select", "Details", "Processing", "Complete"].map(
                            (stage, index) => (
                              <div
                                key={stage}
                                className={cn(
                                  "flex items-center",
                                  index <
                                    [
                                      "select",
                                      "details",
                                      "processing",
                                      "complete",
                                    ].indexOf(uploadStage) && "text-primary",
                                  index ===
                                    [
                                      "select",
                                      "details",
                                      "processing",
                                      "complete",
                                    ].indexOf(uploadStage) &&
                                    "text-primary font-semibold",
                                  index >
                                    [
                                      "select",
                                      "details",
                                      "processing",
                                      "complete",
                                    ].indexOf(uploadStage) &&
                                    "text-muted-foreground",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2",
                                    index <=
                                      [
                                        "select",
                                        "details",
                                        "processing",
                                        "complete",
                                      ].indexOf(uploadStage)
                                      ? "border-primary bg-primary text-white"
                                      : "border-muted-foreground",
                                  )}
                                >
                                  {index <
                                  [
                                    "select",
                                    "details",
                                    "processing",
                                    "complete",
                                  ].indexOf(uploadStage) ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <span className="ml-2 text-sm hidden sm:inline">
                                  {stage}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-orange-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Upload Stages */}
                      {uploadStage === "select" && (
                        <div className="space-y-6">
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                              "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200",
                              isDragging
                                ? "border-primary bg-primary/10 glow-orange"
                                : "border-primary/30 hover:border-primary/50 glass",
                            )}
                          >
                            <input
                              ref={videoInputRef}
                              type="file"
                              accept="video/*"
                              onChange={(e) =>
                                e.target.files?.[0] &&
                                handleVideoSelect(e.target.files[0])
                              }
                              className="hidden"
                            />
                            <Film className="w-16 h-16 mx-auto mb-4 text-primary" />
                            <h3 className="text-xl font-semibold mb-2">
                              Drag and drop your video
                            </h3>
                            <p className="text-muted-foreground mb-4">or</p>
                            <Button
                              onClick={() => videoInputRef.current?.click()}
                              className="bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white"
                            >
                              Select File
                            </Button>
                            <p className="text-sm text-muted-foreground mt-4">
                              Supported formats: MP4, AVI, MOV, WMV • Max size:
                              128GB
                            </p>
                          </div>
                        </div>
                      )}

                      {uploadStage === "details" && (
                        <div className="space-y-6">
                          {/* Video Details Form */}
                          <div className="grid gap-6 lg:grid-cols-2">
                            {/* Left Column */}
                            <div className="space-y-6">
                              <div>
                                <label className="text-sm font-medium text-primary">
                                  Title (100 chars)
                                </label>
                                <div className="relative mt-2">
                                  <Input
                                    value={videoTitle}
                                    onChange={(e) =>
                                      setVideoTitle(
                                        e.target.value.slice(0, 100),
                                      )
                                    }
                                    placeholder="Enter video title"
                                    className="border-primary/30 focus:border-primary glass"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    {videoTitle.length}/100
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-primary">
                                  Description (5000 chars)
                                </label>
                                <div className="relative mt-2">
                                  <Textarea
                                    value={videoDescription}
                                    onChange={(e) =>
                                      setVideoDescription(
                                        e.target.value.slice(0, 5000),
                                      )
                                    }
                                    placeholder="Enter video description"
                                    rows={6}
                                    className="resize-none border-primary/30 focus:border-primary glass"
                                  />
                                  <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                                    {videoDescription.length}/5000
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-primary">
                                  Tags (up to 30)
                                </label>
                                <div className="mt-2 space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      value={currentTag}
                                      onChange={(e) =>
                                        setCurrentTag(e.target.value)
                                      }
                                      placeholder="Add a tag"
                                      onKeyPress={(e) =>
                                        e.key === "Enter" &&
                                        (e.preventDefault(), handleAddTag())
                                      }
                                      className="border-primary/30 focus:border-primary glass"
                                    />
                                    <Button
                                      onClick={handleAddTag}
                                      disabled={
                                        !currentTag || videoTags.length >= 30
                                      }
                                      variant="outline"
                                      className="hover:bg-primary hover:text-white"
                                    >
                                      <PlusCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {videoTags.map((tag, index) => (
                                      <Badge
                                        key={index}
                                        variant="outline"
                                        className="border-primary text-primary"
                                      >
                                        {tag}
                                        <button
                                          onClick={() => handleRemoveTag(index)}
                                          className="ml-2 hover:text-white"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                              <div>
                                <label className="text-sm font-medium text-primary">
                                  Thumbnail
                                </label>
                                <div
                                  className="mt-2 border-2 border-dashed border-primary/30 rounded-lg p-4 text-center glass hover:border-primary/50 transition-colors cursor-pointer"
                                  onClick={() =>
                                    thumbnailInputRef.current?.click()
                                  }
                                >
                                  <input
                                    ref={thumbnailInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                      e.target.files?.[0] &&
                                      handleThumbnailSelect(e.target.files[0])
                                    }
                                    className="hidden"
                                  />
                                  {thumbnailFile ? (
                                    <div className="relative">
                                      <img
                                        src={URL.createObjectURL(thumbnailFile)}
                                        alt="Thumbnail"
                                        className="max-h-32 mx-auto rounded"
                                      />
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-0 right-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setThumbnailFile(null);
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
                                      <p className="text-sm text-muted-foreground">
                                        Click to upload thumbnail
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-primary">
                                    Category
                                  </label>
                                  <Select
                                    value={videoCategory}
                                    onValueChange={setVideoCategory}
                                  >
                                    <SelectTrigger className="mt-2 border-primary/30 glass">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {videoCategories.map((cat) => (
                                        <SelectItem
                                          key={cat.value}
                                          value={cat.value}
                                        >
                                          {cat.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="text-sm font-medium text-primary">
                                    Language
                                  </label>
                                  <Select
                                    value={videoLanguage}
                                    onValueChange={setVideoLanguage}
                                  >
                                    <SelectTrigger className="mt-2 border-primary/30 glass">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {languages.map((lang) => (
                                        <SelectItem
                                          key={lang.value}
                                          value={lang.value}
                                        >
                                          {lang.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-primary mb-3 block">
                                  Privacy Settings
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                  {[
                                    {
                                      value: "public",
                                      label: "Public",
                                      icon: Globe,
                                    },
                                    {
                                      value: "unlisted",
                                      label: "Unlisted",
                                      icon: Unlock,
                                    },
                                    {
                                      value: "private",
                                      label: "Private",
                                      icon: Lock,
                                    },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={() =>
                                        setVideoPrivacy(option.value as any)
                                      }
                                      className={cn(
                                        "p-3 rounded-lg border-2 transition-all duration-200",
                                        videoPrivacy === option.value
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-primary/20 hover:border-primary/50 glass",
                                      )}
                                    >
                                      <option.icon className="w-5 h-5 mx-auto mb-1" />
                                      <span className="text-xs">
                                        {option.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-primary mb-3 block">
                                  Advanced Settings
                                </label>
                                <div className="space-y-3">
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={allowComments}
                                      onChange={(e) =>
                                        setAllowComments(e.target.checked)
                                      }
                                      className="rounded border-primary/50 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">
                                      Allow comments
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={allowEmbedding}
                                      onChange={(e) =>
                                        setAllowEmbedding(e.target.checked)
                                      }
                                      className="rounded border-primary/50 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">
                                      Allow embedding
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={ageRestriction}
                                      onChange={(e) =>
                                        setAgeRestriction(e.target.checked)
                                      }
                                      className="rounded border-primary/50 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">
                                      Age restriction (18+)
                                    </span>
                                  </label>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-primary">
                                  Schedule for later
                                </label>
                                <Input
                                  type="datetime-local"
                                  value={scheduleDate}
                                  onChange={(e) =>
                                    setScheduleDate(e.target.value)
                                  }
                                  className="mt-2 border-primary/30 focus:border-primary glass"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex justify-between pt-6 border-t border-primary/20">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setUploadStage("select");
                                setUploadProgress(0);
                              }}
                              className="hover:bg-primary hover:text-white"
                            >
                              <ChevronLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                            <Button
                              onClick={handleUpload}
                              className="bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white shadow-lg hover-glow"
                            >
                              Upload Video
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {uploadStage === "processing" && (
                        <div className="text-center py-12">
                          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
                          <h3 className="text-xl font-semibold mb-2">
                            Processing Video...
                          </h3>
                          <p className="text-muted-foreground">
                            This may take a few minutes depending on your video
                            size
                          </p>
                          <div className="mt-6 max-w-xs mx-auto">
                            <div className="text-2xl font-bold text-primary">
                              {uploadProgress}%
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadStage === "complete" && (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">
                            Upload Complete!
                          </h3>
                          <p className="text-muted-foreground mb-6">
                            Your video has been successfully uploaded to YouTube
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setUploadStage("select");
                                setUploadProgress(0);
                                setVideoFile(null);
                                setVideoTitle("");
                                setVideoDescription("");
                                setVideoTags([]);
                              }}
                              className="hover:bg-primary hover:text-white"
                            >
                              Upload Another
                            </Button>
                            <Button
                              onClick={() => setActiveTab("manager")}
                              className="bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white"
                            >
                              View Videos
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Calendar */}
              {activeTab === "calendar" && (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Calendar */}
                    <Card className="lg:col-span-2 glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-primary" />
                            Content Calendar
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setCalendarMonth(
                                  new Date(
                                    calendarMonth.getFullYear(),
                                    calendarMonth.getMonth() - 1,
                                  ),
                                )
                              }
                              className="hover:bg-primary hover:text-white"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium">
                              {calendarMonth.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setCalendarMonth(
                                  new Date(
                                    calendarMonth.getFullYear(),
                                    calendarMonth.getMonth() + 1,
                                  ),
                                )
                              }
                              className="hover:bg-primary hover:text-white"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-7 gap-1">
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((day) => (
                            <div
                              key={day}
                              className="text-center text-sm font-medium text-muted-foreground p-2"
                            >
                              {day}
                            </div>
                          ))}
                          {getDaysInMonth(calendarMonth).map((date, index) => (
                            <div
                              key={index}
                              onClick={() => date && setSelectedDate(date)}
                              className={cn(
                                "min-h-[80px] p-2 border rounded-lg transition-all cursor-pointer",
                                date ? "hover:bg-primary/10 glass" : "",
                                date &&
                                  selectedDate?.toDateString() ===
                                    date.toDateString() &&
                                  "bg-primary/10 border-primary",
                                !date && "invisible",
                              )}
                            >
                              {date && (
                                <>
                                  <div className="text-sm font-medium mb-1">
                                    {date.getDate()}
                                  </div>
                                  <div className="space-y-1">
                                    {getEventsForDate(date)
                                      .slice(0, 2)
                                      .map((event) => (
                                        <div
                                          key={event.id}
                                          className={cn(
                                            "text-xs p-1 rounded truncate",
                                            event.type === "published" &&
                                              "bg-green-500/20 text-green-500",
                                            event.type === "scheduled" &&
                                              "bg-yellow-500/20 text-yellow-500",
                                            event.type === "draft" &&
                                              "bg-gray-500/20 text-gray-500",
                                          )}
                                        >
                                          {event.title}
                                        </div>
                                      ))}
                                    {getEventsForDate(date).length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{getEventsForDate(date).length - 2}{" "}
                                        more
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Draft Videos Sidebar */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          Draft Videos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-3">
                            {drafts.map((draft) => (
                              <div
                                key={draft.id}
                                className="p-3 rounded-lg glass hover:bg-primary/10 transition-colors cursor-pointer"
                                draggable
                              >
                                <h4 className="text-sm font-medium line-clamp-1">
                                  {draft.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {draft.description}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      draft.created_at,
                                    ).toLocaleDateString()}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                    >
                                      <Calendar className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {drafts.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No drafts yet</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Legend */}
                  <Card className="glass-strong border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-6 text-sm">
                        <span className="font-medium">Legend:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500/20 rounded" />
                          <span>Published</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500/20 rounded" />
                          <span>Scheduled</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-500/20 rounded" />
                          <span>Draft</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Manager */}
              {activeTab === "manager" && (
                <div className="space-y-6">
                  <Card className="glass-strong border-primary/30 shadow-xl">
                    <CardHeader className="border-b border-primary/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <ListVideo className="w-5 h-5 text-primary" />
                          Video Manager
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={selectedVideos.length === 0}
                            className="hover:bg-primary hover:text-white"
                          >
                            Bulk Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={selectedVideos.length === 0}
                            className="hover:bg-destructive hover:text-white"
                          >
                            Delete Selected
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/* Filters */}
                      <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search videos..."
                            value={videoSearch}
                            onChange={(e) => setVideoSearch(e.target.value)}
                            className="pl-10 border-primary/30 focus:border-primary glass"
                          />
                        </div>
                        <Select
                          value={videoFilter}
                          onValueChange={(value: any) => setVideoFilter(value)}
                        >
                          <SelectTrigger className="w-full sm:w-48 border-primary/30 glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Videos</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="draft">Drafts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Video List */}
                      <div className="space-y-3">
                        {paginatedVideos.map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center gap-4 p-4 rounded-lg glass hover:bg-primary/10 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedVideos.includes(video.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVideos([
                                    ...selectedVideos,
                                    video.id,
                                  ]);
                                } else {
                                  setSelectedVideos(
                                    selectedVideos.filter(
                                      (id) => id !== video.id,
                                    ),
                                  );
                                }
                              }}
                              className="rounded border-primary/50 text-primary focus:ring-primary"
                            />
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-32 h-20 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium line-clamp-1">
                                {video.title}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {video.views.toLocaleString()} views
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(
                                    video.publishedAt,
                                  ).toLocaleDateString()}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    video.status === "published" &&
                                      "border-green-500 text-green-500",
                                    video.status === "scheduled" &&
                                      "border-yellow-500 text-yellow-500",
                                    video.status === "draft" &&
                                      "border-gray-500 text-gray-500",
                                  )}
                                >
                                  {video.status || "published"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-primary hover:text-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-destructive hover:text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalVideoPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6 pt-6 border-t border-primary/20">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setVideoPage(Math.max(1, videoPage - 1))
                            }
                            disabled={videoPage === 1}
                            className="hover:bg-primary hover:text-white"
                          >
                            Previous
                          </Button>
                          <span className="flex items-center px-3 text-sm">
                            Page {videoPage} of {totalVideoPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setVideoPage(
                                Math.min(totalVideoPages, videoPage + 1),
                              )
                            }
                            disabled={videoPage === totalVideoPages}
                            className="hover:bg-primary hover:text-white"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Tools */}
              {activeTab === "ai-tools" && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {/* Video Script Generator */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <Pencil className="w-5 h-5 text-primary" />
                          Video Script Generator
                        </CardTitle>
                        <CardDescription>
                          Generate professional video scripts with AI
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <Textarea
                            value={scriptPrompt}
                            onChange={(e) => setScriptPrompt(e.target.value)}
                            placeholder="Describe your video topic and key points..."
                            rows={4}
                            className="resize-none border-primary/30 focus:border-primary glass"
                          />
                          <Button
                            onClick={generateScript}
                            disabled={!scriptPrompt || genLoading}
                            className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white"
                          >
                            {genLoading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Generate Script
                          </Button>
                          {generatedScript && (
                            <div className="p-4 rounded-lg glass border border-primary/20">
                              <p className="whitespace-pre-wrap">
                                {generatedScript}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 hover:bg-primary hover:text-white"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    generatedScript,
                                  );
                                  toast.success("Script copied!");
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Script
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Two column layout for remaining tools */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* SEO Title Generator */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            SEO Title Generator
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <Input
                              value={seoTitle}
                              onChange={(e) => setSeoTitle(e.target.value)}
                              placeholder="Enter topic or keywords..."
                              className="border-primary/30 focus:border-primary glass"
                            />
                            <Button
                              onClick={generateSEOTitle}
                              disabled={!seoTitle || genLoading}
                              className="w-full hover:bg-primary hover:text-white"
                              variant="outline"
                            >
                              Generate SEO Title
                            </Button>
                            {generatedSeoTitle && (
                              <div className="p-3 rounded-lg glass border border-primary/20">
                                <p className="text-sm">{generatedSeoTitle}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Description Generator */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Description Generator
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <Input
                              value={descPrompt}
                              onChange={(e) => setDescPrompt(e.target.value)}
                              placeholder="Video topic..."
                              className="border-primary/30 focus:border-primary glass"
                            />
                            <Button
                              onClick={generateDescription}
                              disabled={!descPrompt || genLoading}
                              className="w-full hover:bg-primary hover:text-white"
                              variant="outline"
                            >
                              Generate Description
                            </Button>
                            {generatedDesc && (
                              <div className="p-3 rounded-lg glass border border-primary/20">
                                <p className="text-sm">{generatedDesc}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tags Generator */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <Tags className="w-5 h-5 text-primary" />
                            Tags Generator
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <Input
                              value={tagPrompt}
                              onChange={(e) => setTagPrompt(e.target.value)}
                              placeholder="Video topic..."
                              className="border-primary/30 focus:border-primary glass"
                            />
                            <Button
                              onClick={generateTags}
                              disabled={!tagPrompt || genLoading}
                              className="w-full hover:bg-primary hover:text-white"
                              variant="outline"
                            >
                              Generate Tags
                            </Button>
                            {generatedTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {generatedTags.map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="border-primary text-primary"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Hashtag Research */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <Hash className="w-5 h-5 text-primary" />
                            Hashtag Research
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <Input
                              value={hashtagPrompt}
                              onChange={(e) => setHashtagPrompt(e.target.value)}
                              placeholder="Video niche..."
                              className="border-primary/30 focus:border-primary glass"
                            />
                            <Button
                              onClick={generateHashtags}
                              disabled={!hashtagPrompt || genLoading}
                              className="w-full hover:bg-primary hover:text-white"
                              variant="outline"
                            >
                              Research Hashtags
                            </Button>
                            {generatedHashtags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {generatedHashtags.map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="border-primary text-primary"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Content Templates */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-primary" />
                          Content Templates
                        </CardTitle>
                        <CardDescription>
                          Professional templates for different video types
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            {
                              icon: Lightbulb,
                              title: "Tutorial",
                              desc: "Step-by-step guide template",
                            },
                            {
                              icon: Camera,
                              title: "Vlog",
                              desc: "Personal vlog structure",
                            },
                            {
                              icon: Target,
                              title: "Product Review",
                              desc: "Comprehensive review format",
                            },
                            {
                              icon: TrendingUp,
                              title: "How To",
                              desc: "Educational content template",
                            },
                            {
                              icon: Zap,
                              title: "News Update",
                              desc: "Breaking news format",
                            },
                            {
                              icon: Mic,
                              title: "Interview",
                              desc: "Professional interview structure",
                            },
                          ].map((template, idx) => (
                            <button
                              key={idx}
                              className="p-4 rounded-lg glass border border-primary/20 hover:bg-primary/10 transition-all duration-200 hover-lift text-left"
                            >
                              <template.icon className="w-6 h-6 text-primary mb-2" />
                              <h4 className="font-medium text-sm">
                                {template.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Analytics */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {/* Charts Row */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Views Chart */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-primary" />
                            Views Over Time (Last 12 Months)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="h-[350px]">
                            {viewsChartData ? (
                              <Line
                                data={viewsChartData}
                                options={chartOptions}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center">
                                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                  <p>No analytics data available</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Videos Per Month Chart */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-primary" />
                            Videos Published Per Month
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="h-[350px]">
                            {analytics ? (
                              <Bar
                                data={{
                                  labels: analytics.months.map((m: string) =>
                                    m.slice(0, 7),
                                  ),
                                  datasets: [
                                    {
                                      label: "Videos",
                                      data: analytics.videosPerMonth,
                                      backgroundColor: "rgba(255,107,0,0.7)",
                                      borderColor: "#FF6B00",
                                      borderWidth: 2,
                                    },
                                  ],
                                }}
                                options={chartOptions}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center">
                                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                  <p>No data available</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      <Card className="glass-strong border-primary/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Views
                              </p>
                              <p className="text-2xl font-bold">
                                {analytics?.totalViews.toLocaleString() || "0"}
                              </p>
                              {analytics && analytics.totalViews > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  All time
                                </p>
                              )}
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="glass-strong border-primary/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Videos
                              </p>
                              <p className="text-2xl font-bold">
                                {analytics?.totalVideos || "0"}
                              </p>
                              {analytics && analytics.totalVideos > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Avg:{" "}
                                  {Math.round(
                                    (analytics.totalViews || 0) /
                                      (analytics.totalVideos || 1),
                                  ).toLocaleString()}{" "}
                                  views/video
                                </p>
                              )}
                            </div>
                            <Video className="w-8 h-8 text-primary" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="glass-strong border-primary/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Comments
                              </p>
                              <p className="text-2xl font-bold">
                                {comments.length.toLocaleString()}
                              </p>
                              {analytics && analytics.totalVideos > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.round(
                                    (comments.length / analytics.totalVideos) *
                                      10,
                                  ) / 10}{" "}
                                  per video
                                </p>
                              )}
                            </div>
                            <MessageSquare className="w-8 h-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="glass-strong border-primary/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Engagement Rate
                              </p>
                              <p className="text-2xl font-bold">
                                {analytics && analytics.totalViews > 0
                                  ? (
                                      (comments.length / analytics.totalViews) *
                                      100
                                    ).toFixed(2)
                                  : "0.00"}
                                %
                              </p>
                              {analytics && analytics.totalViews > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Comments/Views ratio
                                </p>
                              )}
                            </div>
                            <ThumbsUp className="w-8 h-8 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid gap-6 md:grid-cols-3">
                      <Card className="glass-strong border-primary/30">
                        <CardHeader className="border-b border-primary/20 pb-3">
                          <CardTitle className="text-sm font-medium">
                            Average Views Per Video
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <p className="text-3xl font-bold">
                            {analytics && analytics.totalVideos > 0
                              ? Math.round(
                                  (analytics.totalViews || 0) /
                                    analytics.totalVideos,
                                ).toLocaleString()
                              : "0"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Total views divided by total videos
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="glass-strong border-primary/30">
                        <CardHeader className="border-b border-primary/20 pb-3">
                          <CardTitle className="text-sm font-medium">
                            Channel Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${channelTitle ? "bg-green-500" : "bg-red-500"}`}
                            />
                            <p className="text-lg font-semibold">
                              {channelTitle ? "Connected" : "Not Connected"}
                            </p>
                          </div>
                          {channelTitle && (
                            <p className="text-xs text-muted-foreground mt-2 truncate">
                              {channelTitle}
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="glass-strong border-primary/30">
                        <CardHeader className="border-b border-primary/20 pb-3">
                          <CardTitle className="text-sm font-medium">
                            Last Updated
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <p className="text-sm font-semibold">
                            {analytics?.lastUpdated
                              ? new Date(
                                  analytics.lastUpdated,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Never"}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="mt-3 w-full hover:bg-primary hover:text-white"
                          >
                            <RefreshCw
                              className={cn(
                                "w-4 h-4 mr-2",
                                refreshing && "animate-spin",
                              )}
                            />
                            Refresh Data
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Ideas */}
              {activeTab === "content-ideas" && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {/* Generate Ideas Section */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-primary" />
                          Generate Content Ideas
                        </CardTitle>
                        <CardDescription>
                          Get AI-powered content ideas based on your niche,
                          trending topics, or specific keywords
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          {/* Input Section */}
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-primary mb-2 block">
                                What kind of content are you looking for?
                              </label>
                              <Textarea
                                value={contentIdeasPrompt}
                                onChange={(e) =>
                                  setContentIdeasPrompt(e.target.value)
                                }
                                placeholder="E.g., Tech tutorials, cooking tips, fitness routines, gaming content..."
                                rows={4}
                                className="resize-none border-primary/30 focus:border-primary glass"
                              />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="text-sm font-medium text-primary mb-2 block">
                                  Category
                                </label>
                                <Select
                                  value={contentIdeasCategory}
                                  onValueChange={setContentIdeasCategory}
                                >
                                  <SelectTrigger className="border-primary/30 glass">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">
                                      All Categories
                                    </SelectItem>
                                    <SelectItem value="tutorial">
                                      Tutorial
                                    </SelectItem>
                                    <SelectItem value="review">
                                      Review
                                    </SelectItem>
                                    <SelectItem value="entertainment">
                                      Entertainment
                                    </SelectItem>
                                    <SelectItem value="educational">
                                      Educational
                                    </SelectItem>
                                    <SelectItem value="lifestyle">
                                      Lifestyle
                                    </SelectItem>
                                    <SelectItem value="tech">
                                      Technology
                                    </SelectItem>
                                    <SelectItem value="gaming">
                                      Gaming
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-end">
                                <Button
                                  onClick={async () => {
                                    if (!contentIdeasPrompt.trim()) {
                                      toast.error(
                                        "Please enter a topic or description",
                                      );
                                      return;
                                    }
                                    setContentIdeasLoading(true);
                                    try {
                                      const res = await safePost(
                                        "/api/youtube/composer/generate",
                                        {
                                          prompt: `Generate 10 creative YouTube video content ideas for: ${contentIdeasPrompt}. Category: ${contentIdeasCategory}. Return only a numbered list of ideas, one per line, no extra text.`,
                                          tone: "creative",
                                        },
                                      );
                                      const ideasText =
                                        res.description || res.title || "";
                                      const ideas = ideasText
                                        .split(/\n|\d+\./)
                                        .map((line: string) =>
                                          line.trim().replace(/^\d+\.?\s*/, ""),
                                        )
                                        .filter(
                                          (line: string) => line.length > 10,
                                        )
                                        .slice(0, 10);
                                      setGeneratedIdeas(
                                        ideas.length > 0
                                          ? ideas
                                          : [
                                              "No ideas generated. Try a different prompt.",
                                            ],
                                      );
                                      toast.success("Content ideas generated!");
                                    } catch (e: any) {
                                      toast.error(
                                        e.message || "Failed to generate ideas",
                                      );
                                    } finally {
                                      setContentIdeasLoading(false);
                                    }
                                  }}
                                  disabled={
                                    contentIdeasLoading ||
                                    !contentIdeasPrompt.trim()
                                  }
                                  className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white"
                                >
                                  {contentIdeasLoading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Generate Ideas
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Generated Ideas */}
                          {generatedIdeas.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                  Generated Ideas ({generatedIdeas.length})
                                </h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setGeneratedIdeas([]);
                                    setContentIdeasPrompt("");
                                  }}
                                  className="hover:bg-primary hover:text-white"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Clear
                                </Button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                {generatedIdeas.map(
                                  (idea: string, idx: number) => (
                                    <Card
                                      key={idx}
                                      className="glass border-primary/20 hover:border-primary/40 transition-colors"
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium leading-relaxed">
                                              {idea}
                                            </p>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 hover:bg-primary hover:text-white"
                                              onClick={() => {
                                                navigator.clipboard.writeText(
                                                  idea,
                                                );
                                                toast.success("Idea copied!");
                                              }}
                                            >
                                              <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 hover:bg-green-500 hover:text-white"
                                              onClick={async () => {
                                                try {
                                                  await safePost(
                                                    "/api/youtube/composer/drafts",
                                                    {
                                                      title: idea,
                                                      description: `Content idea: ${idea}`,
                                                      hashtags: "",
                                                    },
                                                  );
                                                  toast.success(
                                                    "Idea saved to drafts!",
                                                  );
                                                  // Refresh saved ideas
                                                  try {
                                                    const res = await safeGet(
                                                      "/api/youtube/composer/drafts",
                                                    );
                                                    const drafts =
                                                      res.items || [];
                                                    const ideas = drafts
                                                      .filter((d: any) =>
                                                        d.description?.includes(
                                                          "Content idea:",
                                                        ),
                                                      )
                                                      .map((d: any) => ({
                                                        id: d.id,
                                                        idea:
                                                          d.title ||
                                                          d.description?.replace(
                                                            "Content idea: ",
                                                            "",
                                                          ) ||
                                                          "",
                                                        category: "all",
                                                        created_at:
                                                          d.created_at,
                                                      }));
                                                    setSavedIdeas(ideas);
                                                  } catch (e) {}
                                                } catch (e: any) {
                                                  toast.error(
                                                    "Failed to save idea",
                                                  );
                                                }
                                              }}
                                            >
                                              <Save className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Trending Topics Section */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUpIcon className="w-5 h-5 text-primary" />
                          Trending Topics Suggestions
                        </CardTitle>
                        <CardDescription>
                          Quick suggestions based on popular categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            "Tech product reviews",
                            "How-to tutorials",
                            "Latest news updates",
                            "Behind the scenes",
                            "Day in my life vlogs",
                            "Product comparisons",
                            "Q&A sessions",
                            "Challenge videos",
                            "Reaction videos",
                            "Unboxing videos",
                            "Top 10 lists",
                            "Myth busting",
                          ].map((topic, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              className="justify-start text-left h-auto p-3 hover:bg-primary hover:text-white transition-all"
                              onClick={() => {
                                setContentIdeasPrompt(topic);
                                toast.info(
                                  "Topic added! Click 'Generate Ideas' to get suggestions.",
                                );
                              }}
                            >
                              <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{topic}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Saved Ideas Section */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Save className="w-5 h-5 text-primary" />
                            Saved Ideas{" "}
                            {savedIdeas.length > 0 && `(${savedIdeas.length})`}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await safeGet(
                                  "/api/youtube/composer/drafts",
                                );
                                const drafts = res.items || [];
                                const ideas = drafts
                                  .filter((d: any) =>
                                    d.description?.includes("Content idea:"),
                                  )
                                  .map((d: any) => ({
                                    id: d.id,
                                    idea:
                                      d.title ||
                                      d.description?.replace(
                                        "Content idea: ",
                                        "",
                                      ) ||
                                      "",
                                    category: "all",
                                    created_at: d.created_at,
                                  }));
                                setSavedIdeas(ideas);
                                toast.success("Saved ideas refreshed!");
                              } catch (e) {
                                toast.error("Failed to load saved ideas");
                              }
                            }}
                            className="hover:bg-primary hover:text-white"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {savedIdeas.length > 0 ? (
                          <div className="grid gap-3">
                            {savedIdeas.map(
                              (item: {
                                id: string;
                                idea: string;
                                category: string;
                                created_at: string;
                              }) => (
                                <Card
                                  key={item.id}
                                  className="glass border-primary/20"
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">
                                          {item.idea}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Saved{" "}
                                          {new Date(
                                            item.created_at,
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-primary hover:text-white"
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              item.idea,
                                            );
                                            toast.success("Idea copied!");
                                          }}
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-destructive hover:text-white"
                                          onClick={async () => {
                                            try {
                                              await safeDelete(
                                                `/api/youtube/composer/drafts?id=${item.id}`,
                                              );
                                              setSavedIdeas(
                                                savedIdeas.filter(
                                                  (i: { id: string }) =>
                                                    i.id !== item.id,
                                                ),
                                              );
                                              toast.success("Idea deleted");
                                            } catch (e) {
                                              toast.error(
                                                "Failed to delete idea",
                                              );
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No saved ideas yet</p>
                            <p className="text-xs mt-1">
                              Generate ideas and save them to drafts to see them
                              here
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Video Analytics */}
              {activeTab === "video-analytics" && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {/* Filter and Stats */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Video Performance Analytics
                          </CardTitle>
                          <Select
                            value={videoAnalyticsFilter}
                            onValueChange={(value: any) =>
                              setVideoAnalyticsFilter(value)
                            }
                          >
                            <SelectTrigger className="w-full sm:w-48 border-primary/30 glass">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Videos</SelectItem>
                              <SelectItem value="top">
                                Top Performers
                              </SelectItem>
                              <SelectItem value="recent">
                                Recent Videos
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {/* Overall Stats */}
                        <div className="grid gap-4 md:grid-cols-4 mb-6">
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Total Views
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {videos
                                .reduce((sum, v) => sum + v.views, 0)
                                .toLocaleString()}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <ThumbsUp className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Avg Views/Video
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {videos.length > 0
                                ? Math.round(
                                    videos.reduce(
                                      (sum, v) => sum + v.views,
                                      0,
                                    ) / videos.length,
                                  ).toLocaleString()
                                : "0"}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Video className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Total Videos
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {videos.length}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Total Comments
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {comments.length}
                            </p>
                          </div>
                        </div>

                        {/* Filtered Videos */}
                        <div className="space-y-3">
                          {(() => {
                            let filteredVids = [...videos];
                            if (videoAnalyticsFilter === "top") {
                              filteredVids.sort((a, b) => b.views - a.views);
                              filteredVids = filteredVids.slice(0, 10);
                            } else if (videoAnalyticsFilter === "recent") {
                              filteredVids.sort(
                                (a, b) =>
                                  new Date(b.publishedAt).getTime() -
                                  new Date(a.publishedAt).getTime(),
                              );
                              filteredVids = filteredVids.slice(0, 10);
                            }
                            return (
                              <>
                                <h3 className="text-lg font-semibold mb-4">
                                  {videoAnalyticsFilter === "top"
                                    ? "Top Performing Videos"
                                    : videoAnalyticsFilter === "recent"
                                      ? "Recent Videos"
                                      : "All Videos"}{" "}
                                  ({filteredVids.length})
                                </h3>
                                <ScrollArea className="h-[500px]">
                                  {filteredVids.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                      <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                      <p className="text-sm">
                                        No videos available
                                      </p>
                                      <p className="text-xs mt-1">
                                        Connect your YouTube channel to see
                                        analytics
                                      </p>
                                    </div>
                                  ) : (
                                    filteredVids.map((video) => {
                                      const videoComments = comments.filter(
                                        (c) => c.videoUrl === video.url,
                                      );
                                      const engagementRate =
                                        video.views > 0
                                          ? (
                                              (videoComments.length /
                                                video.views) *
                                              100
                                            ).toFixed(2)
                                          : "0.00";
                                      const publishedDate = new Date(
                                        video.publishedAt,
                                      );
                                      const now = new Date();
                                      const daysSincePublished =
                                        publishedDate &&
                                        !isNaN(publishedDate.getTime())
                                          ? Math.max(
                                              1,
                                              Math.floor(
                                                (now.getTime() -
                                                  publishedDate.getTime()) /
                                                  (1000 * 60 * 60 * 24),
                                              ),
                                            )
                                          : 1;
                                      const viewsPerDay =
                                        daysSincePublished > 0
                                          ? Math.round(
                                              video.views / daysSincePublished,
                                            )
                                          : video.views;

                                      return (
                                        <Card
                                          key={video.id}
                                          className={cn(
                                            "glass border-primary/20 hover:border-primary/40 transition-all cursor-pointer mb-3",
                                            selectedVideoForAnalytics ===
                                              video.id &&
                                              "border-primary bg-primary/5",
                                          )}
                                          onClick={() =>
                                            setSelectedVideoForAnalytics(
                                              selectedVideoForAnalytics ===
                                                video.id
                                                ? null
                                                : video.id,
                                            )
                                          }
                                        >
                                          <CardContent className="p-4">
                                            <div className="flex gap-4">
                                              <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-32 h-20 object-cover rounded"
                                              />
                                              <div className="flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1">
                                                    <h4 className="font-medium line-clamp-1 mb-2">
                                                      {video.title}
                                                    </h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                      <div>
                                                        <p className="text-muted-foreground">
                                                          Views
                                                        </p>
                                                        <p className="font-semibold text-primary">
                                                          {video.views.toLocaleString()}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-muted-foreground">
                                                          Comments
                                                        </p>
                                                        <p className="font-semibold">
                                                          {videoComments.length}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-muted-foreground">
                                                          Engagement
                                                        </p>
                                                        <p className="font-semibold">
                                                          {engagementRate}%
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-muted-foreground">
                                                          Views/Day
                                                        </p>
                                                        <p className="font-semibold">
                                                          {viewsPerDay.toLocaleString()}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                      <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {publishedDate &&
                                                        !isNaN(
                                                          publishedDate.getTime(),
                                                        )
                                                          ? publishedDate.toLocaleDateString()
                                                          : "Invalid date"}
                                                      </span>
                                                      <span>
                                                        {daysSincePublished}{" "}
                                                        {daysSincePublished ===
                                                        1
                                                          ? "day"
                                                          : "days"}{" "}
                                                        ago
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-primary hover:text-white"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.open(
                                                        video.url,
                                                        "_blank",
                                                      );
                                                    }}
                                                  >
                                                    <ExternalLink className="w-4 h-4" />
                                                  </Button>
                                                </div>

                                                {/* Expanded Analytics */}
                                                {selectedVideoForAnalytics ===
                                                  video.id && (
                                                  <div className="mt-4 pt-4 border-t border-primary/20">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                      <div className="space-y-2">
                                                        <p className="text-sm font-medium">
                                                          Performance Metrics
                                                        </p>
                                                        <div className="space-y-1 text-sm">
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                              Total Views:
                                                            </span>
                                                            <span className="font-medium">
                                                              {video.views.toLocaleString()}
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                              Comments:
                                                            </span>
                                                            <span className="font-medium">
                                                              {
                                                                videoComments.length
                                                              }
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                              Engagement Rate:
                                                            </span>
                                                            <span className="font-medium">
                                                              {engagementRate}%
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                              Avg Views/Day:
                                                            </span>
                                                            <span className="font-medium">
                                                              {viewsPerDay.toLocaleString()}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <div className="space-y-2">
                                                        <p className="text-sm font-medium">
                                                          Video Information
                                                        </p>
                                                        <div className="space-y-1 text-sm">
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                              Published:
                                                            </span>
                                                            <span className="font-medium">
                                                              {new Date(
                                                                video.publishedAt,
                                                              ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                  year: "numeric",
                                                                  month:
                                                                    "short",
                                                                  day: "numeric",
                                                                },
                                                              )}
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                              Days Active:
                                                            </span>
                                                            <span className="font-medium">
                                                              {
                                                                daysSincePublished
                                                              }
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">
                                                              Status:
                                                            </span>
                                                            <Badge
                                                              variant="outline"
                                                              className={cn(
                                                                video.status ===
                                                                  "published" &&
                                                                  "border-green-500 text-green-500",
                                                                video.status ===
                                                                  "scheduled" &&
                                                                  "border-yellow-500 text-yellow-500",
                                                                video.status ===
                                                                  "draft" &&
                                                                  "border-gray-500 text-gray-500",
                                                              )}
                                                            >
                                                              {video.status ||
                                                                "published"}
                                                            </Badge>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })
                                  )}
                                </ScrollArea>
                              </>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Charts */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Top Videos Chart */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary" />
                            Top 5 Videos by Views
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="h-[300px]">
                            {videos.length > 0 ? (
                              <Bar
                                data={{
                                  labels: [...videos]
                                    .sort((a, b) => b.views - a.views)
                                    .slice(0, 5)
                                    .map((v) =>
                                      v.title.length > 20
                                        ? v.title.slice(0, 20) + "..."
                                        : v.title,
                                    ),
                                  datasets: [
                                    {
                                      label: "Views",
                                      data: [...videos]
                                        .sort((a, b) => b.views - a.views)
                                        .slice(0, 5)
                                        .map((v) => v.views),
                                      backgroundColor: "rgba(255,107,0,0.7)",
                                      borderColor: "#FF6B00",
                                      borderWidth: 2,
                                    },
                                  ],
                                }}
                                options={chartOptions}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>No video data available</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Engagement Chart */}
                      <Card className="glass-strong border-primary/30 shadow-xl">
                        <CardHeader className="border-b border-primary/20">
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Engagement Comparison
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="h-[300px]">
                            {videos.length > 0 ? (
                              <Bar
                                data={{
                                  labels: [...videos]
                                    .slice(0, 5)
                                    .map((v) =>
                                      v.title.length > 15
                                        ? v.title.slice(0, 15) + "..."
                                        : v.title,
                                    ),
                                  datasets: [
                                    {
                                      label: "Views",
                                      data: [...videos]
                                        .slice(0, 5)
                                        .map((v) => v.views),
                                      backgroundColor: "rgba(255,107,0,0.5)",
                                      borderColor: "#FF6B00",
                                      borderWidth: 2,
                                    },
                                    {
                                      label: "Comments",
                                      data: [...videos].slice(0, 5).map((v) => {
                                        const vComments = comments.filter(
                                          (c) => c.videoUrl === v.url,
                                        );
                                        return vComments.length * 100; // Scale for visibility
                                      }),
                                      backgroundColor: "rgba(0,150,255,0.5)",
                                      borderColor: "#0096FF",
                                      borderWidth: 2,
                                    },
                                  ],
                                }}
                                options={chartOptions}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>No video data available</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {activeTab === "comments" && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    {/* Stats and Filters */}
                    <Card className="glass-strong border-primary/30 shadow-xl">
                      <CardHeader className="border-b border-primary/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Comments Management ({comments.length})
                          </CardTitle>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Select
                              value={commentFilter}
                              onValueChange={(value: any) =>
                                setCommentFilter(value)
                              }
                            >
                              <SelectTrigger className="w-full sm:w-48 border-primary/30 glass">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All Comments
                                </SelectItem>
                                <SelectItem value="recent">Recent</SelectItem>
                                <SelectItem value="mostLiked">
                                  Most Liked
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={selectedVideoForComments || "all"}
                              onValueChange={(value: string) =>
                                setSelectedVideoForComments(
                                  value === "all" ? null : value,
                                )
                              }
                            >
                              <SelectTrigger className="w-full sm:w-48 border-primary/30 glass">
                                <SelectValue placeholder="Filter by video" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Videos</SelectItem>
                                {videos.map((v) => (
                                  <SelectItem key={v.id} value={v.url}>
                                    {v.title.length > 30
                                      ? v.title.slice(0, 30) + "..."
                                      : v.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const csvContent = [
                                  [
                                    "Author",
                                    "Comment",
                                    "Likes",
                                    "Published Date",
                                    "Video URL",
                                  ].join(","),
                                  ...filteredComments.map((c: YTComment) =>
                                    [
                                      `"${c.author}"`,
                                      `"${c.text.replace(/"/g, '""')}"`,
                                      c.likes,
                                      c.publishedAt,
                                      c.videoUrl,
                                    ].join(","),
                                  ),
                                ].join("\n");
                                const blob = new Blob([csvContent], {
                                  type: "text/csv",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `youtube-comments-${new Date().toISOString().split("T")[0]}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success("Comments exported to CSV!");
                              }}
                              className="hover:bg-primary hover:text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export CSV
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {/* Search */}
                        <div className="mb-6">
                          <Input
                            placeholder="Search comments by author or text..."
                            value={commentSearch}
                            onChange={(e) => setCommentSearch(e.target.value)}
                            className="border-primary/30 focus:border-primary glass"
                          />
                        </div>

                        {/* Stats */}
                        <div className="grid gap-4 md:grid-cols-4 mb-6">
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Total Comments
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {comments.length}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <ThumbsUp className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Total Likes
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {comments
                                .reduce((sum, c) => sum + c.likes, 0)
                                .toLocaleString()}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Unique Authors
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {new Set(comments.map((c) => c.author)).size}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg glass border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Video className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                Avg Comments/Video
                              </span>
                            </div>
                            <p className="text-2xl font-bold">
                              {videos.length > 0
                                ? Math.round(comments.length / videos.length)
                                : "0"}
                            </p>
                          </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold mb-4">
                            {filteredComments.length} Comment
                            {filteredComments.length !== 1 ? "s" : ""}
                          </h3>
                          <ScrollArea className="h-[500px]">
                            {filteredComments.length === 0 ? (
                              <div className="text-center py-12 text-muted-foreground">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No comments found</p>
                                <p className="text-xs mt-1">
                                  {commentSearch ||
                                  selectedVideoForComments ||
                                  commentFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "No comments available for your videos"}
                                </p>
                              </div>
                            ) : (
                              filteredComments.map((comment: YTComment) => {
                                const video = videos.find(
                                  (v) => v.url === comment.videoUrl,
                                );
                                const commentDate = new Date(
                                  comment.publishedAt,
                                );
                                const daysAgo = Math.floor(
                                  (new Date().getTime() -
                                    commentDate.getTime()) /
                                    (1000 * 60 * 60 * 24),
                                );

                                return (
                                  <Card
                                    key={comment.id}
                                    className="glass border-primary/20 hover:border-primary/40 transition-all mb-3"
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex gap-4">
                                        <div className="flex-shrink-0">
                                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                            <MessageSquare className="w-5 h-5 text-primary" />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-primary">
                                                  {comment.author}
                                                </h4>
                                                {comment.likes > 0 && (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-primary/30 text-xs"
                                                  >
                                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                                    {comment.likes}
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                                {comment.text}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary/10">
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {commentDate.toLocaleDateString(
                                                  "en-US",
                                                  {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                  },
                                                )}
                                              </span>
                                              <span>
                                                {daysAgo === 0
                                                  ? "Today"
                                                  : daysAgo === 1
                                                    ? "Yesterday"
                                                    : `${daysAgo} days ago`}
                                              </span>
                                              {video && (
                                                <span className="flex items-center gap-1">
                                                  <Video className="w-3 h-3" />
                                                  <span className="max-w-[200px] truncate">
                                                    {video.title}
                                                  </span>
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-primary hover:text-white"
                                                onClick={() => {
                                                  window.open(
                                                    comment.videoUrl,
                                                    "_blank",
                                                  );
                                                }}
                                                title="Open video"
                                              >
                                                <ExternalLink className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-green-500 hover:text-white"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(
                                                    comment.text,
                                                  );
                                                  toast.success(
                                                    "Comment copied to clipboard!",
                                                  );
                                                }}
                                                title="Copy comment"
                                              >
                                                <Copy className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })
                            )}
                          </ScrollArea>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
