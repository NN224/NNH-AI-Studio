/**
 * Marketing Layout
 *
 * This layout wraps the marketing pages (landing page, pricing, etc.)
 * Ensures proper code splitting - marketing bundle is separate from app bundle.
 *
 * Note: Metadata is handled by the root layout since this contains client components.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
