"use client";

import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
} from "next/navigation";
import NextLink from "next/link";
import { locales } from "@/i18n";

// Simple wrappers to replace next-intl navigation
export const Link = NextLink;
export const useRouter = useNextRouter;
export const usePathname = useNextPathname;
export const redirect = (path: string) => {
  if (typeof window !== "undefined") {
    window.location.href = path;
  }
};
export const getPathname = (path: string) => path;

// Re-export for convenience
export { locales };
