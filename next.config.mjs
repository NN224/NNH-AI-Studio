import { withSentryConfig } from "@sentry/nextjs";
// [stringer:auto-locales:start]
import fs from "fs";
import path from "path";
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const LOCALES_DIR = "i18n/locales";
const resolvedLocalesDir = path.resolve(process.cwd(), LOCALES_DIR);
const localeFiles = fs.existsSync(resolvedLocalesDir)
  ? fs
      .readdirSync(resolvedLocalesDir)
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
  : [];
const autoLocales = localeFiles.map((f) => path.basename(f, ".json"));
const autoDefaultLocale =
  autoLocales.find((l) => l === "en") || autoLocales[0] || "en";
// [stringer:auto-locales:end]

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

// Only load the bundle analyzer when explicitly requested so production installs
// that omit devDependencies do not error on missing packages.
let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === "true") {
  const { default: bundleAnalyzer } = await import("@next/bundle-analyzer");
  withBundleAnalyzer = bundleAnalyzer({ enabled: true });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Performance optimizations
  swcMinify: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  // Optimize bundle size
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Ensure path alias "@" always resolves to project root (helps CI/Vercel builds)
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = path.resolve(__dirname);

    // Production optimizations
    // Production optimizations disabled temporarily to fix build error
    // if (!dev && !isServer) {
    //   // Add production optimizations here if needed
    // }

    return config;
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          // Prevent iframes to protect against clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Enable XSS protection (legacy browsers)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer policy for privacy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy (formerly Feature Policy)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(*), payment=()",
          },
          // HSTS (Strict Transport Security) - enforce HTTPS
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Content Security Policy - comprehensive protection
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googletagmanager.com https://accounts.google.com https://apis.google.com https://www.gstatic.com https://ssl.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://www.google-analytics.com https://*.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://mybusinessbusinessinformation.googleapis.com https://mybusinessqanda.googleapis.com https://mybusinessaccountmanagement.googleapis.com https://analytics.google.com https://analyticsreporting.googleapis.com https://*.sentry.io https://*.ingest.sentry.io",
              "media-src 'self'",
              "object-src 'none'",
              "frame-src 'self' https://www.google.com https://maps.google.com https://accounts.google.com https://*.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ].filter((header) => {
          // Remove HSTS header in development to allow HTTP
          if (
            process.env.NODE_ENV !== "production" &&
            header.key === "Strict-Transport-Security"
          ) {
            return false;
          }
          return true;
        }),
      },
      {
        // Additional headers for API routes
        source: "/api/:path*",
        headers: [
          // CORS headers for API (adjust origin as needed)
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? "https://nnh.ae"
                : "http://localhost:5050",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          // Cache control for API responses
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      // Note: Next.js handles static file caching automatically
      // For custom caching, use _headers file or middleware
    ];
  },
};

export default withSentryConfig(withNextIntl(withBundleAnalyzer(nextConfig)), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "nnh-ai-studio",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Skip source map uploading if auth token is not present
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disable: !process.env.SENTRY_AUTH_TOKEN,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
