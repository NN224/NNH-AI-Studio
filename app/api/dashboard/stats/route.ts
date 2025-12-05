import { createClient } from "@/lib/supabase/server";
import {
  handleApiAuth,
  safeApiHandler,
} from "@/lib/utils/api-response-handler";
import { DashboardData, safeDashboardData } from "@/lib/utils/data-guards";
import { getDashboardStats } from "@/server/actions/dashboard";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Dashboard Stats API
 * Returns basic dashboard statistics with safe fallbacks
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // التحقق من المصادقة
  const authResult = handleApiAuth(user);
  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  // استخدام معالج API الآمن
  return safeApiHandler<DashboardData>(
    async () => {
      const stats = await getDashboardStats();
      return safeDashboardData(stats);
    },
    // القيم الافتراضية في حالة الفشل
    safeDashboardData({}),
    {
      apiName: "dashboard/stats",
      userId: authResult.user.id, // نستخدم user من authResult لأنه مؤكد أنه موجود
      isDashboard: true,
    },
  );
}
