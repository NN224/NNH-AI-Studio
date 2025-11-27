import { requireAdmin } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/server";

// Expected schema for each table (columns that the code expects)
const EXPECTED_SCHEMA: Record<string, string[]> = {
  gmb_accounts: [
    "id",
    "user_id",
    "account_id",
    "account_name",
    "email",
    "access_token",
    "refresh_token",
    "token_expires_at",
    "is_active",
    "last_sync",
    "updated_at",
    "created_at",
  ],
  gmb_locations: [
    "id",
    "gmb_account_id",
    "user_id",
    "location_name",
    "location_id",
    "address",
    "phone",
    "website",
    "categories",
    "is_active",
    "metadata",
    "updated_at",
    "created_at",
  ],
  sync_queue: [
    "id",
    "user_id",
    "gmb_account_id",
    "sync_type",
    "priority",
    "status",
    "attempts",
    "created_at",
    "updated_at",
  ],
  oauth_states: [
    "id",
    "state",
    "user_id",
    "provider",
    "expires_at",
    "used",
    "created_at",
  ],
  profiles: ["id", "email", "full_name", "avatar_url", "updated_at"],
};

export async function GET() {
  try {
    // Check admin access first
    const adminCheck = await requireAdmin();
    if (adminCheck) {
      return adminCheck;
    }

    const adminClient = createAdminClient();

    // List of required tables for GMB functionality
    const requiredTables = [
      "profiles",
      "gmb_accounts",
      "gmb_locations",
      "gmb_reviews",
      "gmb_media",
      "gmb_questions",
      "gmb_performance_metrics",
      "gmb_services",
      "sync_queue",
      "gmb_sync_logs",
      "oauth_states",
      "notifications",
      "user_settings",
    ];

    const tableStatus: Record<string, TableStatus> = {};
    const missingTables: string[] = [];
    const workingTables: string[] = [];
    const columnIssues: ColumnIssue[] = [];

    // Check each table
    for (const tableName of requiredTables) {
      try {
        // Try to select with expected columns to detect missing columns
        const expectedColumns = EXPECTED_SCHEMA[tableName];

        if (expectedColumns) {
          // Test each column individually
          const missingColumns: string[] = [];
          const workingColumns: string[] = [];

          for (const column of expectedColumns) {
            const { error } = await adminClient
              .from(tableName)
              .select(column)
              .limit(1);

            if (error && error.message.includes(column)) {
              missingColumns.push(column);
              columnIssues.push({
                table: tableName,
                column: column,
                error: error.message,
              });
            } else if (!error) {
              workingColumns.push(column);
            }
          }

          tableStatus[tableName] = {
            exists: true,
            working_columns: workingColumns,
            missing_columns: missingColumns,
            column_issues: missingColumns.length > 0,
          };

          if (missingColumns.length === 0) {
            workingTables.push(tableName);
          }
        } else {
          // No schema defined, just check if table exists
          const { data, error } = await adminClient
            .from(tableName)
            .select("*")
            .limit(1);

          if (error) {
            tableStatus[tableName] = {
              exists: false,
              error: error.message,
              code: error.code,
            };
            missingTables.push(tableName);
          } else {
            tableStatus[tableName] = {
              exists: true,
              sample_count: data?.length || 0,
            };
            workingTables.push(tableName);
          }
        }
      } catch (err) {
        tableStatus[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
        missingTables.push(tableName);
      }
    }

    // Generate SQL for missing tables and columns
    const tableSQL = generateCreateTableSQL(missingTables);
    const columnSQL = generateColumnFixSQL(columnIssues);

    return Response.json({
      success: columnIssues.length === 0 && missingTables.length === 0,
      summary: {
        total_tables: requiredTables.length,
        working_tables: workingTables.length,
        missing_tables: missingTables.length,
        column_issues: columnIssues.length,
      },
      working_tables: workingTables,
      missing_tables: missingTables,
      column_issues: columnIssues,
      table_details: tableStatus,
      fix_sql: {
        tables: tableSQL,
        columns: columnSQL,
      },
      recommendations: generateRecommendations(missingTables, columnIssues),
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

interface TableStatus {
  exists: boolean;
  working_columns?: string[];
  missing_columns?: string[];
  column_issues?: boolean;
  sample_count?: number;
  error?: string;
  code?: string;
}

interface ColumnIssue {
  table: string;
  column: string;
  error: string;
}

function generateCreateTableSQL(
  missingTables: string[],
): Record<string, string> {
  const sqlStatements: Record<string, string> = {};

  if (missingTables.includes("oauth_states")) {
    sqlStatements["oauth_states"] = `
CREATE TABLE oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own states
CREATE POLICY "Users can manage their own oauth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);
`;
  }

  if (missingTables.includes("notifications")) {
    sqlStatements["notifications"] = `
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);
`;
  }

  if (missingTables.includes("user_settings")) {
    sqlStatements["user_settings"] = `
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
`;
  }

  return sqlStatements;
}

function generateColumnFixSQL(
  columnIssues: ColumnIssue[],
): Record<string, string> {
  const sqlStatements: Record<string, string> = {};

  for (const issue of columnIssues) {
    const key = `${issue.table}.${issue.column}`;

    // Generate ALTER TABLE statement based on column name
    let columnDef = "TEXT";
    if (issue.column.includes("_id")) columnDef = "UUID";
    if (issue.column.includes("_at")) columnDef = "TIMESTAMPTZ DEFAULT NOW()";
    if (issue.column === "is_active") columnDef = "BOOLEAN DEFAULT TRUE";
    if (issue.column === "priority") columnDef = "INTEGER DEFAULT 5";
    if (issue.column === "attempts") columnDef = "INTEGER DEFAULT 0";
    if (issue.column === "status") columnDef = "VARCHAR(50) DEFAULT 'pending'";
    if (issue.column === "sync_type") columnDef = "VARCHAR(50) DEFAULT 'full'";
    if (issue.column === "categories" || issue.column === "metadata")
      columnDef = "JSONB DEFAULT '{}'";
    if (issue.column === "used") columnDef = "BOOLEAN DEFAULT FALSE";

    sqlStatements[key] =
      `ALTER TABLE ${issue.table} ADD COLUMN IF NOT EXISTS ${issue.column} ${columnDef};`;
  }

  return sqlStatements;
}

function generateRecommendations(
  missingTables: string[],
  columnIssues: ColumnIssue[],
): string[] {
  const recommendations: string[] = [];

  if (missingTables.length === 0 && columnIssues.length === 0) {
    recommendations.push("✅ All required tables and columns exist!");
    return recommendations;
  }

  if (missingTables.length > 0) {
    recommendations.push(`❌ Found ${missingTables.length} missing tables`);
  }

  if (columnIssues.length > 0) {
    recommendations.push(`❌ Found ${columnIssues.length} missing columns`);

    // Group by table
    const byTable: Record<string, string[]> = {};
    for (const issue of columnIssues) {
      if (!byTable[issue.table]) byTable[issue.table] = [];
      byTable[issue.table].push(issue.column);
    }

    for (const [table, columns] of Object.entries(byTable)) {
      recommendations.push(`  🔧 ${table}: missing ${columns.join(", ")}`);
    }
  }

  if (missingTables.includes("oauth_states")) {
    recommendations.push("🔧 oauth_states table is critical for OAuth flow");
  }

  recommendations.push("📝 Use the provided SQL statements to fix issues");
  recommendations.push("🔄 After running SQL, restart the application");

  return recommendations;
}
