// Simple HTML sanitization without DOM dependencies
// This works on both client and server without requiring jsdom
export function sanitizeHtml(input?: string | null): string {
  if (!input) {
    return "";
  }

  // Remove all HTML tags and decode HTML entities
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}
