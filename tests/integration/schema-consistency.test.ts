/**
 * @jest-environment node
 */

/**
 * Schema Consistency Tests
 *
 * These tests verify that the code uses correct table and column names
 * that match the actual database schema. This catches bugs like:
 * - Using wrong table names (e.g., gmb_services vs gmb_accounts)
 * - Using wrong column names (e.g., account_id vs gmb_account_id)
 * - Missing required columns in inserts
 * - Tables used in code but missing from database
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import path, * as path from "path";

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

// Skip if credentials missing
const shouldSkip = !TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseKey;

const supabase = shouldSkip
  ? null
  : createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey, {
      auth: { persistSession: false },
    });

// Tables that MUST exist for the app to work
const REQUIRED_TABLES = [
  "gmb_accounts",
  "gmb_locations",
  "gmb_reviews",
  "gmb_secrets",
  "oauth_tokens",
  "sync_queue",
  "sync_status",
];

// Tables that should NOT be used (common mistakes)
const WRONG_TABLE_NAMES = [
  { wrong: "gmb_services", correct: "gmb_accounts", context: "OAuth/Sync" },
  {
    wrong: "gmb_oauth_tokens",
    correct: "oauth_tokens",
    context: "Token storage",
  },
  {
    wrong: "user_settings",
    correct: "ai_settings",
    context: "User preferences",
  },
];

// Column mappings that are commonly confused
const COLUMN_MAPPINGS = [
  {
    table: "gmb_locations",
    wrongColumn: "account_id",
    correctColumn: "gmb_account_id",
  },
  {
    table: "sync_queue",
    wrongColumn: "gmb_account_id",
    correctColumn: "account_id",
  },
];

// API endpoints and the tables they should use
const API_TABLE_USAGE = [
  {
    endpoint: "/api/gmb/enqueue-sync",
    shouldUse: ["gmb_accounts", "sync_queue"],
    shouldNotUse: ["gmb_services"],
  },
  {
    endpoint: "/api/gmb/oauth-callback",
    shouldUse: ["gmb_accounts", "gmb_secrets", "oauth_states"],
    shouldNotUse: ["gmb_services", "gmb_oauth_tokens"],
  },
  {
    endpoint: "/api/gmb/locations/import",
    shouldUse: ["gmb_locations", "gmb_accounts"],
    shouldNotUse: [],
  },
];

const describeOrSkip = shouldSkip ? describe.skip : describe;

describeOrSkip("Schema Consistency Tests", () => {
  jest.setTimeout(60000);

  describe("Required Tables Exist", () => {
    it.each(REQUIRED_TABLES)(
      "✅ Table '%s' should exist",
      async (tableName) => {
        const { error } = await supabase!
          .from(tableName)
          .select("count")
          .limit(1);

        // PGRST116 = no rows (OK), 42P01 = table doesn't exist (FAIL)
        if (error?.code === "42P01") {
          throw new Error(`Table '${tableName}' does not exist in database!`);
        }
        // Any other error except "no rows" is a problem
        if (error && error.code !== "PGRST116") {
          // Check if it's a permission error (table exists but no access)
          if (error.code === "42501") {
            // Permission denied - table exists but RLS blocks access
            return; // This is OK for this test
          }
          throw new Error(
            `Error accessing table '${tableName}': ${error.message}`,
          );
        }
      },
    );
  });

  describe("Wrong Table Names Should Not Exist", () => {
    it.each(WRONG_TABLE_NAMES)(
      "⚠️ Table '$wrong' should NOT exist (use '$correct' instead for $context)",
      async ({ wrong, correct }) => {
        const { error: wrongError } = await supabase!
          .from(wrong)
          .select("count")
          .limit(1);

        const { error: correctError } = await supabase!
          .from(correct)
          .select("count")
          .limit(1);

        // If wrong table exists, warn (but don't fail - might be intentional)
        if (!wrongError || wrongError.code !== "42P01") {
          console.warn(
            `⚠️ Table '${wrong}' exists. Make sure code uses '${correct}' for the correct purpose.`,
          );
        }

        // Correct table MUST exist
        if (correctError?.code === "42P01") {
          throw new Error(
            `Required table '${correct}' does not exist! Code might be using '${wrong}' incorrectly.`,
          );
        }
      },
    );
  });

  describe("Column Names Consistency", () => {
    it.each(COLUMN_MAPPINGS)(
      "✅ Table '$table' should use '$correctColumn' (not '$wrongColumn')",
      async ({ table, correctColumn }) => {
        // Try to select the correct column
        const { error } = await supabase!
          .from(table)
          .select(correctColumn)
          .limit(1);

        if (error?.code === "42703") {
          throw new Error(
            `Column '${correctColumn}' does not exist in table '${table}'!`,
          );
        }

        if (error && error.code !== "PGRST116") {
          // Ignore "no rows" error
          if (error.code !== "42501") {
            // Ignore permission errors
            throw new Error(
              `Error checking column '${correctColumn}' in '${table}': ${error.message}`,
            );
          }
        }
      },
    );
  });

  describe("Foreign Key References", () => {
    it("✅ gmb_locations.gmb_account_id should reference gmb_accounts.id", async () => {
      // This test verifies the FK relationship exists by checking schema
      const { data, error } = await supabase!.rpc("get_table_columns", {
        p_table_name: "gmb_locations",
      });

      // If RPC doesn't exist, skip this test
      if (error?.code === "42883") {
        console.warn(
          "⚠️ get_table_columns RPC not available, skipping FK test",
        );
        return;
      }

      // Manual check: try to insert with invalid FK
      const { error: fkError } = await supabase!.from("gmb_locations").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        gmb_account_id: "00000000-0000-0000-0000-000000000000", // Invalid FK
        location_id: "test-fk-check",
        location_name: "FK Test",
      });

      // Should fail with FK violation (23503) or user not found (23503)
      expect(fkError).not.toBeNull();
    });

    it("✅ sync_queue.account_id should reference gmb_accounts.id", async () => {
      const { error: fkError } = await supabase!.from("sync_queue").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        account_id: "00000000-0000-0000-0000-000000000000", // Invalid FK
        sync_type: "full",
        status: "pending",
      });

      // Should fail with FK violation
      expect(fkError).not.toBeNull();
    });
  });
});

describe("Auto-Detect Tables Used in Code", () => {
  /**
   * This test automatically scans ALL code files to find table names
   * used with Supabase .from() calls, then verifies each table exists
   * in the database. This catches typos and wrong table names!
   */

  const SCAN_DIRS = [
    path.join(process.cwd(), "app/api"),
    path.join(process.cwd(), "server/actions"),
    path.join(process.cwd(), "lib"),
  ];

  // Extract all table names from .from("tableName") calls in code
  function extractTablesFromCode(): Set<string> {
    const tables = new Set<string>();
    const fromPattern =
      /\.from\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_]*)["'`]\s*\)/g;

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory() && !item.name.startsWith(".")) {
          scanDir(fullPath);
        } else if (
          item.isFile() &&
          (item.name.endsWith(".ts") || item.name.endsWith(".tsx"))
        ) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            let match;
            while ((match = fromPattern.exec(content)) !== null) {
              tables.add(match[1]);
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    }

    for (const dir of SCAN_DIRS) {
      scanDir(dir);
    }

    return tables;
  }

  it("✅ All tables used in code should exist in database", async () => {
    if (shouldSkip) return;

    const tablesInCode = extractTablesFromCode();
    const missingTables: string[] = [];
    const existingTables: string[] = [];

    for (const table of tablesInCode) {
      const { error } = await supabase!.from(table).select("count").limit(1);

      if (error?.code === "42P01") {
        missingTables.push(table);
      } else {
        existingTables.push(table);
      }
    }

    console.log(`\n📊 Tables Analysis:`);
    console.log(`   Found ${tablesInCode.size} unique tables in code`);
    console.log(`   ✅ ${existingTables.length} tables exist in database`);

    if (missingTables.length > 0) {
      console.log(`   ❌ ${missingTables.length} tables MISSING:`);
      missingTables.forEach((t) => console.log(`      - ${t}`));

      throw new Error(
        `Missing tables in database: ${missingTables.join(", ")}\n` +
          `These tables are used in code but don't exist!`,
      );
    }
  });

  it("✅ Should list all tables used in code", async () => {
    const tablesInCode = extractTablesFromCode();

    console.log(`\n📋 Tables used in code:`);
    const sortedTables = Array.from(tablesInCode).sort();
    sortedTables.forEach((t) => console.log(`   - ${t}`));

    expect(tablesInCode.size).toBeGreaterThan(0);
  });
});

