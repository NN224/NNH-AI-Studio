/**
 * معالج موحد لاستجابات واجهات برمجة التطبيقات
 * يوفر طبقة حماية ضد الأخطاء غير المتوقعة ويضمن استجابة منظمة
 */

import { safeDashboardData } from "@/lib/utils/data-guards";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

/**
 * أنواع الاستجابات المدعومة
 */
export type ApiResponse<T> =
  | {
      data: T;
      error?: never;
      status: "success";
    }
  | {
      data?: never;
      error: string;
      status: "error";
    };

/**
 * دالة لمعالجة استجابات واجهات برمجة التطبيقات بشكل آمن
 * - تضمن دائماً إرجاع استجابة صالحة حتى في حالة الأخطاء
 * - توفر قيم افتراضية آمنة
 * - تسجيل الأخطاء بشكل منظم
 */
export async function safeApiHandler<T>(
  handler: () => Promise<T>,
  fallbackData: T,
  context: {
    apiName: string;
    userId?: string;
    isDashboard?: boolean;
  },
): Promise<NextResponse> {
  try {
    const result = await handler();
    const safeResult =
      context.isDashboard && !result
        ? (safeDashboardData({}) as T)
        : result || fallbackData;

    const response: ApiResponse<T> = {
      data: safeResult,
      status: "success",
    };

    return NextResponse.json(response);
  } catch (error) {
    // تسجيل الخطأ بالتفاصيل
    apiLogger.error(
      `Error in ${context.apiName}`,
      error instanceof Error ? error : new Error(String(error)),
      { userId: context.userId },
    );

    // إرجاع بيانات افتراضية في بيئة الإنتاج، تفاصيل الخطأ في بيئة التطوير
    if (process.env.NODE_ENV === "production") {
      const safeResponse: ApiResponse<T> = {
        data: context.isDashboard ? (safeDashboardData({}) as T) : fallbackData,
        status: "success",
      };
      return NextResponse.json(safeResponse);
    } else {
      const errorResponse: ApiResponse<T> = {
        error: error instanceof Error ? error.message : String(error),
        status: "error",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
}

/**
 * معالج لطلبات المصادقة في واجهات البرمجة
 * يتحقق من وجود مستخدم مسجل دخوله ويرجع استجابة خطأ إذا لم يكن موجوداً
 */
export function handleApiAuth<T>(
  user: T | null | undefined,
  unauthorizedMessage: string = "Unauthorized",
):
  | { isAuthorized: true; user: T }
  | { isAuthorized: false; response: NextResponse } {
  if (!user) {
    return {
      isAuthorized: false,
      response: NextResponse.json(
        { error: unauthorizedMessage },
        { status: 401 },
      ),
    };
  }

  return {
    isAuthorized: true,
    user,
  };
}

/**
 * معالج للتحقق من صحة المعلمات في واجهات البرمجة
 */
export function validateApiParams<T extends Record<string, unknown>>(
  params: T,
  requiredKeys: (keyof T)[],
): { isValid: true } | { isValid: false; response: NextResponse } {
  const missingParams = requiredKeys.filter((key) => params[key] === undefined);

  if (missingParams.length > 0) {
    return {
      isValid: false,
      response: NextResponse.json(
        {
          error: "Missing required parameters",
          missingParams,
        },
        { status: 400 },
      ),
    };
  }

  return { isValid: true };
}
