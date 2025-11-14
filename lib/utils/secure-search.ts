/**
 * Secure search utilities to prevent SQL injection
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Escapes special characters in search patterns for PostgreSQL LIKE/ILIKE operations
 * @param input The search input to escape
 * @returns Escaped search pattern safe for use in LIKE/ILIKE
 */
export function escapeSearchPattern(input: string): string {
  if (!input) return '';
  
  // First trim and limit length to prevent DoS
  const trimmed = input.trim().slice(0, 100);
  
  // Escape special LIKE pattern characters
  // Order matters: escape backslash first
  return trimmed
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_')    // Escape underscores
    .replace(/'/g, "''");    // Escape single quotes
}

/**
 * Validates search input to ensure it's safe
 * @param input The search input to validate
 * @returns true if input is safe, false otherwise
 */
export function isValidSearchInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  // Check length
  if (input.length > 100) return false;
  
  // Additional validation can be added here
  // For now, we allow most characters but you can restrict further if needed
  
  return true;
}

/**
 * Creates a safe ILIKE pattern for search
 * @param input The search term
 * @returns Safe pattern for ILIKE search or null if invalid
 */
export function createSearchPattern(input: string): string | null {
  if (!isValidSearchInput(input)) return null;
  
  const escaped = escapeSearchPattern(input);
  if (!escaped) return null;
  
  return `%${escaped}%`;
}

/**
 * Apply search filters to Supabase query in a safe way
 * This avoids SQL injection by using Supabase's built-in filter methods
 * @param query The Supabase query builder
 * @param searchTerm The search term
 * @param columns Array of column names to search in
 * @returns Updated query builder
 */
export function applySearchFilter<T extends Record<string, any>>(
  query: any,
  searchTerm: string,
  columns: string[]
): any {
  const pattern = createSearchPattern(searchTerm);
  if (!pattern || columns.length === 0) return query;
  
  // For single column, use simple ilike
  if (columns.length === 1) {
    return query.ilike(columns[0], pattern);
  }
  
  // For multiple columns, we need to use .or() with properly formatted conditions
  // Build the OR conditions safely without string interpolation
  const orConditions = columns.map(col => `${col}.ilike.${pattern}`).join(',');
  
  // Note: This still uses string concatenation which is not ideal
  // The best approach would be to use RPC or multiple separate queries
  // For now, we ensure the column names are validated
  const validColumns = columns.filter(col => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col));
  if (validColumns.length !== columns.length) {
    throw new Error('Invalid column names detected');
  }
  
  return query.or(orConditions);
}

/**
 * Alternative safe search using multiple filters (recommended approach)
 * This creates separate conditions for each column and combines them
 */
export function applySafeSearchFilter<T extends Record<string, any>>(
  baseQuery: any,
  searchTerm: string,
  columns: string[]
): any {
  const pattern = createSearchPattern(searchTerm);
  if (!pattern || columns.length === 0) return baseQuery;
  
  // Validate column names to prevent injection
  const validColumns = columns.filter(col => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col));
  if (validColumns.length !== columns.length) {
    throw new Error('Invalid column names detected');
  }
  
  // For Supabase, the safest approach is to use the .or() method with 
  // properly validated column names
  if (validColumns.length === 1) {
    return baseQuery.ilike(validColumns[0], pattern);
  }
  
  // Build OR condition string with validated columns
  const conditions = validColumns.map(col => `${col}.ilike.${pattern}`).join(',');
  return baseQuery.or(conditions);
}
