import { requireAdmin } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/server";

// Complete schema definitions with constraints and relationships
const COMPLETE_SCHEMA: Record<string, TableSchema> = {
  gmb_accounts: {
    columns: {
      id: {
        type: "UUID",
        nullable: false,
        default: "gen_random_uuid()",
        primary: true,
      },
      user_id: { type: "UUID", nullable: false, references: "auth.users(id)" },
      account_id: { type: "TEXT", nullable: false, unique: true },
      account_name: { type: "TEXT", nullable: true },
      email: { type: "TEXT", nullable: true },
      google_account_id: { type: "TEXT", nullable: true },
      access_token: { type: "TEXT", nullable: true },
      refresh_token: { type: "TEXT", nullable: true },
      token_expires_at: { type: "TIMESTAMPTZ", nullable: true },
      is_active: { type: "BOOLEAN", nullable: true, default: "true" },
      last_sync: { type: "TIMESTAMPTZ", nullable: true },
      data_retention_days: { type: "INTEGER", nullable: true, default: "90" },
      delete_on_disconnect: {
        type: "BOOLEAN",
        nullable: true,
        default: "false",
      },
      disconnected_at: { type: "TIMESTAMPTZ", nullable: true },
      settings: { type: "JSONB", nullable: true },
      created_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
      updated_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
    },
    indexes: ["user_id", "account_id"],
    rls_enabled: true,
    policies: ["Users can manage their own GMB accounts"],
  },
  gmb_locations: {
    columns: {
      id: {
        type: "UUID",
        nullable: false,
        default: "gen_random_uuid()",
        primary: true,
      },
      gmb_account_id: {
        type: "UUID",
        nullable: false,
        references: "gmb_accounts(id)",
      },
      user_id: { type: "UUID", nullable: false, references: "auth.users(id)" },
      location_name: { type: "TEXT", nullable: true },
      location_id: { type: "TEXT", nullable: false, unique: true },
      address: { type: "TEXT", nullable: true },
      phone: { type: "TEXT", nullable: true },
      website: { type: "TEXT", nullable: true },
      categories: { type: "JSONB", nullable: true, default: "'[]'" },
      is_active: { type: "BOOLEAN", nullable: true, default: "true" },
      metadata: { type: "JSONB", nullable: true },
      created_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
      updated_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
    },
    indexes: ["gmb_account_id", "user_id", "location_id"],
    rls_enabled: true,
    policies: ["Users can manage locations for their accounts"],
  },
  sync_queue: {
    columns: {
      id: {
        type: "UUID",
        nullable: false,
        default: "gen_random_uuid()",
        primary: true,
      },
      user_id: { type: "UUID", nullable: false, references: "auth.users(id)" },
      gmb_account_id: {
        type: "UUID",
        nullable: false,
        references: "gmb_accounts(id)",
      },
      sync_type: { type: "VARCHAR(50)", nullable: true, default: "'full'" },
      priority: { type: "INTEGER", nullable: true, default: "5" },
      status: { type: "VARCHAR(50)", nullable: true, default: "'pending'" },
      attempts: { type: "INTEGER", nullable: true, default: "0" },
      max_attempts: { type: "INTEGER", nullable: true, default: "3" },
      error_message: { type: "TEXT", nullable: true },
      metadata: { type: "JSONB", nullable: true },
      created_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
      started_at: { type: "TIMESTAMPTZ", nullable: true },
      completed_at: { type: "TIMESTAMPTZ", nullable: true },
      updated_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
    },
    indexes: ["user_id", "gmb_account_id", "status", "priority"],
    rls_enabled: true,
    policies: ["Users can manage their own sync queue"],
  },
  oauth_states: {
    columns: {
      id: {
        type: "UUID",
        nullable: false,
        default: "gen_random_uuid()",
        primary: true,
      },
      state: { type: "VARCHAR(255)", nullable: false, unique: true },
      user_id: { type: "UUID", nullable: false, references: "auth.users(id)" },
      provider: { type: "VARCHAR(50)", nullable: false, default: "'google'" },
      expires_at: { type: "TIMESTAMPTZ", nullable: false },
      used: { type: "BOOLEAN", nullable: true, default: "false" },
      created_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
      updated_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
    },
    indexes: ["state", "user_id", "expires_at"],
    rls_enabled: true,
    policies: ["Users can manage their own oauth states"],
  },
  profiles: {
    columns: {
      id: {
        type: "UUID",
        nullable: false,
        references: "auth.users(id)",
        primary: true,
      },
      email: { type: "TEXT", nullable: true },
      full_name: { type: "TEXT", nullable: true },
      avatar_url: { type: "TEXT", nullable: true },
      created_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
      updated_at: { type: "TIMESTAMPTZ", nullable: true, default: "now()" },
    },
    indexes: ["email"],
    rls_enabled: true,
    policies: ["Users can manage their own profile"],
  },
};

