/**
 * i18n Utilities - Central Export
 *
 * This module exports all i18n utilities for easy import throughout the application.
 */

// Formatting utilities
export * from "./formatting";

// Pluralization utilities
export * from "./pluralization";

// Re-export navigation helpers
export { Link, redirect, usePathname, useRouter, locales } from "../navigation";
