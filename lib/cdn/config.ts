/**
 * CDN Configuration for Static Assets
 *
 * Supports multiple CDN providers:
 * - Cloudflare
 * - AWS CloudFront
 * - Vercel Edge Network (automatic with Vercel deployment)
 */

interface CDNConfig {
  enabled: boolean;
  provider: "cloudflare" | "cloudfront" | "vercel" | "none";
  domain?: string;
  pullZone?: string;
  pushZone?: string;
  apiKey?: string;
}

// CDN Configuration from environment
export const cdnConfig: CDNConfig = {
  enabled: process.env.NEXT_PUBLIC_CDN_ENABLED === "true",
  provider:
    (process.env.NEXT_PUBLIC_CDN_PROVIDER as CDNConfig["provider"]) || "vercel",
  domain: process.env.NEXT_PUBLIC_CDN_DOMAIN,
  pullZone: process.env.CDN_PULL_ZONE,
  pushZone: process.env.CDN_PUSH_ZONE,
  apiKey: process.env.CDN_API_KEY,
};

/**
 * Get CDN URL for an asset
 */
export function getCDNUrl(path: string): string {
  if (!cdnConfig.enabled || !cdnConfig.domain) {
    // Return original path if CDN is not enabled
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  // Construct CDN URL
  const cdnDomain = cdnConfig.domain.endsWith("/")
    ? cdnConfig.domain.slice(0, -1)
    : cdnConfig.domain;

  return `${cdnDomain}/${cleanPath}`;
}

/**
 * Get optimized image URL with CDN and transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "avif" | "auto";
  },
): string {
  // If using Vercel, use Next.js Image Optimization API
  if (cdnConfig.provider === "vercel" || !cdnConfig.enabled) {
    return url; // Next.js Image component handles optimization
  }

  // Cloudflare Image Resizing
  if (cdnConfig.provider === "cloudflare" && cdnConfig.domain) {
    const params = new URLSearchParams();

    if (options?.width) params.set("width", options.width.toString());
    if (options?.height) params.set("height", options.height.toString());
    if (options?.quality) params.set("quality", options.quality.toString());
    if (options?.format) params.set("format", options.format);

    const cdnUrl = getCDNUrl(url);
    return `${cdnUrl}?${params.toString()}`;
  }

  // CloudFront with Lambda@Edge for image optimization
  if (cdnConfig.provider === "cloudfront" && cdnConfig.domain) {
    const params = new URLSearchParams();

    if (options?.width) params.set("w", options.width.toString());
    if (options?.height) params.set("h", options.height.toString());
    if (options?.quality) params.set("q", options.quality.toString());
    if (options?.format) params.set("f", options.format);

    const cdnUrl = getCDNUrl(url);
    return `${cdnUrl}?${params.toString()}`;
  }

  return url;
}

/**
 * Preload critical assets
 */
export function preloadAssets(assets: string[]): void {
  if (typeof window === "undefined") return;

  assets.forEach((asset) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = getCDNUrl(asset);

    // Determine asset type
    if (asset.endsWith(".css")) {
      link.as = "style";
    } else if (asset.endsWith(".js")) {
      link.as = "script";
    } else if (asset.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
      link.as = "image";
    } else if (asset.match(/\.(woff|woff2|ttf|otf)$/i)) {
      link.as = "font";
      link.crossOrigin = "anonymous";
    }

    document.head.appendChild(link);
  });
}

/**
 * Purge CDN cache for specific URLs
 */
export async function purgeCDNCache(urls: string[]): Promise<boolean> {
  if (!cdnConfig.enabled || !cdnConfig.apiKey) {
    console.warn("CDN purge skipped: CDN not configured");
    return false;
  }

  try {
    // Cloudflare Cache Purge
    if (cdnConfig.provider === "cloudflare") {
      const zoneId = process.env.CLOUDFLARE_ZONE_ID;
      if (!zoneId) {
        console.error("Cloudflare Zone ID not configured");
        return false;
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cdnConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: urls }),
        },
      );

      return response.ok;
    }

    // CloudFront Invalidation
    if (cdnConfig.provider === "cloudfront") {
      // This would require AWS SDK
      console.log("CloudFront invalidation not implemented");
      return false;
    }

    return false;
  } catch (error) {
    console.error("CDN purge failed:", error);
    return false;
  }
}

/**
 * Get CDN analytics
 */
export async function getCDNAnalytics(
  startDate: Date,
  endDate: Date,
): Promise<any> {
  if (!cdnConfig.enabled || !cdnConfig.apiKey) {
    return null;
  }

  try {
    // Cloudflare Analytics
    if (cdnConfig.provider === "cloudflare") {
      const zoneId = process.env.CLOUDFLARE_ZONE_ID;
      if (!zoneId) return null;

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/analytics/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${cdnConfig.apiKey}`,
          },
        },
      );

      if (response.ok) {
        return response.json();
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch CDN analytics:", error);
    return null;
  }
}
