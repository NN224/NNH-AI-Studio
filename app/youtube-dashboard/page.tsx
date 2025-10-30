"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type YTStatistics = { subscriberCount?: string; viewCount?: string; videoCount?: string };
type YTMetadata = { email?: string | null; channel_title?: string | null; statistics?: YTStatistics | null };
type YTVideo = { id: string; title: string; thumbnail: string; views: number; publishedAt: string; url: string };
type YTComment = { id: string; author: string; text: string; likes: number; publishedAt: string; videoUrl: string };
type YTAnalytics = { lastUpdated: string; months: string[]; viewsPerMonth: number[]; videosPerMonth: number[]; totalViews: number; totalVideos: number };
type Draft = { id: string; title: string; description: string; hashtags: string; created_at: string };

declare global { interface Window { Chart?: any; } }

export default function YoutubeDashboard() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [stats, setStats] = useState({ subs: 0, views: 0, videos: 0 });
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [analytics, setAnalytics] = useState<YTAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard"|"analytics"|"composer"|"comments"|"settings">("dashboard");

  // Composer state
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"neutral"|"friendly"|"professional"|"energetic">("neutral");
  const [genLoading, setGenLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Filters
  const [vSearch, setVSearch] = useState("");
  const [vFrom, setVFrom] = useState("");
  const [vTo, setVTo] = useState("");
  const [cSearch, setCSearch] = useState("");
  const [cFrom, setCFrom] = useState("");
  const [cTo, setCTo] = useState("");

  // Charts
  const viewsChartRef = useRef<HTMLCanvasElement|null>(null);
  const videosChartRef = useRef<HTMLCanvasElement|null>(null);
  const viewsChartObj = useRef<any>(null);
  const videosChartObj = useRef<any>(null);

  const loadChartJs = async () => {
    if (typeof window === "undefined" || window.Chart) return window.Chart;
    await new Promise<void>((ok,err)=>{
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => err(new Error("ChartJS load failed"));
      document.body.appendChild(s);
    });
    return window.Chart;
  };

  // Safe fetch helpers
  const safeGet = async (url: string) => {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const t = await r.text();
    let j: any = {};
    try { j = JSON.parse(t); } catch {}
    if (!r.ok) throw new Error(j.error || t.slice(0, 300) || `GET ${url} failed`);
    return j;
  };
  const safePost = async (url: string, body?: any) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    let j: any = {};
    try { j = JSON.parse(t); } catch {}
    if (!r.ok) throw new Error(j.error || t.slice(0, 300) || `POST ${url} failed`);
    return j;
  };
  const safeDelete = async (url: string) => {
    const r = await fetch(url, { method: "DELETE", headers: { Accept: "application/json" } });
    const t = await r.text();
    let j: any = {};
    try { j = JSON.parse(t); } catch {}
    if (!r.ok) throw new Error(j.error || t.slice(0, 300) || `DELETE ${url} failed`);
    return j;
  };

  // Data loaders
  const fetchFromDB = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
      setStats({ subs: 0, views: 0, videos: 0 });
      setVideos([]);
      setComments([]);
      setAnalytics(null);
      return false;
    }
    const meta = (data.metadata || {}) as YTMetadata;
    const s = meta.statistics || {};
    setChannelTitle(meta.channel_title || "YouTube Channel");
    setStats({
      subs: Number(s.subscriberCount || 0),
      views: Number(s.viewCount || 0),
      videos: Number(s.videoCount || 0),
    });
    return true;
  };
  const fetchVideos = async () => {
    const j = await safeGet("/api/youtube/videos");
    setVideos(j.items || []);
  };
  const fetchComments = async () => {
    const j = await safeGet("/api/youtube/comments");
    setComments(j.items || []);
  };
  const fetchAnalytics = async () => {
    const j = await safeGet("/api/youtube/analytics");
    setAnalytics(j as YTAnalytics);
  };
  const fetchDrafts = async () => {
    const j = await safeGet("/api/youtube/composer/drafts");
    setDrafts(j.items || []);
  };

  // Charts draw
  const drawCharts = async () => {
    if (!analytics) return;
    const Chart = await loadChartJs();
    if (!Chart) return;
    if (viewsChartObj.current) {
      viewsChartObj.current.destroy();
      viewsChartObj.current = null;
    }
    if (videosChartObj.current) {
      videosChartObj.current.destroy();
      videosChartObj.current = null;
    }
    const labels = analytics.months.map((m: string) => m.slice(0, 7));
    if (viewsChartRef.current) {
      viewsChartObj.current = new Chart(viewsChartRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Views",
            data: analytics.viewsPerMonth,
            borderColor: "#FF6B00",
            backgroundColor: "rgba(255,107,0,0.15)",
            borderWidth: 2,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: "#fff" } }
          },
          scales: {
            x: { ticks: { color: "#aaa" } },
            y: { ticks: { color: "#aaa" }, beginAtZero: true }
          }
        }
      });
    }
    if (videosChartRef.current) {
      videosChartObj.current = new Chart(videosChartRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Videos",
            data: analytics.videosPerMonth,
            backgroundColor: "rgba(255,107,0,0.35)",
            borderColor: "#FF6B00",
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: "#fff" } }
          },
          scales: {
            x: { ticks: { color: "#aaa" } },
            y: { ticks: { color: "#aaa" }, beginAtZero: true }
          }
        }
      });
    }
  };

  // Actions
  const handleConnectYoutube = async () => {
    try {
      setConnecting(true);
      const data = await safePost("/api/youtube/create-auth-url", {});
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (e: any) {
      setError(e.message || "Failed to start YouTube connection");
      setConnecting(false);
    }
  };
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      await safePost("/api/youtube/token/refresh-if-needed");
      await safePost("/api/youtube/refresh");
      await Promise.all([fetchFromDB(), fetchVideos(), fetchComments(), fetchAnalytics(), fetchDrafts()]);
      if (activeTab === "analytics") await drawCharts();
    } catch (e: any) {
      setError(e.message || "Failed to update data");
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
      setStats({ subs: 0, views: 0, videos: 0 });
      setVideos([]);
      setComments([]);
      setAnalytics(null);
      setDrafts([]);
      if (viewsChartObj.current) {
        viewsChartObj.current.destroy();
      }
      if (videosChartObj.current) {
        videosChartObj.current.destroy();
      }
    } catch (e: any) {
      setError(e.message || "Failed to disconnect YouTube");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenLoading(true);
      setError(null);
      const res = await safePost("/api/youtube/composer/generate", { prompt, tone });
      setTitle(res.title || "");
      setDescription(res.description || "");
      setHashtags(res.hashtags || "");
    } catch (e: any) {
      setError(e.message || "Failed to generate content");
    } finally {
      setGenLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await safePost("/api/youtube/composer/drafts", { title, description, hashtags });
      if (res?.item) {
        setDrafts(d => [res.item, ...d]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await safeDelete(`/api/youtube/composer/drafts?id=${encodeURIComponent(id)}`);
      setDrafts(d => d.filter(x => x.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to delete draft");
    }
  };

  // Init
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await safePost("/api/youtube/token/refresh-if-needed");
        const has = await fetchFromDB();
        if (has) {
          await Promise.all([fetchVideos(), fetchComments(), fetchAnalytics(), fetchDrafts()]);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load channel data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (activeTab !== "analytics" || !analytics) return;
      await drawCharts();
    })();
  }, [activeTab, analytics]);

  // Filters
  const filteredVideos = useMemo(() => videos.filter(v => {
    const q = vSearch.trim().toLowerCase();
    const okQ = !q || v.title.toLowerCase().includes(q);
    const d = new Date(v.publishedAt).getTime();
    const okFrom = !vFrom || d >= new Date(vFrom).getTime();
    const okTo = !vTo || d <= new Date(vTo).getTime();
    return okQ && okFrom && okTo;
  }), [videos, vSearch, vFrom, vTo]);

  const filteredComments = useMemo(() => comments.filter(c => {
    const q = cSearch.trim().toLowerCase();
    const okQ = !q || c.text.toLowerCase().includes(q) || c.author.toLowerCase().includes(q);
    const d = new Date(c.publishedAt).getTime();
    const okFrom = !cFrom || d >= new Date(cFrom).getTime();
    const okTo = !cTo || d <= new Date(cTo).getTime();
    return okQ && okFrom && okTo;
  }), [comments, cSearch, cFrom, cTo]);

  // CSV export
  const exportCSV = (rows: any[], headers: string[], filename: string) => {
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => esc(r[h])).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportVideosCSV = () => exportCSV(
    filteredVideos.map(v => ({ id: v.id, title: v.title, views: v.views, publishedAt: v.publishedAt, url: v.url })),
    ["id", "title", "views", "publishedAt", "url"],
    "youtube_videos.csv"
  );
  const exportCommentsCSV = () => exportCSV(
    filteredComments.map(c => ({ id: c.id, author: c.author, likes: c.likes, publishedAt: c.publishedAt, text: c.text.replace(/\n/g, " "), videoUrl: c.videoUrl })),
    ["id", "author", "likes", "publishedAt", "text", "videoUrl"],
    "youtube_comments.csv"
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <aside className="w-64 hidden md:block border-r border-white/10 min-h-screen p-5">
          <div className="text-neon-orange font-extrabold text-xl mb-6">NNH • YouTube</div>
          <nav className="space-y-2">
            {(["dashboard", "analytics", "composer", "comments", "settings"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`w-full text-left rounded-lg px-3 py-2 transition ${
                  activeTab === t ? "bg-neon-orange text-black font-bold" : "hover:bg-white/10"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
          <div className="mt-8 space-y-2">
            <Button className="w-full bg-white/10 hover:bg-white/20" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Updating..." : "Refresh stats"}
            </Button>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting..." : "Disconnect YouTube"}
            </Button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-neon-orange">YouTube Studio Dashboard</h1>
            <div className="flex gap-2">
              <Button className="bg-white/10 hover:bg-white/20" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? "Updating..." : "Refresh"}
              </Button>
              <Button className="bg-neon-orange hover:bg-orange-700 text-white font-bold" onClick={handleConnectYoutube} disabled={connecting}>
                {connecting ? "Connecting..." : "Connect YouTube"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
              <div className="rounded-2xl p-6 bg-white/5 h-28" />
              <div className="rounded-2xl p-6 bg-white/5 h-28" />
              <div className="rounded-2xl p-6 bg-white/5 h-28" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                {channelTitle ? (
                  <div className="text-lg text-white/80">
                    Channel: <span className="font-semibold text-white">{channelTitle}</span>
                  </div>
                ) : (
                  <div className="text-sm text-white/60">No channel connected — click "Connect YouTube".</div>
                )}
              </div>

              {activeTab === "dashboard" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="rounded-2xl p-6 glass glass-border">
                      <div className="text-2xl font-bold">Subscribers</div>
                      <div className="text-4xl font-extrabold">{stats.subs.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl p-6 glass glass-border">
                      <div className="text-2xl font-bold">Total Views</div>
                      <div className="text-4xl font-extrabold">{stats.views.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl p-6 glass glass-border">
                      <div className="text-2xl font-bold">Total Videos</div>
                      <div className="text-4xl font-extrabold">{stats.videos.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Filters + Export for Videos */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <input
                      value={vSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVSearch(e.target.value)}
                      placeholder="Search video titles..."
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none"
                    />
                    <input
                      type="date"
                      value={vFrom}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVFrom(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none"
                    />
                    <input
                      type="date"
                      value={vTo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVTo(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none"
                    />
                    <Button className="bg-white/10 hover:bg-white/20" onClick={exportVideosCSV}>
                      Export Videos CSV
                    </Button>
                  </div>

                  <div className="rounded-2xl p-6 glass glass-border">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold">Recent Videos</h2>
                      <div className="text-sm text-white/50">{filteredVideos.length} items</div>
                    </div>
                    {filteredVideos.length === 0 ? (
                      <div className="text-white/60 text-sm">No videos match the filters.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredVideos.map((v: YTVideo) => (
                          <a
                            key={v.id}
                            href={v.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                          >
                            <img src={v.thumbnail} alt={v.title} className="w-40 h-24 rounded-lg object-cover" />
                            <div className="flex-1">
                              <div className="font-semibold line-clamp-2">{v.title}</div>
                              <div className="text-xs text-white/60 mt-1">
                                {new Date(v.publishedAt).toLocaleDateString()} • {v.views.toLocaleString()} views
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "analytics" && analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl p-6 glass glass-border">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold">Views (last 12 months)</h2>
                      <div className="text-xs text-white/60">
                        Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
                      </div>
                    </div>
                    <canvas ref={viewsChartRef} className="w-full h-48" />
                    {!window?.Chart && (
                      <div className="text-white/60 text-sm mt-2">Chart.js failed to load; alternative display will show on refresh.</div>
                    )}
                  </div>
                  <div className="rounded-2xl p-6 glass glass-border">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold">Videos per month</h2>
                    </div>
                    <canvas ref={videosChartRef} className="w-full h-48" />
                    {!window?.Chart && (
                      <div className="text-white/60 text-sm mt-2">Chart.js failed to load; alternative display will show on refresh.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "composer" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-2xl p-6 glass glass-border lg:col-span-2">
                    <h2 className="text-xl font-bold mb-4">AI Composer</h2>
                    <div className="space-y-3">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        placeholder="Write video idea or key points..."
                        className="w-full rounded-lg bg-white/5 border border-white/10 p-3 outline-none"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <span>Tone:</span>
                        {(["neutral", "friendly", "professional", "energetic"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={`px-3 py-1 rounded ${
                              tone === t ? "bg-neon-orange text-black" : "bg-white/10 hover:bg-white/20"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <Button
                        className="bg-neon-orange hover:bg-orange-700"
                        onClick={handleGenerate}
                        disabled={genLoading || !prompt.trim()}
                      >
                        {genLoading ? "Generating..." : "Generate"}
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-white/60 mb-1">Title</div>
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/10 p-2 outline-none"
                          />
                        </div>
                        <div>
                          <div className="text-sm text-white/60 mb-1">Hashtags</div>
                          <input
                            value={hashtags}
                            onChange={(e) => setHashtags(e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/10 p-2 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-white/60 mb-1">Description</div>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={6}
                          className="w-full rounded-lg bg-white/5 border border-white/10 p-3 outline-none"
                        />
                      </div>
                      <Button
                        className="bg-white/10 hover:bg-white/20"
                        onClick={handleSaveDraft}
                        disabled={saving || !title.trim()}
                      >
                        {saving ? "Saving..." : "Save draft"}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl p-6 glass glass-border">
                    <h3 className="text-lg font-bold mb-3">Drafts</h3>
                    {drafts.length === 0 ? (
                      <div className="text-sm text-white/60">No saved drafts.</div>
                    ) : (
                      <div className="space-y-3">
                        {drafts.map((d: Draft) => (
                          <div key={d.id} className="p-3 rounded-xl bg-white/5">
                            <div className="text-xs text-white/60">{new Date(d.created_at).toLocaleString()}</div>
                            <div className="font-semibold line-clamp-1">{d.title}</div>
                            <div className="text-xs text-white/60 line-clamp-2">{d.hashtags}</div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                className="bg-white/10 hover:bg-white/20"
                                onClick={() => {
                                  setTitle(d.title);
                                  setDescription(d.description);
                                  setHashtags(d.hashtags);
                                }}
                              >
                                Use
                              </Button>
                              <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteDraft(d.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="rounded-2xl p-6 glass glass-border">
                  <h2 className="text-xl font-bold mb-4">Recent Comments</h2>

                  {/* Filters + Export for Comments */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <input
                      value={cSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCSearch(e.target.value)}
                      placeholder="Search comments/names..."
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none"
                    />
                    <input
                      type="date"
                      value={cFrom}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCFrom(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none"
                    />
                    <input
                      type="date"
                      value={cTo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCTo(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none"
                    />
                    <Button className="bg-white/10 hover:bg-white/20" onClick={exportCommentsCSV}>
                      Export Comments CSV
                    </Button>
                  </div>

                  {filteredComments.length === 0 ? (
                    <div className="text-white/60 text-sm">No comments match the filters.</div>
                  ) : (
                    <div className="space-y-4">
                      {filteredComments.map((c: YTComment) => (
                        <div key={c.id} className="p-3 rounded-xl bg-white/5">
                          <div className="text-sm text-white/60">{new Date(c.publishedAt).toLocaleString()}</div>
                          <div className="font-semibold">{c.author}</div>
                          <div className="text-white/90 whitespace-pre-wrap mt-1">{c.text}</div>
                          <div className="text-xs text-white/60 mt-2">
                            Likes: {c.likes} •{" "}
                            <a className="text-neon-orange" href={c.videoUrl} target="_blank" rel="noreferrer">
                              Open video
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="rounded-2xl p-6 glass glass-border">
                  <h2 className="text-xl font-bold mb-4">Settings</h2>
                  <div className="space-y-2">
                    <Button className="bg-white/10 hover:bg-white/20" onClick={handleRefresh} disabled={refreshing}>
                      {refreshing ? "Updating..." : "Refresh stats"}
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={handleDisconnect} disabled={disconnecting}>
                      {disconnecting ? "Disconnecting..." : "Disconnect YouTube"}
                    </Button>
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
