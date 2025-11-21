import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewsPageClient } from "@/components/reviews/ReviewsPageClient";
import { getAuthUrl } from "@/lib/utils/navigation";

export default async function ReviewsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: {
    location?: string;
    rating?: string;
    status?: string;
    sentiment?: string;
    page?: string;
    search?: string;
  };
}) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const locale = params.locale || "en";
    redirect(getAuthUrl(locale as "en" | "ar", "login"));
  }

  // Type assertion: user is guaranteed to be non-null after the redirect check
  const userId = user!.id;

  // Fetch locations for the filter dropdown
  const { data: locations } = await supabase
    .from("gmb_locations")
    .select("id, location_name")
    .eq("user_id", userId)
    .eq("is_active", true);

  // Pass initial filters from URL search params
  const initialFilters = {
    locationId: searchParams.location,
    rating: searchParams.rating ? parseInt(searchParams.rating) : undefined,
    status: searchParams.status as
      | "pending"
      | "replied"
      | "responded"
      | "flagged"
      | "archived"
      | undefined,
    sentiment: searchParams.sentiment as
      | "positive"
      | "neutral"
      | "negative"
      | undefined,
    search: searchParams.search,
  };

  return (
    <ReviewsPageClient
      locations={locations || []}
      initialFilters={initialFilters}
    />
  );
}