interface TableSchema {
  columns: Record<string, ColumnSchema>;
  indexes: string[];
  rls_enabled: boolean;
  policies: string[];
}

interface ColumnSchema {
  type: string;
  nullable: boolean;
  default?: string;
  unique?: boolean;
  primary?: boolean;
  references?: string;
}

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  table?: string;
  column?: string;
  issue: string;
  impact: string;
  fix_sql?: string;
  code_location?: string;
}

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck) {
      return adminCheck;
    }

    const adminClient = createAdminClient();
    const issues: HealthIssue[] = [];

    // 1. Schema Validation
    await validateSchema(adminClient, issues);

    // 2. Data Integrity Checks
    await checkDataIntegrity(adminClient, issues);

    // 3. Performance Issues
    await checkPerformance(adminClient, issues);

    // 4. Security Audit
    await checkSecurity(adminClient, issues);

    // 5. Code-Database Mismatch
    await checkCodeDatabaseMismatch(adminClient, issues);

    // Categorize issues
    const critical = issues.filter((i) => i.severity === "critical");
    const warnings = issues.filter((i) => i.severity === "warning");
    const info = issues.filter((i) => i.severity === "info");

    // Generate fix SQL
    const fixSQL = generateComprehensiveFixSQL(issues);

    return Response.json({
      success: critical.length === 0,
      health_score: calculateHealthScore(issues),
      summary: {
        total_issues: issues.length,
        critical: critical.length,
        warnings: warnings.length,
        info: info.length,
      },
      issues: {
        critical,
        warnings,
        info,
      },
      fix_sql: fixSQL,
      recommendations: generateHealthRecommendations(issues),
      next_steps: generateNextSteps(critical, warnings),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

async function validateSchema(adminClient: any, issues: HealthIssue[]) {
  for (const [tableName, schema] of Object.entries(COMPLETE_SCHEMA)) {
    try {
      // Check if table exists
      const { error: tableError } = await adminClient
        .from(tableName)
        .select("*")
        .limit(1);

      if (tableError) {
        issues.push({
          severity: "critical",
          category: "Missing Table",
          table: tableName,
          issue: `Table '${tableName}' does not exist`,
          impact: "Application features will fail",
          fix_sql: generateCreateTableSQL(tableName, schema),
        });
        continue;
      }

      // Check columns
      for (const [columnName, columnSchema] of Object.entries(schema.columns)) {
        const { error: columnError } = await adminClient
          .from(tableName)
          .select(columnName)
          .limit(1);

        if (columnError && columnError.message.includes(columnName)) {
          issues.push({
            severity: columnSchema.nullable === false ? "critical" : "warning",
            category: "Missing Column",
            table: tableName,
            column: columnName,
            issue: `Column '${columnName}' missing in table '${tableName}'`,
            impact:
              columnSchema.nullable === false
                ? "Data insertion will fail"
                : "Some features may not work",
            fix_sql: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnSchema.type}${columnSchema.nullable === false ? " NOT NULL" : ""}${columnSchema.default ? ` DEFAULT ${columnSchema.default}` : ""};`,
          });
        }
      }
    } catch (error) {
      issues.push({
        severity: "critical",
        category: "Schema Error",
        table: tableName,
        issue: `Failed to validate table: ${error instanceof Error ? error.message : "Unknown error"}`,
        impact: "Cannot verify table structure",
      });
    }
  }
}

async function checkDataIntegrity(adminClient: any, issues: HealthIssue[]) {
  // Check for orphaned records
  try {
    // GMB Locations without valid accounts
    const { data: orphanedLocations } = await adminClient
      .from("gmb_locations")
      .select("id, gmb_account_id")
      .not("gmb_account_id", "in", `(SELECT id FROM gmb_accounts)`);

    if (orphanedLocations && orphanedLocations.length > 0) {
      issues.push({
        severity: "warning",
        category: "Data Integrity",
        table: "gmb_locations",
        issue: `${orphanedLocations.length} locations reference non-existent GMB accounts`,
        impact: "Orphaned data taking up space, potential sync issues",
        fix_sql:
          "DELETE FROM gmb_locations WHERE gmb_account_id NOT IN (SELECT id FROM gmb_accounts);",
      });
    }

    // Sync queue items without valid accounts
    const { data: orphanedQueue } = await adminClient
      .from("sync_queue")
      .select("id, gmb_account_id")
      .not("gmb_account_id", "in", `(SELECT id FROM gmb_accounts)`);

    if (orphanedQueue && orphanedQueue.length > 0) {
      issues.push({
        severity: "warning",
        category: "Data Integrity",
        table: "sync_queue",
        issue: `${orphanedQueue.length} sync queue items reference non-existent GMB accounts`,
        impact: "Failed sync jobs, wasted processing",
        fix_sql:
          "DELETE FROM sync_queue WHERE gmb_account_id NOT IN (SELECT id FROM gmb_accounts);",
      });
    }

    // Expired OAuth states
    const { data: expiredStates } = await adminClient
      .from("oauth_states")
      .select("id")
      .lt("expires_at", new Date().toISOString());

    if (expiredStates && expiredStates.length > 0) {
      issues.push({
        severity: "info",
        category: "Data Cleanup",
        table: "oauth_states",
        issue: `${expiredStates.length} expired OAuth states can be cleaned up`,
        impact: "Unnecessary data storage",
        fix_sql: `DELETE FROM oauth_states WHERE expires_at < NOW();`,
      });
    }
  } catch (error) {
    issues.push({
      severity: "warning",
      category: "Data Integrity",
      issue: `Failed to check data integrity: ${error instanceof Error ? error.message : "Unknown error"}`,
      impact: "Cannot verify data consistency",
    });
  }
}

async function checkPerformance(adminClient: any, issues: HealthIssue[]) {
  // Check for missing indexes
  for (const [tableName, schema] of Object.entries(COMPLETE_SCHEMA)) {
    for (const indexColumn of schema.indexes) {
      // This is a simplified check - in real implementation, you'd query pg_indexes
      issues.push({
        severity: "info",
        category: "Performance",
        table: tableName,
        issue: `Verify index exists on ${tableName}.${indexColumn}`,
        impact: "Slow queries if index missing",
        fix_sql: `CREATE INDEX IF NOT EXISTS idx_${tableName}_${indexColumn} ON ${tableName}(${indexColumn});`,
      });
    }
  }

  // Check for large tables without recent maintenance
  try {
    const { data: largeTables } = await adminClient
      .from("gmb_accounts")
      .select("id")
      .limit(1000);

    if (largeTables && largeTables.length > 500) {
      issues.push({
        severity: "info",
        category: "Performance",
        table: "gmb_accounts",
        issue: "Large table may benefit from maintenance",
        impact: "Potential performance degradation",
        fix_sql: "VACUUM ANALYZE gmb_accounts;",
      });
    }
  } catch (error) {
    // Ignore performance check errors
  }
}

async function checkSecurity(adminClient: any, issues: HealthIssue[]) {
  // Check RLS policies
  for (const [tableName, schema] of Object.entries(COMPLETE_SCHEMA)) {
    if (schema.rls_enabled) {
      // This would need actual policy checking in real implementation
      issues.push({
        severity: "warning",
        category: "Security",
        table: tableName,
        issue: `Verify RLS policies are active on ${tableName}`,
        impact: "Potential data exposure if RLS not properly configured",
        fix_sql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
      });
    }
  }

  // Check for unencrypted sensitive data
  try {
    const { data: accounts } = await adminClient
      .from("gmb_accounts")
      .select("id, access_token")
      .not("access_token", "is", null)
      .limit(1);

    if (accounts && accounts.length > 0) {
      const token = accounts[0].access_token;
      if (token && !token.startsWith("encrypted:")) {
        issues.push({
          severity: "critical",
          category: "Security",
          table: "gmb_accounts",
          column: "access_token",
          issue: "Access tokens appear to be stored unencrypted",
          impact: "Security vulnerability - tokens exposed",
          code_location: "Check encryption in oauth-callback/route.ts",
        });
      }
    }
  } catch (error) {
    // Ignore if we can't check encryption
  }
}

async function checkCodeDatabaseMismatch(
  adminClient: any,
  issues: HealthIssue[],
) {
  // This would check actual code files for database usage patterns
  // For now, we'll add some common mismatch patterns

  issues.push({
    severity: "info",
    category: "Code Review",
    issue: "Verify all database queries use proper error handling",
    impact: "Unhandled database errors can crash application",
    code_location: "Review all Supabase client usage",
  });

  issues.push({
    severity: "info",
    category: "Code Review",
    issue: "Verify all sensitive data is encrypted before storage",
    impact: "Data security compliance",
    code_location: "Check token handling in oauth flows",
  });
}

function generateCreateTableSQL(
  tableName: string,
  schema: TableSchema,
): string {
  const columns = Object.entries(schema.columns)
    .map(([name, col]) => {
      let def = `${name} ${col.type}`;
      if (!col.nullable) def += " NOT NULL";
      if (col.default) def += ` DEFAULT ${col.default}`;
      if (col.unique) def += " UNIQUE";
      if (col.primary) def += " PRIMARY KEY";
      return def;
    })
    .join(",\n  ");

  let sql = `CREATE TABLE ${tableName} (\n  ${columns}\n);`;

  // Add foreign key constraints
  for (const [name, col] of Object.entries(schema.columns)) {
    if (col.references) {
      sql += `\nALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${name} FOREIGN KEY (${name}) REFERENCES ${col.references} ON DELETE CASCADE;`;
    }
  }

  // Add indexes
  for (const indexCol of schema.indexes) {
    sql += `\nCREATE INDEX IF NOT EXISTS idx_${tableName}_${indexCol} ON ${tableName}(${indexCol});`;
  }

  // Add RLS
  if (schema.rls_enabled) {
    sql += `\nALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`;
  }

  return sql;
}

function generateComprehensiveFixSQL(
  issues: HealthIssue[],
): Record<string, string[]> {
  const fixSQL: Record<string, string[]> = {
    critical: [],
    warnings: [],
    performance: [],
    cleanup: [],
  };

  for (const issue of issues) {
    if (issue.fix_sql) {
      switch (issue.severity) {
        case "critical":
          fixSQL.critical.push(issue.fix_sql);
          break;
        case "warning":
          fixSQL.warnings.push(issue.fix_sql);
          break;
        default:
          if (issue.category === "Performance") {
            fixSQL.performance.push(issue.fix_sql);
          } else {
            fixSQL.cleanup.push(issue.fix_sql);
          }
      }
    }
  }

  return fixSQL;
}

function calculateHealthScore(issues: HealthIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case "critical":
        score -= 20;
        break;
      case "warning":
        score -= 5;
        break;
      case "info":
        score -= 1;
        break;
    }
  }

  return Math.max(0, score);
}

function generateHealthRecommendations(issues: HealthIssue[]): string[] {
  const recommendations: string[] = [];

  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (critical.length === 0 && warnings.length === 0) {
    recommendations.push("✅ Database health is excellent!");
    return recommendations;
  }

  if (critical.length > 0) {
    recommendations.push(
      `🚨 ${critical.length} critical issues require immediate attention`,
    );
    recommendations.push(
      "❗ Fix critical issues before deploying to production",
    );
  }

  if (warnings.length > 0) {
    recommendations.push(
      `⚠️ ${warnings.length} warnings should be addressed soon`,
    );
  }

  recommendations.push("📝 Use the provided SQL statements to fix issues");
  recommendations.push("🔄 Re-run this check after applying fixes");
  recommendations.push("📊 Monitor database performance regularly");

  return recommendations;
}

function generateNextSteps(
  critical: HealthIssue[],
  warnings: HealthIssue[],
): string[] {
  const steps: string[] = [];

  if (critical.length > 0) {
    steps.push("1. 🚨 Fix all critical issues immediately");
    steps.push("2. 🧪 Test application functionality after fixes");
  }

  if (warnings.length > 0) {
    steps.push(`${critical.length > 0 ? "3" : "1"}. ⚠️ Address warning issues`);
  }

  steps.push(`${steps.length + 1}. 🔄 Re-run health check to verify fixes`);
  steps.push(`${steps.length + 1}. 📈 Set up regular health monitoring`);

  return steps;
}
