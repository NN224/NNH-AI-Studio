/**
 * Audit Logging Service
 *
 * Tracks critical actions for security and compliance
 */

import { createClient } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/utils/logger'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_DELETE'
  | 'DATA_EXPORT'
  | 'DATA_DELETE'
  | 'PERMISSION_CHANGE'
  | 'API_KEY_CREATE'
  | 'API_KEY_DELETE'
  | 'SETTINGS_CHANGE'
  | 'GMB_CONNECT'
  | 'GMB_DISCONNECT'
  | 'BULK_DELETE'
  | 'ADMIN_ACTION'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface AuditLogEntry {
  user_id?: string
  action: AuditAction
  severity: AuditSeverity
  resource_type?: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current timestamp
    const timestamp = new Date().toISOString()

    // Prepare audit log data
    const auditData = {
      ...entry,
      timestamp,
      details: entry.details ? JSON.stringify(entry.details) : null,
    }

    // Try to insert into audit_logs table
    const { error: dbError } = await supabase.from('audit_logs').insert(auditData)

    if (dbError) {
      // If table doesn't exist, log to console
      apiLogger.warn('Audit log table not found, logging to console', {
        ...auditData,
        dbError: dbError.message,
      })
    }

    // Always log critical events to application logs
    if (entry.severity === 'critical') {
      apiLogger.error('CRITICAL AUDIT EVENT', new Error(entry.action), {
        ...auditData,
      })
    }
  } catch (error) {
    // Don't let audit logging failures break the application
    apiLogger.error(
      'Failed to log audit event',
      error instanceof Error ? error : new Error(String(error)),
      { action: entry.action },
    )
  }
}

/**
 * Log a successful login
 */
export async function auditLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: 'LOGIN',
    severity: 'info',
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  })
}

/**
 * Log a failed login attempt
 */
export async function auditFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string,
): Promise<void> {
  await logAuditEvent({
    action: 'LOGIN_FAILED',
    severity: 'warning',
    details: { email, reason },
    ip_address: ipAddress,
    user_agent: userAgent,
    success: false,
    error_message: reason,
  })
}

/**
 * Log a data deletion
 */
export async function auditDataDeletion(
  userId: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>,
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: 'DATA_DELETE',
    severity: 'warning',
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    success: true,
  })
}

/**
 * Log a bulk operation
 */
export async function auditBulkOperation(
  userId: string,
  operation: string,
  count: number,
  resourceType: string,
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: 'BULK_DELETE',
    severity: 'warning',
    resource_type: resourceType,
    details: { operation, count },
    success: true,
  })
}

/**
 * Log an admin action
 */
export async function auditAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string,
  details?: Record<string, any>,
): Promise<void> {
  await logAuditEvent({
    user_id: adminId,
    action: 'ADMIN_ACTION',
    severity: 'critical',
    resource_type: 'user',
    resource_id: targetUserId,
    details: { ...details, action },
    success: true,
  })
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit: number = 100): Promise<any[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      apiLogger.error('Failed to fetch audit logs', error)
      return []
    }

    return data || []
  } catch (error) {
    apiLogger.error(
      'Error fetching audit logs',
      error instanceof Error ? error : new Error(String(error)),
    )
    return []
  }
}

/**
 * Create audit logs table migration
 */
export const AUDIT_LOGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only system can insert logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
`
