import { createClient } from "@/lib/supabase/server";
import {
  handleApiAuth,
  safeApiHandler,
} from "@/lib/utils/api-response-handler";
import { DashboardData, safeDashboardData } from "@/lib/utils/data-guards";
import { getCachedDashboardData } from "@/server/actions/dashboard";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Dashboard Overview API
 * Returns comprehensive dashboard snapshot data with safe fallbacks
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
      const result = await getCachedDashboardData(authResult.user.id);
      return safeDashboardData(result.data);
    },
    // القيم الافتراضية في حالة الفشل
    safeDashboardData({}),
    {
      apiName: "dashboard/overview",
      userId: authResult.user.id,
      isDashboard: true,
    },
  );
}
