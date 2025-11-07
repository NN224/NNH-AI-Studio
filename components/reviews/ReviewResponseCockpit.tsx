"use client"

import { useState, useEffect, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Send, Sparkles, MessageSquare, Star, Zap, TrendingUp, Clock, User, Bot, Copy, RotateCw, Check, AlertCircle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Review {
    id: string;
    review_date: string;
    reviewer_name: string;
    rating: number;
    review_text: string;
    review_reply: string | null;
    location_name: string;
    location_id: string;
    platform: 'google';
}

const toneOptions = [
    { value: 'friendly', label: '😊 Friendly', icon: '👋', color: 'from-blue-500 to-cyan-500' },
    { value: 'formal', label: '👔 Professional', icon: '💼', color: 'from-purple-500 to-pink-500' },
    { value: 'apologetic', label: '🙏 Apologetic', icon: '💐', color: 'from-red-500 to-orange-500' },
    { value: 'marketing', label: '🎯 Marketing', icon: '🚀', color: 'from-green-500 to-emerald-500' },
];

const templates = [
    { id: 't1', label: 'Thank & Invite', preview: 'Thank you for your kind words! We\'d love to see you again...' },
    { id: 't2', label: 'Apologize & Resolve', preview: 'We sincerely apologize for your experience. Please contact us...' },
    { id: 't3', label: 'Feature Highlight', preview: 'Glad you enjoyed our service! Did you know we also offer...' },
];

export function ReviewResponseCockpit() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [replyContent, setReplyContent] = useState<string>('');
    const [tone, setTone] = useState<string>('friendly');
    const [aiLoading, setAiLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Fetch pending reviews from API
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/reviews/pending');
                if (!response.ok) {
                    throw new Error('Failed to fetch reviews');
                }
                const result = await response.json();
                // Transform API response to match Review interface
                const transformedReviews: Review[] = (result.reviews || []).map((r: {
                    id: string;
                    review_date?: string;
                    created_at?: string;
                    reviewer_name?: string;
                    rating?: number;
                    review_text?: string;
                    reply_text?: string;
                    review_reply?: string | null;
                    gmb_locations?: { location_name?: string };
                    location_name?: string;
                    location_id: string;
                }) => ({
                    id: r.id,
                    review_date: r.review_date || r.created_at || '',
                    reviewer_name: r.reviewer_name || 'Anonymous',
                    rating: r.rating || 0,
                    review_text: r.review_text || '',
                    review_reply: r.reply_text || r.review_reply || null,
                    location_name: r.gmb_locations?.location_name || r.location_name || 'Unknown Location',
                    location_id: r.location_id,
                    platform: 'google' as const
                }));
                setReviews(transformedReviews);
            } catch (error) {
                console.error('Error fetching reviews:', error);
                setReviews([]);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    const getSentimentColor = (rating: number) => {
        if (rating >= 4) return 'from-success/20 to-success/10 border-success/50';
        if (rating === 3) return 'from-warning/20 to-warning/10 border-warning/50';
        return 'from-destructive/20 to-destructive/10 border-destructive/50';
    };

    const getSentimentIcon = (rating: number) => {
        if (rating >= 4) return '🎉';
        if (rating === 3) return '😐';
        return '😞';
    };

    const handleGenerateAI = async (retry = false) => {
        if (!selectedReview) return;
        setAiLoading(true);
        setAiError(null);

        try {
            const startTime = Date.now();
            const response = await fetch('/api/ai/generate-review-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewText: selectedReview.review_text,
                    rating: selectedReview.rating,
                    tone: tone,
                    locationName: selectedReview.location_name
                })
            });

            const result = await response.json();
            const duration = Date.now() - startTime;

            if (!response.ok || result.error) {
                throw new Error(result.error || "Failed to generate AI response.");
            }

            if (!result.reply || result.reply.trim().length === 0) {
                throw new Error("AI generated an empty response. Please try again.");
            }

            setReplyContent(result.reply);
            setRetryCount(0);
            
            if (duration < 5000) {
                toast.success(`✨ AI response generated in ${Math.round(duration / 1000)}s!`);
            } else {
                toast.success("✨ AI response generated!");
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Failed to generate AI response. Please check your API configuration.";
            setAiError(errorMessage);
            
            if (!retry && retryCount < 2) {
                // Auto-retry once on failure
                setRetryCount(prev => prev + 1);
                toast.error(`${errorMessage} Retrying...`);
                setTimeout(() => handleGenerateAI(true), 1000);
            } else {
                toast.error(errorMessage);
                setReplyContent("Could not generate AI reply. Please try a different tone or check your API configuration.");
            }
        } finally {
            setAiLoading(false);
        }
    }

    const handleRetry = () => {
        setRetryCount(0);
        handleGenerateAI(false);
    }

    const handleSubmitReply = async () => {
        if (!selectedReview || !replyContent.trim()) return;
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/gmb/reviews/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewId: selectedReview.id,
                    locationId: selectedReview.location_id,
                    replyText: replyContent
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || "Failed to publish reply to Google.");
            }

            toast.success("🎉 Reply published to Google!");
            setReviews(prev => prev.filter(r => r.id !== selectedReview.id));
            setSelectedReview(null);
            setReplyContent('');

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleSelectReview = (review: Review) => {
        setSelectedReview(review);
        setReplyContent('');
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(replyContent);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full">
            {/* AI Command Bar */}
            <div className="relative bg-gradient-to-r from-[#FF6B00]/10 via-black to-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-lg p-4 mb-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF6B00]/5 to-transparent animate-pulse" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute -inset-2 bg-[#FF6B00]/20 rounded-full blur-lg animate-pulse" />
                            <div className="relative w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#FF8C42] rounded-full flex items-center justify-center">
                                <Bot className="w-6 h-6 text-black" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                AI Copilot
                                <span className="px-2 py-0.5 text-xs bg-[#FF6B00]/20 text-[#FF6B00] rounded-full border border-[#FF6B00]/50">
                                    {aiLoading ? 'Generating...' : 'Ready'}
                                </span>
                            </h3>
                            <p className="text-sm text-gray-400">Powered by Aurora AI • Generate replies in seconds</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#FF6B00]">{reviews.length}</div>
                            <div className="text-xs text-gray-400">Pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-success">-</div>
                            <div className="text-xs text-gray-400">Response Rate</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-info">-</div>
                            <div className="text-xs text-gray-400">Avg. Time</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Two-Column Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* LEFT: Review Stream */}
                <div className="lg:col-span-4 flex flex-col min-h-0">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Review Stream</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <TrendingUp className="w-3 h-3" />
                            <span>Priority Sorted</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0">
                        {loading ? (
                            <Card className="p-8 text-center border-dashed border-gray-700">
                                <Loader2 className="w-12 h-12 mx-auto mb-3 text-gray-600 animate-spin" />
                                <p className="text-gray-400">Loading reviews...</p>
                            </Card>
                        ) : reviews.length === 0 ? (
                            <Card className="p-8 text-center border-dashed border-gray-700">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-400">No pending reviews</p>
                            </Card>
                        ) : (
                            reviews.map(review => (
                                <Card 
                                    key={review.id}
                                    onClick={() => handleSelectReview(review)}
                                    className={cn(
                                        "relative cursor-pointer transition-all duration-300 hover:scale-[1.02] border overflow-hidden",
                                        "bg-gradient-to-br", getSentimentColor(review.rating),
                                        selectedReview?.id === review.id 
                                            ? "ring-2 ring-[#FF6B00] shadow-lg shadow-[#FF6B00]/20" 
                                            : "hover:border-[#FF6B00]/50"
                                    )}
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{getSentimentIcon(review.rating)}</span>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-white">{review.reviewer_name}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                        {Array.from({ length: review.rating }).map((_, i) => (
                                                            <Star key={i} className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <Clock className="w-4 h-4 text-gray-500" />
                                        </div>
                                        
                                        <p className="text-xs text-gray-300 line-clamp-2 mb-3">
                                            {review.review_text}
                                        </p>
                                        
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="truncate">{review.location_name}</span>
                                            <span>{formatDistanceToNow(new Date(review.review_date), { addSuffix: true })}</span>
                                        </div>

                                        {selectedReview?.id === review.id && (
                                            <div className="absolute top-2 right-2">
                                                <div className="w-2 h-2 bg-[#FF6B00] rounded-full animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: AI Studio Panel */}
                <div className="lg:col-span-8 flex flex-col min-h-0">
                    {!selectedReview ? (
                        <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-gray-700 bg-black/30">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-[#FF6B00]/20 rounded-full blur-2xl" />
                                <Sparkles className="relative w-16 h-16 text-[#FF6B00] mb-4" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Select a Review to Begin</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Choose a review from the stream to generate AI-powered responses in seconds
                            </p>
                        </Card>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4 min-h-0">
                            {/* Review Context Card */}
                            <Card className="border-[#FF6B00]/30 bg-gradient-to-br from-[#FF6B00]/5 to-black">
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{getSentimentIcon(selectedReview.rating)}</span>
                                            <div>
                                                <h4 className="font-bold text-white flex items-center gap-2">
                                                    {selectedReview.reviewer_name}
                                                    <span className="text-xs px-2 py-0.5 bg-warning/20 text-warning rounded-full border border-warning/50">
                                                        {selectedReview.rating} ★
                                                    </span>
                                                </h4>
                                                <p className="text-xs text-gray-400">{selectedReview.location_name} • {formatDistanceToNow(new Date(selectedReview.review_date), { addSuffix: true })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {selectedReview.review_text}
                                    </p>
                                </div>
                            </Card>

                            {/* Tone Selector */}
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Response Tone
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {toneOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTone(opt.value)}
                                            disabled={aiLoading}
                                            className={cn(
                                                "relative p-3 rounded-lg border-2 transition-all duration-300",
                                                "hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
                                                tone === opt.value
                                                    ? `border-[#FF6B00] bg-gradient-to-br ${opt.color} shadow-lg`
                                                    : "border-gray-700 bg-black/50 hover:border-gray-600"
                                            )}
                                        >
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">{opt.icon}</div>
                                                <div className="text-xs font-medium text-white">{opt.label}</div>
                                            </div>
                                            {tone === opt.value && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B00] rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-black" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button with Error Handling */}
                            <div className="space-y-2">
                                <Button
                                    onClick={() => handleGenerateAI(false)}
                                    disabled={aiLoading || isSubmitting}
                                    className="relative w-full h-14 bg-gradient-to-r from-[#FF6B00] to-[#FF8C42] hover:from-[#FF8C42] hover:to-[#FF6B00] text-black font-bold text-base shadow-lg shadow-[#FF6B00]/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 min-h-[44px] md:min-h-[56px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    aria-label={aiLoading ? "Generating AI response" : "Generate AI response for this review"}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-lg" />
                                    <div className="relative flex items-center justify-center gap-3">
                                        {aiLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                                <span>Generating Magic...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" aria-hidden="true" />
                                                <span>Generate with AI</span>
                                                <Zap className="w-5 h-5" aria-hidden="true" />
                                            </>
                                        )}
                                    </div>
                                </Button>
                                
                                {/* Error Message and Retry */}
                                {aiError && !aiLoading && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-destructive" aria-hidden="true" />
                                            <p className="text-xs text-destructive">{aiError}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleRetry}
                                            className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                                            aria-label="Retry generating AI response"
                                        >
                                            <RotateCw className="w-3 h-3 mr-1" aria-hidden="true" />
                                            Retry
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Response Preview Area */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Your Response
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                            {replyContent.length} chars
                                        </span>
                                        {replyContent && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleCopy}
                                                className="h-7 px-2 text-xs"
                                            >
                                                {copied ? <Check className="w-3 h-3 text-success" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex-1 relative min-h-0">
                                    <Textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="✨ Click 'Generate with AI' to create a response, or write your own..."
                                        disabled={aiLoading || isSubmitting}
                                        className="h-full resize-none bg-black/50 border-gray-700 focus:border-[#FF6B00] focus:ring-[#FF6B00] text-white placeholder:text-gray-600"
                                    />
                                    {!replyContent && !aiLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <Lightbulb className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                                                <p className="text-sm text-gray-600">AI response will appear here</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedReview(null);
                                        setReplyContent('');
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 border-gray-700 hover:bg-gray-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitReply}
                                    disabled={!replyContent.trim() || isSubmitting}
                                    className="flex-1 bg-success hover:bg-success/90 text-white font-semibold min-h-[44px] md:min-h-0 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Publishing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Publish to Google
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
