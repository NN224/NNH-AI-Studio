/**
 * Google Places API Category Configuration
 *
 * This file contains the mapping between Google Business Profile categories
 * and Google Places API types. Used for competitor analysis and location matching.
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/supported_types
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Valid Google Places API types that we support for competitor matching.
 * These correspond to the `type` parameter in Google Places Nearby Search.
 */
export const GOOGLE_PLACES_TYPES = [
  "night_club",
  "bar",
  "restaurant",
  "cafe",
  "lodging",
  "spa",
  "beauty_salon",
  "gym",
  "shopping_mall",
  "store",
  "clothing_store",
  "electronics_store",
  "supermarket",
  "pet_store",
  "veterinary_care",
  "dentist",
  "doctor",
  "hospital",
  "pharmacy",
  "lawyer",
  "real_estate_agency",
  "accounting",
  "travel_agency",
  "art_gallery",
  "museum",
  "school",
  "university",
] as const;

/**
 * Union type of all valid Google Places types
 */
export type GooglePlacesType = (typeof GOOGLE_PLACES_TYPES)[number];

/**
 * Type for keyword-to-type mapping entries
 */
export interface TypeKeywordEntry {
  /** The Google Places API type */
  type: GooglePlacesType;
  /** Keywords that should map to this type */
  keywords: readonly string[];
}

// ============================================================================
// Category Mappings
// ============================================================================

/**
 * Maps normalized category identifiers to Google Places API types.
 *
 * Keys are normalized category strings (lowercase, underscores for spaces).
 * Values are valid Google Places API types.
 *
 * @example
 * // "cocktail_bar" -> "bar"
 * // "steak_house" -> "restaurant"
 */
export const CATEGORY_TYPE_MAP: Readonly<Record<string, GooglePlacesType>> = {
  // Nightlife & Entertainment
  night_club: "night_club",
  nightclub: "night_club",
  bar: "bar",
  cocktail_bar: "bar",
  lounge: "bar",
  pub: "bar",

  // Food & Dining
  restaurant: "restaurant",
  steak_house: "restaurant",
  dining: "restaurant",
  cafe: "cafe",
  coffee_shop: "cafe",
  coffee: "cafe",

  // Hospitality
  hotel: "lodging",
  lodging: "lodging",
  resort: "lodging",
  spa: "spa",

  // Personal Care
  beauty_salon: "beauty_salon",
  hair_salon: "beauty_salon",
  nail_salon: "beauty_salon",

  // Fitness
  gym: "gym",
  fitness_center: "gym",

  // Retail
  shopping_mall: "shopping_mall",
  mall: "shopping_mall",
  store: "store",
  retail: "store",
  clothing_store: "clothing_store",
  electronics_store: "electronics_store",
  supermarket: "supermarket",
  grocery: "supermarket",
  pet_store: "pet_store",

  // Healthcare
  veterinary_care: "veterinary_care",
  dentist: "dentist",
  doctor: "doctor",
  clinic: "doctor",
  hospital: "hospital",
  pharmacy: "pharmacy",

  // Professional Services
  lawyer: "lawyer",
  law_firm: "lawyer",
  real_estate_agency: "real_estate_agency",
  real_estate: "real_estate_agency",
  accounting: "accounting",
  travel_agency: "travel_agency",

  // Arts & Culture
  art_gallery: "art_gallery",
  gallery: "art_gallery",
  museum: "museum",

  // Education
  school: "school",
  university: "university",
} as const;

/**
 * Maps keywords to Google Places API types for fuzzy matching.
 *
 * Used when exact category matching fails. Keywords are matched
 * using substring inclusion (case-insensitive).
 *
 * Order matters: earlier entries take precedence.
 */