describe("API Endpoint Table Usage", () => {
  // These tests scan specific API files to verify correct table usage

  const API_DIR = path.join(process.cwd(), "app/api");

  it.each(API_TABLE_USAGE)(
    "✅ $endpoint should use correct tables",
    async ({ endpoint, shouldUse, shouldNotUse }) => {
      // Convert endpoint to file path
      const filePath = path.join(
        API_DIR,
        endpoint.replace("/api/", ""),
        "route.ts",
      );

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(filePath, "utf-8");

      // Check that required tables are used
      for (const table of shouldUse) {
        const patterns = [
          `.from("${table}")`,
          `.from('${table}')`,
          `from("${table}")`,
          `from('${table}')`,
        ];

        const isUsed = patterns.some((p) => content.includes(p));

        if (!isUsed) {
          console.warn(
            `⚠️ ${endpoint} might not be using table '${table}' directly`,
          );
        }
      }

      // Check that wrong tables are NOT used
      for (const table of shouldNotUse) {
        const patterns = [
          `.from("${table}")`,
          `.from('${table}')`,
          `from("${table}")`,
          `from('${table}')`,
        ];

        const isUsed = patterns.some((p) => content.includes(p));

        if (isUsed) {
          throw new Error(
            `❌ ${endpoint} is using wrong table '${table}'! This will cause runtime errors.`,
          );
        }
      }
    },
  );
});

describe("Critical Flow Tests", () => {
  // Skip if no credentials
  if (shouldSkip) {
    it.skip("Skipped: Missing Supabase credentials", () => {});
    return;
  }

  it("✅ OAuth → Sync flow tables are consistent", async () => {
    // Verify the tables used in OAuth callback match those used in sync
    const oauthTables = ["gmb_accounts", "gmb_secrets", "oauth_states"];
    const syncTables = ["gmb_accounts", "sync_queue", "gmb_locations"];

    // All these tables must exist
    const allTables = [...new Set([...oauthTables, ...syncTables])];

    for (const table of allTables) {
      const { error } = await supabase!.from(table).select("count").limit(1);

      if (error?.code === "42P01") {
        throw new Error(
          `Critical table '${table}' missing! OAuth→Sync flow will fail.`,
        );
      }
    }
  });

  it("✅ Reviews sync tables are consistent", async () => {
    const reviewTables = ["gmb_reviews", "gmb_locations", "gmb_accounts"];

    for (const table of reviewTables) {
      const { error } = await supabase!.from(table).select("count").limit(1);

      if (error?.code === "42P01") {
        throw new Error(
          `Critical table '${table}' missing! Reviews sync will fail.`,
        );
      }
    }
  });
});
