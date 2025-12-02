// app/api/gmb/questions/answer/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
// 💡 افتراض: استيراد الدوال المساعدة من ملفات الـ Helpers لديك
import { getValidAccessToken } from "@/lib/gmb/helpers";
import { questionsLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const QANDA_API_BASE = "https://mybusinessqanda.googleapis.com/v1";

/**
 * مسار API لنشر إجابة على سؤال في Google API.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { questionId, locationId, answerText } = await request.json();

    if (!questionId || !locationId || !answerText) {
      return NextResponse.json(
        { error: "Missing required IDs or answer text." },
        { status: 400 },
      );
    }

    // 1. الحصول على رمز الوصول
    const { data: account } = await supabase
      .from("gmb_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "No active GMB account found." },
        { status: 403 },
      );
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    // 2. بناء مسار API Q&A
    // API Q&A uses format: locations/{location_id}/questions/{question_id}/answers
    // 💡 ملاحظة: يجب أن يكون questionId مُمرراً بالاسم الكامل (questions/...) أو جزء ID
    const answerResource = `questions/${questionId}/answers`;

    const publishUrl = `${QANDA_API_BASE}/${answerResource}`;

    const bodyData = {
      // يتم إرسال الإجابة ككائن answers.
      answers: [
        {
          text: answerText,
          // 💡 يمكن إضافة لغة إذا كانت مطلوبة
        },
      ],
    };

    const response = await fetch(publishUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    });

    const data = await response.json();

    if (!response.ok) {
      questionsLogger.error(
        "Failed to post answer to Google Q&A",
        new Error(data.error?.message || "Failed to publish answer."),
        { questionId, locationId, userId: user.id, errorData: data },
      );
      throw new Error(data.error?.message || "Failed to publish answer.");
    }

    // 3. تحديث حالة السؤال في قاعدة بياناتك (اختياري لكن موصى به)
    // await supabase.from('gmb_questions').update({ has_answer: true, answer_date: new Date().toISOString() }).eq('id', questionId);

    // 4. إرجاع النتيجة
    return NextResponse.json({
      success: true,
      message: "Answer posted successfully to Google.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    questionsLogger.error(
      "API Error during Q&A answer",
      error instanceof Error ? error : new Error(errorMessage),
      { userId: user?.id },
    );
    return NextResponse.json(
      { error: errorMessage || "Failed to process Q&A answer" },
      { status: 500 },
    );
  }
}
