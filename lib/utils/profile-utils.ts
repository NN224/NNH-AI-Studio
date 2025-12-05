import { apiLogger } from "@/lib/utils/logger";
import type {
  BusinessProfileMetadata,
  GmbAttribute,
  PlaceActionLink,
} from "@/lib/validations/profile";
import type {
  FeatureCategoryKey,
  FeatureSelection,
  SocialLinks,
  SpecialLinks,
} from "@/types/features";

/**
 * Safely parses an object from unknown input
 */
export function parseRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object")
    return { ...(value as Record<string, unknown>) };
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        apiLogger.warn("[features/profile] Failed to parse string metadata", {
          error: String(error),
        });
      }
    }
  }
  return {};
}

/**
 * Ensures a value is converted to string array
 */
export function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        (typeof item === "string" ? item : String(item ?? "")).trim(),
      )
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

/**
 * Converts various inputs to boolean
 */
export function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
}

/**
 * Normalize feature selection from raw object
 */
export function normalizeFeatureSelection(
  raw: Record<string, unknown>,
  featureKeys: Set<string>,
  categoryKeys: readonly FeatureCategoryKey[],
): FeatureSelection {
  const selection: FeatureSelection = {
    amenities: [],
    payment_methods: [],
    services: [],
    atmosphere: [],
  };

  categoryKeys.forEach((category) => {
    const rawValue = raw?.[category];
    const values = ensureStringArray(rawValue).filter((key) =>
      featureKeys.has(key),
    );
    selection[category] = Array.from(new Set(values));
  });

  // Fall back to attribute arrays if provided as flat list
  if (selection.amenities.length === 0 && Array.isArray(raw?.attributes)) {
    const attributes = ensureStringArray(raw.attributes);
    const index = new Map<string, FeatureCategoryKey>();
    categoryKeys.forEach((category) => {
      const catalog = getCatalogForCategory(category);
      catalog.forEach((definition) => {
        index.set(definition.key, category);
      });
    });

    attributes.forEach((attribute) => {
      const category = index.get(attribute);
      if (!category) return;
      selection[category] = Array.from(
        new Set([...selection[category], attribute]),
      );
    });
  }

  return selection;
}

/**
 * Helper function to get feature catalog by category
 * (Mocks the FEATURE_CATALOG from feature-definitions.ts)
 */
function getCatalogForCategory(
  _category: FeatureCategoryKey,
): Array<{ key: string }> {
  // This is a placeholder - in real implementation you should import from feature-definitions
  return [];
}

/**
 * Extract attribute strings from GMB Attributes API response
 */
export function extractAttributeStrings(
  attributesArray: GmbAttribute[],
): string[] {
  const result: string[] = [];

  for (const attr of attributesArray) {
    if (!attr) continue;

    // Add attribute name/id if present (for backward compatibility)
    if (attr.name) {
      result.push(attr.name);
    }

    // Add string values if present
    if (Array.isArray(attr.values)) {
      attr.values.forEach((val) => {
        if (typeof val === "string" && val.trim()) {
          result.push(val.trim());
        } else if (val && typeof val === "object" && val.displayName) {
          result.push(String(val.displayName).trim());
        }
      });
    }

    // Add URI values if present
    if (Array.isArray(attr.uriValues)) {
      attr.uriValues.forEach((uriVal) => {
        if (uriVal && uriVal.uri) {
          // Don't add URIs to features, skip
        }
      });
    }
  }

  return result.filter((s) => s.length > 0);
}

/**
 * Sanitize website URL
 */
export function sanitizeWebsite(value: string): string {
  return value.trim();
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(value: string): string {
  return value.trim();
}

/**
 * Build special links object from different sources
 */
export function buildSpecialLinks(
  raw: BusinessProfileMetadata,
  row: Record<string, unknown>,
): SpecialLinks {
  const linksMetadata = parseRecord(raw.specialLinks ?? raw.links);

  // Extract place action links from placeActionLinks array (from Place Actions API)
  const placeActionLinks = Array.isArray(raw.placeActionLinks)
    ? raw.placeActionLinks
    : [];
  const placeActions: Record<string, string> = {};

  placeActionLinks.forEach((link: PlaceActionLink) => {
    if (link.placeActionType && link.uri) {
      const type = link.placeActionType.toLowerCase();
      if (type.includes("order")) placeActions.order = link.uri;
      else if (type.includes("menu") || type.includes("food_menu"))
        placeActions.menu = link.uri;
      else if (type.includes("book") || type.includes("appointment"))
        placeActions.booking = link.uri;
    }
  });

  // Check multiple sources for special links (prioritize Place Actions API)
  return {
    menu:
      placeActions.menu ??
      linksMetadata.menu ??
      raw.menu_url ??
      raw.menu ??
      row.menu_url ??
      row.menu ??
      null,
    booking:
      placeActions.booking ??
      linksMetadata.booking ??
      raw.booking_url ??
      raw.booking ??
      raw.reservationUri ??
      row.booking_url ??
      row.booking ??
      row.reservation_uri ??
      null,
    order:
      placeActions.order ??
      linksMetadata.order ??
      raw.order_url ??
      raw.order ??
      row.order_url ??
      row.order ??
      null,
    appointment:
      placeActions.booking ?? // booking and appointment are the same in GMB
      linksMetadata.appointment ??
      raw.appointment_url ??
      raw.appointment ??
      row.appointment_url ??
      row.appointment ??
      null,
  };
}

/**
 * Build social links object from GMB attributes
 */
export function buildSocialLinks(raw: BusinessProfileMetadata): SocialLinks {
  // Extract social media links from GMB attributes
  const attributes = Array.isArray(raw.attributes) ? raw.attributes : [];
  const links: Record<string, string | null | undefined> = {};

  attributes.forEach((attr) => {
    if (!attr || !attr.name) return;

    const attrName = attr.name;

    // Social links are stored in uriValues, not values!
    let value: string | null = null;

    // Check uriValues first (for URL type attributes)
    if (Array.isArray(attr.uriValues) && attr.uriValues.length > 0) {
      value = attr.uriValues[0]?.uri || null;
    }
    // Fallback to values (for backward compatibility)
    else if (attr.values) {
      value = Array.isArray(attr.values)
        ? (attr.values[0] as string)
        : (attr.values as string);
    }

    // Skip if value is null or empty
    if (!value || typeof value !== "string") return;

    // Map GMB attribute names to social link fields
    if (attrName === "attributes/url_facebook") links.facebook = value;
    else if (attrName === "attributes/url_instagram") links.instagram = value;
    else if (attrName === "attributes/url_twitter") links.twitter = value;
    else if (attrName === "attributes/url_whatsapp") links.whatsapp = value;
    else if (attrName === "attributes/url_youtube") links.youtube = value;
    else if (attrName === "attributes/url_linkedin") links.linkedin = value;
    else if (attrName === "attributes/url_tiktok") links.tiktok = value;
    else if (attrName === "attributes/url_pinterest") links.pinterest = value;
  });

  return links as SocialLinks;
}
