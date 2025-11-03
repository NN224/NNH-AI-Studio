'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// 💡 سنفترض أننا نستخدم مكوناً جديداً لبيئة العمل
import { ReviewResponseCockpit } from '@/components/reviews/review-response-cockpit';
import { BarChart3, MessageSquare, ShieldCheck, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ⭐️ مكون بطاقة التحليل العاطفي (Sentiment Analysis Card) ⭐️
const SentimentAnalysisCard = () => {
    // 💡 يمكن جلب هذه البيانات من API جديد مثل /api/reviews/sentiment
    const sentimentData = [
        { label: 'Positive', value: 75, color: 'text-green-500', icon: ShieldCheck },
        { label: 'Neutral', value: 15, color: 'text-yellow-500', icon: Clock },
        { label: 'Negative', value: 10, color: 'text-red-500', icon: AlertTriangle },
    ];

    return (
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5"/> Sentiment Analysis
                </CardTitle>
                <CardDescription>Customer emotion breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {sentimentData.map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                        <div className={cn("flex items-center gap-2", item.color)}>
                            <item.icon className="w-4 h-4"/>
                            <span>{item.label}</span>
                        </div>
                        <span className="font-semibold">{item.value}%</span>
                    </div>
                ))}
                <div className="pt-2 border-t mt-3">
                    <p className="text-xs font-semibold">Hot Topics:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs bg-muted p-1 rounded">Staff (15)</span>
                        <span className="text-xs bg-muted p-1 rounded">Pricing (8)</span>
                        <span className="text-xs bg-muted p-1 rounded">Wait Time (5)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


export default function ReviewsPage() {
return (
<div className="space-y-6">
<div>
<h1 className="text-3xl font-bold tracking-tight">AI Review Cockpit</h1>
<p className="text-muted-foreground mt-2">
Manage, analyze, and generate AI responses for customer reviews
</p>
</div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* ⭐️ بطاقة التحليل الجديدة (العمود 1) */}
        <SentimentAnalysisCard />

        {/* ⭐️ بطاقة الردود الفورية (العمود 2-4) ⭐️ */}
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5"/> Pending Responses
                </CardTitle>
                <CardDescription>Prioritize and resolve reviews by impact and sentiment.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* 💡 هذا هو المكون الذي سيحتوي على القائمة والردود الآلية */}
                <ReviewResponseCockpit />
            </CardContent>
        </Card>
      </div>

      {/* 💡 يمكن وضع ReviewsList هنا مؤقتاً إذا لم يكن لديك ReviewResponseCockpit جاهزاً */}
</div>
);
}