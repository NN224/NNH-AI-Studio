/**
 * GMB Attributes Type Definitions
 * Centralized types for Google My Business attribute management
 */

/**
 * Attribute value types supported by GMB
 */
export type AttributeValueType = 'BOOL' | 'ENUM' | 'URL' | 'REPEATED_ENUM' | 'STRING' | 'NUMBER'

/**
 * Single attribute value with display name
 */
export interface AttributeValueMetadata {
  value: string | boolean | number
  displayName: string
}

/**
 * Attribute metadata from GMB API
 */
export interface AttributeMetadata {
  name: string
  valueType: AttributeValueType | string
  displayName: string
  groupDisplayName?: string
  repeatable: boolean
  deprecated: boolean
  valueMetadata?: AttributeValueMetadata[]
}

/**
 * Current attribute value for a location
 */
export interface LocationAttribute {
  name: string
  values?: AttributeValueItem[]
  uriValues?: AttributeUriValue[]
}

/**
 * Attribute value item
 */
export interface AttributeValueItem {
  value: string | boolean | number
}

/**
 * URI value for URL-type attributes
 */
export interface AttributeUriValue {
  uri: string
}

/**
 * Attribute values state - maps attribute name to its values
 */
export type AttributeValuesState = Record<string, unknown[]>

/**
 * Grouped attributes by category
 */
export interface GroupedAttributes {
  [groupName: string]: AttributeMetadata[]
}

/**
 * API response for available attributes
 */
export interface AttributesApiResponse {
  data?: {
    attributeMetadata?: AttributeMetadata[]
  }
  attributeMetadata?: AttributeMetadata[]
  error?: string
}

/**
 * API response for current location attributes
 */
export interface LocationAttributesApiResponse {
  data?: {
    attributes?: LocationAttribute[]
  }
  attributes?: LocationAttribute[]
  error?: string
}

/**
 * Attribute update payload for API
 */
export interface AttributeUpdatePayload {
  name: string
  values?: AttributeValueItem[]
  uriValues?: AttributeUriValue[]
}

/**
 * Helper type for checking if a value is truthy/filled
 */
export function isFilledValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '' || value === false) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return true
}

/**
 * Helper to check if an array has any filled values
 */
export function hasFilledValues(values: unknown[]): boolean {
  return values.length > 0 && values.some(isFilledValue)
}
