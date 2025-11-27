import { requireAdmin } from "@/lib/auth/admin-check";

export async function GET() {
  // This endpoint checks if the current user is an admin
  const adminCheck = await requireAdmin();

  if (adminCheck) {
    return adminCheck; // Return error if not admin
  }

  return Response.json({
    success: true,
    message: "Admin access confirmed",
    timestamp: new Date().toISOString(),
  });
}
