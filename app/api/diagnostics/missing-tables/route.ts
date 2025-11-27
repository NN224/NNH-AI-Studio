import { requireAdmin } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/server";

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
      "oauth_states", // This is the missing one
      "notifications",
      "user_settings",
    ];

    const tableStatus: Record<string, any> = {};
    const missingTables: string[] = [];
    const workingTables: string[] = [];

    // Check each table
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await adminClient
          .from(tableName)
          .select("*")
          .limit(1);

        if (error) {
          tableStatus[tableName] = {
            exists: false,
            error: error.message,
            code: error.code,
            hint: error.hint,
          };
          missingTables.push(tableName);
        } else {
          tableStatus[tableName] = {
            exists: true,
            sample_count: data?.length || 0,
          };
          workingTables.push(tableName);
        }
      } catch (err) {
        tableStatus[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
        missingTables.push(tableName);
      }
    }

    // Generate SQL for missing tables
    const createTableSQL = generateCreateTableSQL(missingTables);

    return Response.json({
      success: true,
      summary: {
        total_tables: requiredTables.length,
        working_tables: workingTables.length,
        missing_tables: missingTables.length,
      },
      working_tables: workingTables,
      missing_tables: missingTables,
      table_details: tableStatus,
      create_sql: createTableSQL,
      recommendations: generateRecommendations(missingTables),
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

function generateRecommendations(missingTables: string[]): string[] {
  const recommendations: string[] = [];

  if (missingTables.length === 0) {
    recommendations.push("✅ All required tables exist!");
    return recommendations;
  }

  recommendations.push(`❌ Found ${missingTables.length} missing tables`);

  if (missingTables.includes("oauth_states")) {
    recommendations.push(
      "🔧 oauth_states table is critical for OAuth flow - this is why GMB connection button doesn't work",
    );
  }

  if (missingTables.includes("notifications")) {
    recommendations.push(
      "⚠️ notifications table missing - user notifications won't work",
    );
  }

  if (missingTables.includes("user_settings")) {
    recommendations.push(
      "⚠️ user_settings table missing - user preferences won't be saved",
    );
  }

  recommendations.push(
    "📝 Use the provided SQL statements to create missing tables",
  );
  recommendations.push("🔄 After creating tables, restart the application");

  return recommendations;
}
