#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Admin Tasks CLI Script
 *
 * SECURITY: This script must ONLY be executed via terminal.
 * These operations are too dangerous to expose via HTTP endpoints.
 *
 * Usage:
 *   npm run admin:task -- <command> [options]
 *
 * Commands:
 *   list-migrations          List available migration files
 *   apply-migration <file>   Apply a specific migration file
 *   fix-rls                  Drop old conflicting RLS policies
 *   help                     Show this help message
 *
 * Examples:
 *   npm run admin:task -- list-migrations
 *   npm run admin:task -- apply-migration 20250101000000_init_full_schema.sql
 *   npm run admin:task -- fix-rls
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { Client } from "pg";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message: string, color: keyof typeof colors = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message: string): void {
  console.error(
    `${colors.red}${colors.bold}ERROR:${colors.reset} ${colors.red}${message}${colors.reset}`,
  );
}

function logSuccess(message: string): void {
  console.log(
    `${colors.green}${colors.bold}SUCCESS:${colors.reset} ${colors.green}${message}${colors.reset}`,
  );
}

function logWarning(message: string): void {
  console.log(
    `${colors.yellow}${colors.bold}WARNING:${colors.reset} ${colors.yellow}${message}${colors.reset}`,
  );
}

function logInfo(message: string): void {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}

// Validate environment
function validateEnvironment(): void {
  const requiredEnvVars = ["DATABASE_URL"];

  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logError(`Missing required environment variables: ${missing.join(", ")}`);
    logInfo("Make sure you have a .env.local file with DATABASE_URL set.");
    logInfo(
      "Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres",
    );
    process.exit(1);
  }
}

// Create PostgreSQL client for direct database access
async function createPgClient(): Promise<Client> {
  const connectionString = process.env.DATABASE_URL!;
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

// Execute SQL using direct PostgreSQL connection
async function executeSql(sql: string): Promise<void> {
  const client = await createPgClient();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

// Command: List migrations
async function listMigrations(): Promise<void> {
  log("\n📋 Available Migrations\n", "bold");

  const migrationsDir = join(process.cwd(), "supabase", "migrations");

  if (!existsSync(migrationsDir)) {
    logError(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    logWarning("No migration files found.");
    return;
  }

  log(`Found ${files.length} migration(s):\n`, "cyan");

  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });

  console.log("");
}

// Command: Apply migration
async function applyMigration(migrationFile: string): Promise<void> {
  log(`\n🔄 Applying Migration: ${migrationFile}\n`, "bold");

  // Validate migration file name to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+\.sql$/.test(migrationFile)) {
    logError(
      "Invalid migration file name format. Must match pattern: [a-zA-Z0-9_-]+.sql",
    );
    process.exit(1);
  }

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const migrationPath = join(migrationsDir, migrationFile);

  // Ensure the resolved path is within the migrations directory (prevent path traversal)
  const resolvedPath = resolve(migrationPath);
  const resolvedDir = resolve(migrationsDir);

  if (
    !resolvedPath.startsWith(resolvedDir + "/") &&
    resolvedPath !== resolvedDir
  ) {
    logError("Invalid migration file path - path traversal detected.");
    process.exit(1);
  }

  // Check file exists
  if (!existsSync(resolvedPath)) {
    logError(`Migration file not found: ${migrationFile}`);
    logInfo(
      `Run 'npm run admin:task -- list-migrations' to see available files.`,
    );
    process.exit(1);
  }

  const stats = statSync(resolvedPath);
  if (!stats.isFile()) {
    logError("Invalid migration file - not a regular file.");
    process.exit(1);
  }

  // Read migration SQL
  const migrationSQL = readFileSync(resolvedPath, "utf-8");

  logInfo(`Migration file size: ${stats.size} bytes`);
  logInfo(
    `SQL preview (first 200 chars):\n${migrationSQL.substring(0, 200)}...\n`,
  );

  // Confirm before executing
  logWarning("This will execute SQL directly against your database.");
  logWarning("Make sure you have a backup before proceeding.\n");

  // Execute migration
  validateEnvironment();

  log("Executing migration...", "cyan");

  try {
    await executeSql(migrationSQL);
  } catch (error) {
    logError(
      `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    logInfo("Check database logs for more details.");
    process.exit(1);
  }

  logSuccess(`Migration ${migrationFile} applied successfully!`);
  log(`Timestamp: ${new Date().toISOString()}`, "cyan");
}

// Command: Fix RLS
async function fixRls(): Promise<void> {
  log("\n🔧 Fixing RLS Policies\n", "bold");

  validateEnvironment();

  const sql = `
    -- Drop old user-based policies that conflict with team RBAC
    DROP POLICY IF EXISTS "Users can view their own locations" ON gmb_locations;
    DROP POLICY IF EXISTS "Users can insert their own locations" ON gmb_locations;
    DROP POLICY IF EXISTS "Users can update their own locations" ON gmb_locations;
    DROP POLICY IF EXISTS "Users can delete their own locations" ON gmb_locations;
  `;

  logInfo("Executing SQL to drop conflicting policies...\n");
  log(sql, "cyan");

  try {
    await executeSql(sql);
  } catch (error) {
    logError(
      `Failed to fix RLS: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }

  logSuccess("Old RLS policies dropped successfully!");
  logInfo("Team policies will now handle access.");
}

// Command: Help
function showHelp(): void {
  console.log(`
${colors.bold}${colors.cyan}Admin Tasks CLI${colors.reset}

${colors.bold}SECURITY NOTICE:${colors.reset}
${colors.yellow}These operations are intentionally CLI-only and must NEVER be exposed via HTTP.${colors.reset}

${colors.bold}Usage:${colors.reset}
  npm run admin:task -- <command> [options]

${colors.bold}Commands:${colors.reset}
  ${colors.green}list-migrations${colors.reset}          List available migration files
  ${colors.green}apply-migration <file>${colors.reset}   Apply a specific migration file
  ${colors.green}fix-rls${colors.reset}                  Drop old conflicting RLS policies
  ${colors.green}help${colors.reset}                     Show this help message

${colors.bold}Examples:${colors.reset}
  npm run admin:task -- list-migrations
  npm run admin:task -- apply-migration 20250101000000_init_full_schema.sql
  npm run admin:task -- fix-rls

${colors.bold}Environment Variables Required:${colors.reset}
  DATABASE_URL    Direct PostgreSQL connection string
                  Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
`);
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Load environment variables from .env.local
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local" });
    dotenv.config({ path: ".env" });
  } catch {
    // dotenv not available, rely on system env vars
  }

  switch (command) {
    case "list-migrations":
      await listMigrations();
      break;

    case "apply-migration": {
      const migrationFile = args[1];
      if (!migrationFile) {
        logError("Migration file name is required.");
        logInfo("Usage: npm run admin:task -- apply-migration <filename.sql>");
        process.exit(1);
      }
      await applyMigration(migrationFile);
      break;
    }

    case "fix-rls":
      await fixRls();
      break;

    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;

    default:
      if (command) {
        logError(`Unknown command: ${command}`);
      }
      showHelp();
      process.exit(command ? 1 : 0);
  }
}

main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
