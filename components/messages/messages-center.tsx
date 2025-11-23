"use client";

import { useState } from "react";
import {
  MessageSquare,
  Star,
  Search,
  Send,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useMessages, Message } from "@/hooks/use-messages";
import { useLocations } from "@/hooks/use-locations";
import { useReviews } from "@/hooks/use-reviews";
import { replyToReview } from "@/server/actions/reviews-management";
import { toast } from "sonner";
import type { GMBReview } from "@/lib/types/database";

export function MessagesCenter() {
  const { locations } = useLocations();
  const locationId = locations?.[0]?.id || "";

  const { messages, isLoading, sendMessage } = useMessages(locationId);
  const { reviews, loading: reviewsLoading } = useReviews({
    initialFilters: { locationId },
  });

  const [activeTab, setActiveTab] = useState("messages");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedReview, setSelectedReview] = useState<GMBReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText) return;

    setIsSending(true);
    try {
      if (activeTab === "messages" && selectedMessage) {
        await sendMessage.mutateAsync({
          content: replyText,
          platform: selectedMessage.platform,
          recipientId: selectedMessage.sender, // Simplified
        });
      } else if (activeTab === "reviews" && selectedReview) {
        const result = await replyToReview(selectedReview.id, replyText);
        if (!result.success) {
          throw new Error(result.error || "Failed to reply to review");
        }
        toast.success("Reply sent successfully");
      }
      setReplyText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send reply",
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || reviewsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 p-4 lg:p-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Communication Center
          </h2>
          <p className="text-muted-foreground">
            Manage all your customer interactions in one place.
          </p>
        </div>
      </div>

      <Card className="flex-1 flex overflow-hidden border-zinc-800/50 bg-zinc-900/30">
        {/* Sidebar List */}
        <div className="w-80 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <Tabs
              defaultValue="messages"
              className="w-full"
              onValueChange={setActiveTab}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="mt-4 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {activeTab === "messages" ? (
                messages?.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No messages yet
                  </div>
                ) : (
                  messages?.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`flex items-start gap-3 p-4 text-left hover:bg-zinc-800/50 transition ${selectedMessage?.id === msg.id ? "bg-zinc-800/50" : ""}`}
                    >
                      <Avatar>
                        <AvatarFallback>{msg.sender[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-medium ${msg.unread ? "text-white" : "text-zinc-400"}`}
                          >
                            {msg.sender}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {msg.timestamp}
                          </span>
                        </div>
                        <p
                          className={`text-sm truncate ${msg.unread ? "text-zinc-300 font-medium" : "text-zinc-500"}`}
                        >
                          {msg.preview}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-1.5 capitalize"
                          >
                            {msg.platform}
                          </Badge>
                        </div>
                      </div>
                      {msg.unread && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </button>
                  ))
                )
              ) : reviews?.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No reviews yet
                </div>
              ) : (
                reviews?.map((review) => (
                  <div
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className={`p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30 transition cursor-pointer ${selectedReview?.id === review.id ? "bg-zinc-800/50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {review.reviewer_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {review.reviewer_name || "Anonymous"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex text-yellow-500 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < (review.rating || 0) ? "fill-current" : "text-zinc-700"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {review.review_text || "No comment"}
                    </p>
                    {!review.reply_text && (
                      <Badge
                        variant="secondary"
                        className="mt-2 text-[10px] bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                      >
                        Needs Reply
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-zinc-950/30">
          {selectedMessage && activeTab === "messages" ? (
            <>
              {/* Message Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{selectedMessage.sender[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedMessage.sender}</h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      via {selectedMessage.platform} •{" "}
                      {selectedMessage.timestamp}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>

              {/* Message Body */}
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  <div className="self-start max-w-[80%] rounded-lg rounded-tl-none bg-zinc-800 p-3 text-sm">
                    {selectedMessage.fullContent || selectedMessage.preview}
                  </div>
                  {/* Mock Reply for now, in real app we'd fetch thread */}
                </div>
              </ScrollArea>

              {/* Reply Input */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    className="min-h-[80px] resize-none bg-zinc-950 border-zinc-800 focus-visible:ring-primary"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <Button
                    className="h-[80px] w-[80px] flex flex-col gap-1"
                    onClick={handleSendReply}
                    disabled={sendMessage.isPending}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : selectedReview && activeTab === "reviews" ? (
            <>
              {/* Review Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {selectedReview.reviewer_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedReview.reviewer_name || "Anonymous"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < (selectedReview.rating || 0) ? "fill-current" : "text-zinc-700"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {new Date(
                          selectedReview.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>

              {/* Review Body */}
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  <div className="self-start max-w-[80%] rounded-lg rounded-tl-none bg-zinc-800 p-3 text-sm">
                    {selectedReview.review_text || "No comment"}
                  </div>
                  {selectedReview.reply_text && (
                    <div className="self-end max-w-[80%] rounded-lg rounded-tr-none bg-primary/20 text-primary-foreground p-3 text-sm">
                      <p className="text-xs text-primary/70 mb-1">
                        You replied:
                      </p>
                      {selectedReview.reply_text}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Reply Input */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    className="min-h-[80px] resize-none bg-zinc-950 border-zinc-800 focus-visible:ring-primary"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <Button
                    className="h-[80px] w-[80px] flex flex-col gap-1"
                    onClick={handleSendReply}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 opacity-50" />
              </div>
              <p>Select a conversation or review to start messaging</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
