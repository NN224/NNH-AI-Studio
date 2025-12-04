"use client";

/**
 * 📋 APPROVALS DASHBOARD COMPONENT
 *
 * Dedicated dashboard for managing all pending AI actions.
 * Features:
 * - Filter by type, confidence, attention flags
 * - Bulk approve/reject actions
 * - Real-time stats
 * - History view
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ApprovalCard } from "@/components/command-center/approval-card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CheckSquare,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface PendingAction {
  id: string;
  actionType: "review_reply" | "question_answer" | "post";
  referenceData: {
    reviewerName?: string;
    rating?: number;
    reviewText?: string;
    questionText?: string;
  };
  aiGeneratedContent: string;
  aiConfidence: number;
  requiresAttention: boolean;
  attentionReason?: string;
  createdAt: Date;
  status: string;
}

interface Stats {
  total: number;
  reviewReplies: number;
  questionAnswers: number;
  posts: number;
  requiresAttention: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ApprovalsDashboard() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    reviewReplies: 0,
    questionAnswers: 0,
    posts: 0,
    requiresAttention: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [filterAttention, setFilterAttention] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<string>("pending");

  // Fetch data
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterAttention === "yes") params.set("attention", "true");
      params.set("status", statusTab);

      const response = await fetch(`/api/ai/pending?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setActions(data.data.actions || []);
        setStats(data.data.counts || {});
      }
    } catch (error) {
      toast.error("Failed to load pending actions");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterAttention, statusTab]);

  // Filter actions by confidence
  const filteredActions = actions.filter((action) => {
    if (filterConfidence === "all") return true;
    if (filterConfidence === "high") return action.aiConfidence >= 85;
    if (filterConfidence === "medium")
      return action.aiConfidence >= 70 && action.aiConfidence < 85;
    if (filterConfidence === "low") return action.aiConfidence < 70;
    return true;
  });

  // Handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredActions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActions.map((a) => a.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleApprove = async (actionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(actionId));

    try {
      const response = await fetch(`/api/ai/pending/${actionId}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Reply approved and published!");
        setActions((prev) => prev.filter((a) => a.id !== actionId));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(actionId);
          return newSet;
        });
      } else {
        toast.error(data.error || "Failed to approve");
      }
    } catch (error) {
      toast.error("Failed to approve action");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(actionId));

    try {
      const response = await fetch(`/api/ai/pending/${actionId}/reject`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Action rejected");
        setActions((prev) => prev.filter((a) => a.id !== actionId));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(actionId);
          return newSet;
        });
      } else {
        toast.error(data.error || "Failed to reject");
      }
    } catch (error) {
      toast.error("Failed to reject action");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  const handleEdit = (actionId: string) => {
    // TODO: Open edit dialog
    toast.info("Edit functionality coming soon");
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    const idsArray = Array.from(selectedIds);
    toast.info(`Approving ${idsArray.length} actions...`);

    for (const id of idsArray) {
      await handleApprove(id);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    const idsArray = Array.from(selectedIds);
    toast.info(`Rejecting ${idsArray.length} actions...`);

    for (const id of idsArray) {
      await handleReject(id);
    }
  };

  // Stats cards
  const statsCards = [
    {
      title: "Total Pending",
      value: stats.total,
      icon: Clock,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Review Replies",
      value: stats.reviewReplies,
      icon: CheckCircle2,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Needs Attention",
      value: stats.requiresAttention,
      icon: AlertTriangle,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Questions",
      value: stats.questionAnswers,
      icon: XCircle,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions Bar */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Filters:</span>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="review_reply">Review Replies</SelectItem>
                  <SelectItem value="question_answer">Questions</SelectItem>
                  <SelectItem value="post">Posts</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterConfidence}
                onValueChange={setFilterConfidence}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (85%+)</SelectItem>
                  <SelectItem value="medium">Medium (70-84%)</SelectItem>
                  <SelectItem value="low">Low (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterAttention}
                onValueChange={setFilterAttention}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Attention" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Needs Attention</SelectItem>
                  <SelectItem value="no">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>

              {selectedIds.size > 0 && (
                <>
                  <Badge variant="secondary">{selectedIds.size} selected</Badge>
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkReject}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject All
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="bg-zinc-900/50">
          <TabsTrigger value="pending">Pending ({stats.total})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="publish_failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="mt-4">
          {/* Select All */}
          {statusTab === "pending" && filteredActions.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedIds.size === filteredActions.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-zinc-400">
                Select all {filteredActions.length} items
              </span>
            </div>
          )}

          {/* Actions List */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredActions.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-12 text-center">
                    <CheckSquare className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">
                      {statusTab === "pending"
                        ? "No pending actions. Great job!"
                        : `No ${statusTab} actions.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredActions.map((action) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-3"
                  >
                    {statusTab === "pending" && (
                      <Checkbox
                        checked={selectedIds.has(action.id)}
                        onCheckedChange={() => handleSelect(action.id)}
                        className="mt-4"
                      />
                    )}
                    <div className="flex-1">
                      <ApprovalCard
                        action={action}
                        onApprove={() => handleApprove(action.id)}
                        onReject={() => handleReject(action.id)}
                        onEdit={() => handleEdit(action.id)}
                        isProcessing={processingIds.has(action.id)}
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
