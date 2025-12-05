/**
 * Jest setup for integration tests
 *
 * This setup file does NOT mock Supabase or environment variables
 * because integration tests need to connect to the real database.
 */

// Load real environment variables from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

// Set longer timeout for integration tests
jest.setTimeout(120000);
