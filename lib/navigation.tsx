"use client";

import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useParams,
} from "next/navigation";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { locales, defaultLocale } from "@/i18n";

// Locale-aware Link component
export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(
  function LocalizedLink({ href, ...props }, ref) {
    const params = useParams();
    const locale = (params?.locale as string) || defaultLocale;
    
    // Add locale prefix if href doesn't start with locale or external URL
    const localizedHref = 
      typeof href === "string" && 
      !href.startsWith("http") && 
      !href.startsWith(`/${locale}`)
        ? `/${locale}${href}`
        : href;
    
    return <NextLink ref={ref} href={localizedHref} {...props} />;
  }
);

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