export const TYPE_KEYWORDS: readonly TypeKeywordEntry[] = [
  // Nightlife & Entertainment
  { type: "night_club", keywords: ["night club", "club", "discotheque"] },
  { type: "bar", keywords: ["bar", "pub", "lounge", "cocktail"] },

  // Food & Dining
  {
    type: "restaurant",
    keywords: ["restaurant", "dining", "eatery", "bistro", "steakhouse"],
  },
  { type: "cafe", keywords: ["cafe", "coffee shop", "coffee"] },

  // Hospitality
  { type: "lodging", keywords: ["hotel", "lodging", "resort", "inn"] },
  { type: "spa", keywords: ["spa"] },

  // Personal Care
  {
    type: "beauty_salon",
    keywords: ["beauty salon", "salon", "hair salon", "nail salon"],
  },

  // Fitness
  { type: "gym", keywords: ["gym", "fitness", "fitness center"] },

  // Retail
  {
    type: "shopping_mall",
    keywords: ["shopping mall", "mall", "shopping center"],
  },
  { type: "store", keywords: ["store", "shop", "retail"] },
  { type: "pet_store", keywords: ["pet store", "pet shop"] },

  // Healthcare
  { type: "veterinary_care", keywords: ["vet", "veterinary"] },
  { type: "dentist", keywords: ["dentist", "dental"] },
  { type: "doctor", keywords: ["doctor", "clinic", "medical"] },
  { type: "hospital", keywords: ["hospital"] },
  { type: "pharmacy", keywords: ["pharmacy", "drugstore"] },

  // Professional Services
  { type: "lawyer", keywords: ["lawyer", "law firm"] },
  { type: "real_estate_agency", keywords: ["real estate", "property agent"] },
  { type: "accounting", keywords: ["accounting", "accountant"] },
  { type: "travel_agency", keywords: ["travel agency", "travel agent"] },

  // Arts & Culture
  { type: "art_gallery", keywords: ["art gallery", "gallery"] },
  { type: "museum", keywords: ["museum"] },

  // Education
  { type: "school", keywords: ["school", "academy"] },
  { type: "university", keywords: ["university", "college"] },
] as const;

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates that a string is a valid Google Places type.
 */
export function isValidGooglePlacesType(
  type: string,
): type is GooglePlacesType {
  return GOOGLE_PLACES_TYPES.includes(type as GooglePlacesType);
}

/**
 * Gets all unique Google Places types from the category map.
 * Useful for validation and testing.
 */
export function getUniquePlacesTypes(): GooglePlacesType[] {
  const types = new Set<GooglePlacesType>(Object.values(CATEGORY_TYPE_MAP));
  return Array.from(types);
}

/**
 * Validates the configuration integrity.
 * Throws an error if any inconsistencies are found.
 *
 * Checks:
 * 1. All CATEGORY_TYPE_MAP values are valid GooglePlacesType
 * 2. All TYPE_KEYWORDS types are valid GooglePlacesType
 * 3. No duplicate keywords across different types
 *
 * @returns Validation result with details
 */
export function validateCategoryConfiguration(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check CATEGORY_TYPE_MAP values
  for (const [key, value] of Object.entries(CATEGORY_TYPE_MAP)) {
    if (!isValidGooglePlacesType(value)) {
      errors.push(`CATEGORY_TYPE_MAP["${key}"] has invalid type "${value}"`);
    }
  }

  // Check TYPE_KEYWORDS types
  for (const entry of TYPE_KEYWORDS) {
    if (!isValidGooglePlacesType(entry.type)) {
      errors.push(`TYPE_KEYWORDS entry has invalid type "${entry.type}"`);
    }

    if (entry.keywords.length === 0) {
      warnings.push(`TYPE_KEYWORDS entry for "${entry.type}" has no keywords`);
    }
  }

  // Check for duplicate keywords
  const keywordMap = new Map<string, string>();
  for (const entry of TYPE_KEYWORDS) {
    for (const keyword of entry.keywords) {
      const existing = keywordMap.get(keyword);
      if (existing && existing !== entry.type) {
        warnings.push(
          `Duplicate keyword "${keyword}" found in types "${existing}" and "${entry.type}"`,
        );
      }
      keywordMap.set(keyword, entry.type);
    }
  }

  // Check that all GOOGLE_PLACES_TYPES have at least one mapping
  const mappedTypes = new Set([
    ...Object.values(CATEGORY_TYPE_MAP),
    ...TYPE_KEYWORDS.map((e) => e.type),
  ]);

  for (const type of GOOGLE_PLACES_TYPES) {
    if (!mappedTypes.has(type)) {
      warnings.push(
        `Google Places type "${type}" has no category or keyword mapping`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Looks up a Google Places type from a category identifier.
 *
 * @param categoryKey - Normalized category key (e.g., "cocktail_bar")
 * @returns The Google Places type or undefined if not found
 */
export function lookupCategoryType(
  categoryKey: string,
): GooglePlacesType | undefined {
  return CATEGORY_TYPE_MAP[categoryKey];
}

/**
 * Finds a Google Places type by keyword matching.
 *
 * @param text - Text to search for keywords
 * @returns The first matching Google Places type or undefined
 */
export function findTypeByKeyword(text: string): GooglePlacesType | undefined {
  const lowerText = text.toLowerCase();

  for (const entry of TYPE_KEYWORDS) {
    if (entry.keywords.some((keyword) => lowerText.includes(keyword))) {
      return entry.type;
    }
  }

  return undefined;
}
