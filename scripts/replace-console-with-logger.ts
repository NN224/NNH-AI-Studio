#!/usr/bin/env ts-node
/**
 * Safe Console to Logger Migration Script
 *
 * This script automatically replaces console.error and console.warn with logger calls.
 *
 * Safety Features:
 * 1. Creates backup before any changes
 * 2. Dry-run mode to preview changes
 * 3. Only processes TypeScript files in app/api/
 * 4. Validates syntax after changes
 * 5. Can rollback if issues detected
 *
 * Usage:
 *   npm run migrate-logger           # Dry run (preview only)
 *   npm run migrate-logger -- --apply  # Apply changes
 *   npm run migrate-logger -- --rollback  # Restore backup
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Configuration
const CONFIG = {
  targetDir: "app/api",
  backupDir: ".logger-migration-backup",
  excludePatterns: [
    "node_modules",
    ".next",
    "dist",
    "build",
    "logger.ts", // Don't modify the logger itself
  ],
  loggerImports: {
    "app/api/gmb": "import { gmbLogger } from '@/lib/utils/logger';",
    "app/api/auth": "import { authLogger } from '@/lib/utils/logger';",
    "app/api/ai": "import { apiLogger } from '@/lib/utils/logger';",
    "app/api/webhooks": "import { apiLogger } from '@/lib/utils/logger';",
    default: "import { apiLogger } from '@/lib/utils/logger';",
  },
};

interface FileChange {
  filePath: string;
  originalContent: string;
  newContent: string;
  changes: string[];
}

class LoggerMigration {
  private changes: FileChange[] = [];
  private stats = {
    filesProcessed: 0,
    filesModified: 0,
    consoleErrorReplaced: 0,
    consoleWarnReplaced: 0,
    errors: 0,
  };

  /**
   * Get appropriate logger name based on file path
   */
  private getLoggerName(filePath: string): string {
    if (filePath.includes("app/api/gmb")) return "gmbLogger";
    if (filePath.includes("app/api/auth")) return "authLogger";
    return "apiLogger";
  }

  /**
   * Get appropriate logger import based on file path
   */
  private getLoggerImport(filePath: string): string {
    for (const [pattern, importStatement] of Object.entries(
      CONFIG.loggerImports,
    )) {
      if (pattern !== "default" && filePath.includes(pattern)) {
        return importStatement;
      }
    }
    return CONFIG.loggerImports.default;
  }

  /**
   * Check if file already has logger import
   */
  private hasLoggerImport(content: string): boolean {
    return /import\s+{[^}]*logger[^}]*}\s+from\s+['"]@\/lib\/utils\/logger['"]/.test(
      content,
    );
  }

  /**
   * Add logger import to file
   */
  private addLoggerImport(content: string, filePath: string): string {
    if (this.hasLoggerImport(content)) {
      return content;
    }

    const importStatement = this.getLoggerImport(filePath);

    // Find the last import statement
    const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;

      return (
        content.slice(0, insertPosition) +
        "\n" +
        importStatement +
        content.slice(insertPosition)
      );
    }

    // If no imports found, add at the top after any comments
    const lines = content.split("\n");
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line &&
        !line.startsWith("//") &&
        !line.startsWith("/*") &&
        !line.startsWith("*")
      ) {
        insertIndex = i;
        break;
      }
    }

    lines.splice(insertIndex, 0, importStatement, "");
    return lines.join("\n");
  }

  /**
   * Replace console.error with logger.error
   */
  private replaceConsoleError(
    content: string,
    loggerName: string,
  ): { content: string; count: number } {
    let count = 0;

    // Pattern 1: console.error('message', error)
    content = content.replace(
      /console\.error\(\s*(['"`][^'"`]*['"`])\s*,\s*([^)]+)\s*\)/g,
      (match, message, errorVar) => {
        count++;
        const cleanMessage = message.slice(1, -1).replace(/^\[.*?\]\s*/, ""); // Remove [Tag] prefix
        return `${loggerName}.error('${cleanMessage}', ${errorVar} instanceof Error ? ${errorVar} : new Error(String(${errorVar})))`;
      },
    );

    // Pattern 2: console.error('message')
    content = content.replace(
      /console\.error\(\s*(['"`][^'"`]*['"`])\s*\)/g,
      (match, message) => {
        count++;
        const cleanMessage = message.slice(1, -1).replace(/^\[.*?\]\s*/, "");
        return `${loggerName}.error('${cleanMessage}', new Error('${cleanMessage}'))`;
      },
    );

    return { content, count };
  }

  /**
   * Replace console.warn with logger.warn
   */
  private replaceConsoleWarn(
    content: string,
    loggerName: string,
  ): { content: string; count: number } {
    let count = 0;

    // Pattern: console.warn('message', data)
    content = content.replace(
      /console\.warn\(\s*(['"`][^'"`]*['"`])\s*,\s*([^)]+)\s*\)/g,
      (match, message, data) => {
        count++;
        const cleanMessage = message.slice(1, -1).replace(/^\[.*?\]\s*/, "");
        return `${loggerName}.warn('${cleanMessage}', ${data})`;
      },
    );

    // Pattern: console.warn('message')
    content = content.replace(
      /console\.warn\(\s*(['"`][^'"`]*['"`])\s*\)/g,
      (match, message) => {
        count++;
        const cleanMessage = message.slice(1, -1).replace(/^\[.*?\]\s*/, "");
        return `${loggerName}.warn('${cleanMessage}')`;
      },
    );

    return { content, count };
  }

  /**
   * Process a single file
   */
  private processFile(filePath: string): FileChange | null {
    this.stats.filesProcessed++;

    const originalContent = fs.readFileSync(filePath, "utf-8");

    // Skip if no console.error or console.warn (except comments)
    if (!originalContent.match(/^\s*console\.(error|warn)\(/gm)) {
      return null;
    }

    let newContent = originalContent;
    const changes: string[] = [];
    const loggerName = this.getLoggerName(filePath);

    // Add logger import if needed
    if (!this.hasLoggerImport(newContent)) {
      newContent = this.addLoggerImport(newContent, filePath);
      changes.push(`Added ${loggerName} import`);
    }

    // Replace console.error
    const errorResult = this.replaceConsoleError(newContent, loggerName);
    newContent = errorResult.content;
    if (errorResult.count > 0) {
      changes.push(`Replaced ${errorResult.count} console.error`);
      this.stats.consoleErrorReplaced += errorResult.count;
    }

    // Replace console.warn
    const warnResult = this.replaceConsoleWarn(newContent, loggerName);
    newContent = warnResult.content;
    if (warnResult.count > 0) {
      changes.push(`Replaced ${warnResult.count} console.warn`);
      this.stats.consoleWarnReplaced += warnResult.count;
    }

    if (changes.length === 0) {
      return null;
    }

    this.stats.filesModified++;

    return {
      filePath,
      originalContent,
      newContent,
      changes,
    };
  }

  /**
   * Find all TypeScript files in target directory
   */
  private findFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // Skip excluded patterns
        if (
          CONFIG.excludePatterns.some((pattern) => fullPath.includes(pattern))
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Create backup of all files
   */
  private createBackup() {
    console.log("📦 Creating backup...");

    if (fs.existsSync(CONFIG.backupDir)) {
      fs.rmSync(CONFIG.backupDir, { recursive: true });
    }

    fs.mkdirSync(CONFIG.backupDir, { recursive: true });

    for (const change of this.changes) {
      const backupPath = path.join(CONFIG.backupDir, change.filePath);
      const backupDir = path.dirname(backupPath);

      fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(backupPath, change.originalContent, "utf-8");
    }

    console.log(`✅ Backup created: ${CONFIG.backupDir}`);
  }

  /**
   * Apply changes to files
   */
  private applyChanges() {
    console.log("\n📝 Applying changes...");

    for (const change of this.changes) {
      fs.writeFileSync(change.filePath, change.newContent, "utf-8");
      console.log(`  ✅ ${change.filePath}`);
      change.changes.forEach((c) => console.log(`     - ${c}`));
    }
  }

  /**
   * Validate TypeScript syntax
   */
  private validateSyntax(): boolean {
    console.log("\n🔍 Validating TypeScript syntax...");

    try {
      execSync("npx tsc --noEmit", { stdio: "pipe" });
      console.log("✅ TypeScript validation passed");
      return true;
    } catch (error) {
      console.error("❌ TypeScript validation failed");
      console.error(
        (error as any).stdout?.toString() || (error as any).message,
      );
      return false;
    }
  }

  /**
   * Rollback changes
   */
  private rollback() {
    console.log("\n⏮️  Rolling back changes...");

    if (!fs.existsSync(CONFIG.backupDir)) {
      console.error("❌ No backup found");
      return;
    }

    for (const change of this.changes) {
      const backupPath = path.join(CONFIG.backupDir, change.filePath);
      if (fs.existsSync(backupPath)) {
        fs.writeFileSync(change.filePath, change.originalContent, "utf-8");
        console.log(`  ✅ Restored ${change.filePath}`);
      }
    }

    console.log("✅ Rollback complete");
  }

  /**
   * Print summary
   */
  private printSummary(dryRun: boolean) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Files scanned:         ${this.stats.filesProcessed}`);
    console.log(`Files to modify:       ${this.stats.filesModified}`);
    console.log(`console.error found:   ${this.stats.consoleErrorReplaced}`);
    console.log(`console.warn found:    ${this.stats.consoleWarnReplaced}`);
    console.log(
      `Total replacements:    ${this.stats.consoleErrorReplaced + this.stats.consoleWarnReplaced}`,
    );

    if (dryRun) {
      console.log("\n⚠️  DRY RUN MODE - No changes applied");
      console.log("Run with --apply flag to apply changes");
    }

    console.log("=".repeat(60));
  }

  /**
   * Main execution
   */
  async run(mode: "dry-run" | "apply" | "rollback") {
    console.log("🚀 Logger Migration Script\n");

    if (mode === "rollback") {
      this.rollback();
      return;
    }

    // Find all files
    console.log(`🔍 Scanning ${CONFIG.targetDir}...`);
    const files = this.findFiles(CONFIG.targetDir);
    console.log(`Found ${files.length} TypeScript files\n`);

    // Process each file
    console.log("🔄 Processing files...");
    for (const file of files) {
      const change = this.processFile(file);
      if (change) {
        this.changes.push(change);

        if (mode === "dry-run") {
          console.log(`\n📄 ${change.filePath}`);
          change.changes.forEach((c) => console.log(`   - ${c}`));
        }
      }
    }

    // Print summary
    this.printSummary(mode === "dry-run");

    if (mode === "apply" && this.changes.length > 0) {
      // Create backup
      this.createBackup();

      // Apply changes
      this.applyChanges();

      // Validate
      const isValid = this.validateSyntax();

      if (!isValid) {
        console.log("\n⚠️  Validation failed. Rolling back...");
        this.rollback();
        process.exit(1);
      }

      console.log("\n✅ Migration completed successfully!");
      console.log(`\n💡 Backup saved in: ${CONFIG.backupDir}`);
      console.log("   Run with --rollback to restore if needed");
    }
  }
}

// CLI
const args = process.argv.slice(2);
const mode = args.includes("--apply")
  ? "apply"
  : args.includes("--rollback")
    ? "rollback"
    : "dry-run";

const migration = new LoggerMigration();
migration.run(mode).catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
