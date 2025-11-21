"use client";

import { useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  deletePost,
  publishPost,
  syncPostsFromGoogle,
  bulkDeletePosts,
  bulkPublishPosts,
} from "@/server/actions/posts-management";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RefreshCw, Search, Bot, Plus, Trash2, Send } from "lucide-react";
import { PostCard } from "./post-card";
import { CreatePostDialog } from "./create-post-dialog";
import { EditPostDialog } from "./edit-post-dialog";
import { AIAssistantSidebar } from "./ai-assistant-sidebar";
import { useDashboardSnapshot } from "@/hooks/use-dashboard-cache";
import type { GMBPost } from "@/lib/types/database";

interface PostStats {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  failed: number;
  whatsNew: number;
  events: number;
  offers: number;
  thisWeek: number;
}

interface PostsClientPageProps {
  initialPosts: GMBPost[];
  totalCount: number;
  locations: Array<{ id: string; location_name: string }>;
  currentFilters: {
    locationId?: string;
    postType?: string;
    status?: string;
    searchQuery?: string;
    page?: number;
  };
}

export function PostsClientPage({
  initialPosts,
  totalCount,
  locations,
  currentFilters,
}: PostsClientPageProps) {
  const [selectedPost, setSelectedPost] = useState<GMBPost | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: dashboardSnapshot } = useDashboardSnapshot();
  const stats = useMemo<PostStats | null>(() => {
    const postStats = dashboardSnapshot?.postStats;
    if (!postStats) return null;

    return {
      total: postStats.totals.total ?? 0,
      published: postStats.totals.published ?? 0,
      drafts: postStats.totals.drafts ?? 0,
      scheduled: postStats.totals.scheduled ?? 0,
      failed: postStats.totals.failed ?? 0,
      whatsNew: postStats.byType.whats_new ?? 0,
      events: postStats.byType.event ?? 0,
      offers: postStats.byType.offer ?? 0,
      thisWeek: postStats.thisWeek ?? 0,
    };
  }, [dashboardSnapshot?.postStats]);

  // Memoized update filter function
  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // Reset to page 1 when filters change
      if (key !== "page") {
        params.set("page", "1");
      }

      router.push(`/posts?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Handle sync with better error handling
  const handleSync = useCallback(async () => {
    if (!currentFilters.locationId) {
      toast.error("Please select a location first");
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncPostsFromGoogle(currentFilters.locationId);

      if (result.success) {
        toast.success("Posts synced!", {
          description: result.message,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        if (result.errorCode === "AUTH_EXPIRED") {
          toast.error("Authentication expired", {
            description: result.error,
            action: {
              label: "Reconnect Google",
              onClick: () => router.push("/settings?tab=accounts"),
            },
          });
        } else {
          toast.error("Sync failed", {
            description: result.error,
          });
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSyncing(false);
    }
  }, [currentFilters.locationId, router]);

  // Handle delete with optimistic update
  const handleDelete = useCallback(
    async (postId: string) => {
      if (!confirm("Are you sure you want to delete this post?")) return;

      // Optimistic update
      const postToDelete = initialPosts.find((p) => p.id === postId);
      if (postToDelete && selectedPost?.id === postId) {
        setSelectedPost(null);
      }
      setSelectedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });

      try {
        const result = await deletePost(postId);

        if (result.success) {
          toast.success("Post deleted successfully");
          startTransition(() => {
            router.refresh();
          });
        } else {
          // Revert optimistic update on error
          startTransition(() => {
            router.refresh();
          });
          if (result.errorCode === "AUTH_EXPIRED") {
            toast.error("Authentication expired", {
              description: result.error,
              action: {
                label: "Reconnect Google",
                onClick: () => router.push("/settings?tab=accounts"),
              },
            });
          } else {
            toast.error("Delete failed", {
              description: result.error,
            });
          }
        }
      } catch (error) {
        console.error("Delete error:", error);
        // Revert optimistic update on error
        startTransition(() => {
          router.refresh();
        });
        toast.error("An unexpected error occurred");
      }
    },
    [initialPosts, selectedPost, router],
  );

  // Handle publish with optimistic update
  const handlePublish = useCallback(
    async (postId: string) => {
      // Optimistic update
      const postToPublish = initialPosts.find((p) => p.id === postId);
      if (postToPublish) {
        // Update local state optimistically
        const updatedPost = { ...postToPublish, status: "published" as const };
        if (selectedPost?.id === postId) {
          setSelectedPost(updatedPost);
        }
      }

      try {
        const result = await publishPost(postId);

        if (result.success) {
          toast.success("Post published successfully");
          startTransition(() => {
            router.refresh();
          });
        } else {
          // Revert optimistic update on error
          startTransition(() => {
            router.refresh();
          });
          if (result.errorCode === "AUTH_EXPIRED") {
            toast.error("Authentication expired", {
              description: result.error,
              action: {
                label: "Reconnect Google",
                onClick: () => router.push("/settings?tab=accounts"),
              },
            });
          } else if (result.errorCode === "PERMISSION_DENIED") {
            toast.error("Permission denied", {
              description: result.error,
            });
          } else if (result.errorCode === "RATE_LIMIT") {
            toast.error("Rate limit exceeded", {
              description: result.error,
            });
          } else {
            toast.error("Publish failed", {
              description: result.error,
            });
          }
        }
      } catch (error) {
        console.error("Publish error:", error);
        // Revert optimistic update on error
        startTransition(() => {
          router.refresh();
        });
        toast.error("An unexpected error occurred");
      }
    },
    [initialPosts, selectedPost, router],
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedPosts.size === 0) {
      toast.error("Please select posts to delete");
      return;
    }

    if (
      !confirm(`Are you sure you want to delete ${selectedPosts.size} post(s)?`)
    )
      return;

    try {
      const result = await bulkDeletePosts(Array.from(selectedPosts));

      if (result.success) {
        toast.success(result.message || "Posts deleted successfully");
        setSelectedPosts(new Set());
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Bulk delete failed", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("An unexpected error occurred");
    }
  }, [selectedPosts, router]);

  // Handle bulk publish
  const handleBulkPublish = useCallback(async () => {
    if (selectedPosts.size === 0) {
      toast.error("Please select posts to publish");
      return;
    }

    try {
      const result = await bulkPublishPosts(Array.from(selectedPosts));

      if (result.success) {
        toast.success(result.message || "Posts published successfully");
        setSelectedPosts(new Set());
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Bulk publish failed", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Bulk publish error:", error);
      toast.error("An unexpected error occurred");
    }
  }, [selectedPosts, router]);

  // Handle edit
  const handleEdit = useCallback((post: GMBPost) => {
    setSelectedPost(post);
    setEditDialogOpen(true);
  }, []);

  // Toggle post selection
  const togglePostSelection = useCallback((postId: string) => {
    setSelectedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        updateFilter("search", value || null);
      }, 500);
    },
    [updateFilter],
  );

  // Cleanup search timeout on unmount
  useMemo(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Pagination
  const totalPages = useMemo(() => Math.ceil(totalCount / 50), [totalCount]);
  const currentPage = currentFilters.page || 1;

  // Filter clearing check
  const hasActiveFilters = useMemo(
    () =>
      currentFilters.locationId ||
      currentFilters.postType !== "all" ||
      currentFilters.status !== "all" ||
      currentFilters.searchQuery,
    [currentFilters],
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 border-b border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Posts Management</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create and manage your Google Business Profile posts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile AI Assistant Button */}
          <Button
            onClick={() => setAiSidebarOpen(true)}
            variant="outline"
            className="lg:hidden border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
          <Button
            onClick={handleSync}
            disabled={isSyncing || !currentFilters.locationId}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Posts"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Total Posts</p>
                <p className="text-3xl font-bold text-zinc-100">
                  {stats.total || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Published</p>
                <p className="text-3xl font-bold text-green-400">
                  {stats.published || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Drafts</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {stats.drafts || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Scheduled</p>
                <p className="text-3xl font-bold text-blue-400">
                  {stats.scheduled || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">This Week</p>
                <p className="text-3xl font-bold text-zinc-100">
                  {stats.thisWeek || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Location Filter */}
          <select
            value={currentFilters.locationId || ""}
            onChange={(e) => updateFilter("location", e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          {/* Post Type Filter */}
          <select
            value={currentFilters.postType || "all"}
            onChange={(e) =>
              updateFilter(
                "postType",
                e.target.value === "all" ? null : e.target.value,
              )
            }
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="whats_new">What's New</option>
            <option value="event">Event</option>
            <option value="offer">Offer</option>
          </select>

          {/* Status Filter */}
          <select
            value={currentFilters.status || "all"}
            onChange={(e) =>
              updateFilter(
                "status",
                e.target.value === "all" ? null : e.target.value,
              )
            }
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="queued">Scheduled</option>
            <option value="failed">Failed</option>
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search posts..."
              defaultValue={currentFilters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-orange-500"
              aria-label="Search posts"
            />
          </div>

          {/* Bulk Actions */}
          {selectedPosts.size > 0 && (
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label="Bulk actions"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkPublish}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                aria-label={`Publish ${selectedPosts.size} selected posts`}
              >
                <Send className="w-4 h-4 mr-2" />
                Publish ({selectedPosts.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                aria-label={`Delete ${selectedPosts.size} selected posts`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedPosts.size})
              </Button>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => router.push("/posts")}
              className="text-zinc-400 hover:text-zinc-200"
              aria-label="Clear all filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Posts List - Left Side */}
        <div className="flex-1 overflow-auto">
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          )}

          {!isPending && initialPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-lg mb-2">No posts found</p>
              <p className="text-zinc-600 text-sm">
                {currentFilters.locationId
                  ? "Try syncing posts or creating a new one"
                  : "Select a location to view posts or create a new post"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {initialPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => setSelectedPost(post)}
                  isSelected={selectedPost?.id === post.id}
                  isCheckboxSelected={selectedPosts.has(post.id)}
                  onCheckboxChange={() => togglePostSelection(post.id)}
                  onEdit={() => handleEdit(post)}
                  onDelete={() => handleDelete(post.id)}
                  onPublish={() => handlePublish(post.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar - Right Side */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <div className="sticky top-6 h-[calc(100vh-8rem)]">
            <AIAssistantSidebar
              selectedPost={selectedPost}
              stats={stats}
              locationId={currentFilters.locationId}
            />
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => updateFilter("page", (currentPage - 1).toString())}
              className="border-zinc-700 text-zinc-300"
            >
              Previous
            </Button>

            <span className="text-zinc-400 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => updateFilter("page", (currentPage + 1).toString())}
              className="border-zinc-700 text-zinc-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Post Dialog */}
      <CreatePostDialog
        isOpen={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
        }}
        onSuccess={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
        locations={locations}
      />

      {/* Edit Post Dialog */}
      {selectedPost && (
        <EditPostDialog
          post={selectedPost}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedPost(null);
          }}
          onSuccess={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      )}

      {/* Mobile AI Assistant Sheet */}
      <Sheet open={aiSidebarOpen} onOpenChange={setAiSidebarOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 p-0 overflow-y-auto"
        >
          <SheetHeader className="p-6 border-b border-zinc-800">
            <SheetTitle className="text-white">AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <AIAssistantSidebar
              selectedPost={selectedPost}
              stats={stats}
              locationId={currentFilters.locationId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
