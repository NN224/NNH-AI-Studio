import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "@/i18n";

// Create locale-aware navigation helpers
export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });

// Re-export for convenience
export { locales };
