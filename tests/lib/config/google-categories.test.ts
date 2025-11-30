/**
 * Unit tests for Google Categories Configuration
 *
 * These tests ensure the category configuration is valid and consistent,
 * preventing runtime errors when new categories are added.
 */

import {
  CATEGORY_TYPE_MAP,
  GOOGLE_PLACES_TYPES,
  TYPE_KEYWORDS,
  findTypeByKeyword,
  getUniquePlacesTypes,
  isValidGooglePlacesType,
  lookupCategoryType,
  validateCategoryConfiguration,
  type GooglePlacesType,
} from "@/lib/config/google-categories";
import { describe, expect, it } from "vitest";

describe("Google Categories Configuration", () => {
  describe("GOOGLE_PLACES_TYPES", () => {
    it("should contain all expected place types", () => {
      expect(GOOGLE_PLACES_TYPES).toContain("restaurant");
      expect(GOOGLE_PLACES_TYPES).toContain("bar");
      expect(GOOGLE_PLACES_TYPES).toContain("hotel");
      expect(GOOGLE_PLACES_TYPES).toContain("gym");
      expect(GOOGLE_PLACES_TYPES).toContain("hospital");
    });

    it("should not contain duplicates", () => {
      const uniqueTypes = new Set(GOOGLE_PLACES_TYPES);
      expect(uniqueTypes.size).toBe(GOOGLE_PLACES_TYPES.length);
    });

    it("should only contain lowercase snake_case values", () => {
      for (const type of GOOGLE_PLACES_TYPES) {
        expect(type).toMatch(/^[a-z_]+$/);
      }
    });
  });

  describe("CATEGORY_TYPE_MAP", () => {
    it("should map all values to valid GooglePlacesType", () => {
      for (const [key, value] of Object.entries(CATEGORY_TYPE_MAP)) {
        expect(
          isValidGooglePlacesType(value),
          `CATEGORY_TYPE_MAP["${key}"] = "${value}" is not a valid GooglePlacesType`,
        ).toBe(true);
      }
    });

    it("should have lowercase snake_case keys", () => {
      for (const key of Object.keys(CATEGORY_TYPE_MAP)) {
        expect(key).toMatch(/^[a-z_]+$/);
      }
    });

    it("should map common categories correctly", () => {
      expect(CATEGORY_TYPE_MAP["restaurant"]).toBe("restaurant");
      expect(CATEGORY_TYPE_MAP["cocktail_bar"]).toBe("bar");
      expect(CATEGORY_TYPE_MAP["coffee_shop"]).toBe("cafe");
      expect(CATEGORY_TYPE_MAP["hotel"]).toBe("lodging");
      expect(CATEGORY_TYPE_MAP["fitness_center"]).toBe("gym");
    });

    it("should handle aliases consistently", () => {
      // Bar aliases
      expect(CATEGORY_TYPE_MAP["bar"]).toBe(CATEGORY_TYPE_MAP["pub"]);
      expect(CATEGORY_TYPE_MAP["bar"]).toBe(CATEGORY_TYPE_MAP["lounge"]);

      // Restaurant aliases
      expect(CATEGORY_TYPE_MAP["restaurant"]).toBe(CATEGORY_TYPE_MAP["dining"]);

      // Lodging aliases
      expect(CATEGORY_TYPE_MAP["hotel"]).toBe(CATEGORY_TYPE_MAP["lodging"]);
      expect(CATEGORY_TYPE_MAP["hotel"]).toBe(CATEGORY_TYPE_MAP["resort"]);
    });
  });

  describe("TYPE_KEYWORDS", () => {
    it("should have valid GooglePlacesType for all entries", () => {
      for (const entry of TYPE_KEYWORDS) {
        expect(
          isValidGooglePlacesType(entry.type),
          `TYPE_KEYWORDS entry type "${entry.type}" is not valid`,
        ).toBe(true);
      }
    });

    it("should have non-empty keywords for all entries", () => {
      for (const entry of TYPE_KEYWORDS) {
        expect(
          entry.keywords.length,
          `TYPE_KEYWORDS entry for "${entry.type}" has no keywords`,
        ).toBeGreaterThan(0);
      }
    });

    it("should have lowercase keywords", () => {
      for (const entry of TYPE_KEYWORDS) {
        for (const keyword of entry.keywords) {
          expect(keyword).toBe(keyword.toLowerCase());
        }
      }
    });

    it("should not have duplicate types", () => {
      const types = TYPE_KEYWORDS.map((e) => e.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });

  describe("isValidGooglePlacesType", () => {
    it("should return true for valid types", () => {
      expect(isValidGooglePlacesType("restaurant")).toBe(true);
      expect(isValidGooglePlacesType("bar")).toBe(true);
      expect(isValidGooglePlacesType("gym")).toBe(true);
    });

    it("should return false for invalid types", () => {
      expect(isValidGooglePlacesType("invalid_type")).toBe(false);
      expect(isValidGooglePlacesType("")).toBe(false);
      expect(isValidGooglePlacesType("RESTAURANT")).toBe(false);
    });
  });

  describe("getUniquePlacesTypes", () => {
    it("should return unique types from CATEGORY_TYPE_MAP", () => {
      const uniqueTypes = getUniquePlacesTypes();
      expect(uniqueTypes.length).toBeGreaterThan(0);

      // All returned types should be valid
      for (const type of uniqueTypes) {
        expect(isValidGooglePlacesType(type)).toBe(true);
      }
    });

    it("should not contain duplicates", () => {
      const uniqueTypes = getUniquePlacesTypes();
      const set = new Set(uniqueTypes);
      expect(set.size).toBe(uniqueTypes.length);
    });
  });

  describe("validateCategoryConfiguration", () => {
    it("should pass validation for current configuration", () => {
      const result = validateCategoryConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return warnings for unmapped types", () => {
      const result = validateCategoryConfiguration();

      // Some types might not have mappings, which is a warning not an error
      // This test documents the current state
      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          expect(typeof warning).toBe("string");
        }
      }
    });
  });

  describe("lookupCategoryType", () => {
    it("should return correct type for known categories", () => {
      expect(lookupCategoryType("restaurant")).toBe("restaurant");
      expect(lookupCategoryType("cocktail_bar")).toBe("bar");
      expect(lookupCategoryType("hotel")).toBe("lodging");
    });

    it("should return undefined for unknown categories", () => {
      expect(lookupCategoryType("unknown_category")).toBeUndefined();
      expect(lookupCategoryType("")).toBeUndefined();
    });
  });

  describe("findTypeByKeyword", () => {
    it("should find type by keyword match", () => {
      expect(findTypeByKeyword("nice restaurant downtown")).toBe("restaurant");
      expect(findTypeByKeyword("local pub")).toBe("bar");
      expect(findTypeByKeyword("fitness center")).toBe("gym");
    });

    it("should be case-insensitive", () => {
      expect(findTypeByKeyword("RESTAURANT")).toBe("restaurant");
      expect(findTypeByKeyword("Coffee Shop")).toBe("cafe");
    });

    it("should return undefined for no match", () => {
      expect(findTypeByKeyword("xyz123")).toBeUndefined();
      expect(findTypeByKeyword("")).toBeUndefined();
    });

    it("should match partial keywords", () => {
      expect(findTypeByKeyword("the best steakhouse in town")).toBe(
        "restaurant",
      );
      expect(findTypeByKeyword("my favorite cocktail place")).toBe("bar");
    });
  });

  describe("Configuration Integrity", () => {
    it("should have consistent mappings between CATEGORY_TYPE_MAP and TYPE_KEYWORDS", () => {
      // Get all types used in both maps
      const categoryMapTypes = new Set(Object.values(CATEGORY_TYPE_MAP));
      const keywordTypes = new Set(TYPE_KEYWORDS.map((e) => e.type));

      // Every type in TYPE_KEYWORDS should also appear in CATEGORY_TYPE_MAP values
      for (const type of keywordTypes) {
        expect(
          categoryMapTypes.has(type),
          `TYPE_KEYWORDS type "${type}" not found in CATEGORY_TYPE_MAP values`,
        ).toBe(true);
      }
    });

    it("should cover all major business categories", () => {
      const allTypes = getUniquePlacesTypes();

      // Essential categories that should always be mapped
      const essentialCategories: GooglePlacesType[] = [
        "restaurant",
        "bar",
        "cafe",
        "lodging",
        "gym",
        "store",
        "doctor",
        "dentist",
        "hospital",
      ];

      for (const category of essentialCategories) {
        expect(
          allTypes.includes(category),
          `Essential category "${category}" is not mapped`,
        ).toBe(true);
      }
    });

    it("should not have conflicting keyword mappings", () => {
      // Check that no keyword appears in multiple TYPE_KEYWORDS entries
      const keywordToType = new Map<string, string>();
      const conflicts: string[] = [];

      for (const entry of TYPE_KEYWORDS) {
        for (const keyword of entry.keywords) {
          const existing = keywordToType.get(keyword);
          if (existing && existing !== entry.type) {
            conflicts.push(
              `Keyword "${keyword}" maps to both "${existing}" and "${entry.type}"`,
            );
          }
          keywordToType.set(keyword, entry.type);
        }
      }

      expect(conflicts).toHaveLength(0);
    });
  });
});
