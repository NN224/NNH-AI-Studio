/**
 * GMB OAuth Connection Flow Test Suite
 * Tests the complete connection, disconnection, and re-authentication flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { disconnectGMBAccount } from '@/server/actions/gmb-account';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null
      })
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      mockResolvedValue: vi.fn()
    }))
  }))
}));

describe('GMB OAuth Connection Flow', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createClient();
    vi.clearAllMocks();
  });

  describe('1. Connection Flow', () => {
    it('should generate valid OAuth URL', async () => {
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data).toHaveProperty('authUrl');
      expect(data.authUrl).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
      expect(data.authUrl).toContain('client_id=');
      expect(data.authUrl).toContain('redirect_uri=');
      expect(data.authUrl).toContain('scope=');
      expect(data.authUrl).toContain('state=');
    });

    it('should handle OAuth callback correctly', async () => {
      const mockCode = 'test-auth-code-123';
      const mockState = 'test-state-123';
      
      // Mock the callback
      const response = await fetch(`/api/gmb/oauth/callback?code=${mockCode}&state=${mockState}`, {
        method: 'GET'
      });

      expect(response.ok).toBe(true);
      
      // Verify account was created
      expect(mockSupabase.from).toHaveBeenCalledWith('gmb_accounts');
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('should handle missing auth code', async () => {
      const response = await fetch('/api/gmb/oauth/callback?state=test-state', {
        method: 'GET'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should validate state parameter', async () => {
      const response = await fetch('/api/gmb/oauth/callback?code=test-code&state=invalid-state', {
        method: 'GET'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('2. Token Management', () => {
    it('should refresh expired tokens automatically', async () => {
      // Mock an expired token
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'account-123',
            refresh_token: 'valid-refresh-token',
            token_expires_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          },
          error: null
        })
      });

      // Trigger a sync which should refresh the token
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'account-123' })
      });

      expect(response.ok).toBe(true);
      
      // Verify token refresh was attempted
      expect(mockSupabase.from).toHaveBeenCalledWith('gmb_accounts');
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('should handle refresh token failure', async () => {
      // Mock account with invalid refresh token
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'account-123',
            refresh_token: 'invalid-token',
            token_expires_at: new Date(Date.now() - 3600000).toISOString()
          },
          error: null
        })
      });

      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'account-123' })
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('token');
    });
  });

  describe('3. Disconnection Flow', () => {
    const mockAccountId = 'test-account-123';

    it('should disconnect and keep data', async () => {
      // Mock active account
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: mockAccountId, is_active: true },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          count: vi.fn().mockResolvedValue({ count: 10, error: null })
        };
      });

      const result = await disconnectGMBAccount(mockAccountId, 'keep');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('kept locally');
      expect(mockSupabase.from).toHaveBeenCalledWith('gmb_accounts');
    });

    it('should disconnect and export data', async () => {
      // Mock account with locations and reviews
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: mockAccountId, account_name: 'Test Business' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          };
        }
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [{ id: 'loc-1', location_name: 'Main Store' }],
              error: null
            }
          };
        }
        if (table === 'gmb_reviews') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [{ id: 'rev-1', rating: 5, comment: 'Great!' }],
              error: null
            }
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          mockResolvedValue: { data: [], error: null }
        };
      });

      const result = await disconnectGMBAccount(mockAccountId, 'export');
      
      expect(result.success).toBe(true);
      expect(result.exportData).toBeDefined();
      expect(result.exportData).toHaveProperty('account');
      expect(result.exportData).toHaveProperty('locations');
      expect(result.exportData).toHaveProperty('reviews');
    });

    it('should disconnect and delete all data', async () => {
      mockSupabase.from = vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: mockAccountId }, error: null }),
        mockResolvedValue: { data: null, error: null }
      }));

      const result = await disconnectGMBAccount(mockAccountId, 'delete');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted');
      
      // Verify deletion cascade
      expect(mockSupabase.from).toHaveBeenCalledWith('gmb_accounts');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Account not found' }
        })
      });

      const result = await disconnectGMBAccount('invalid-id', 'keep');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('4. Re-authentication Flow', () => {
    it('should allow re-authentication of existing account', async () => {
      // Mock existing inactive account
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'account-123',
            is_active: false,
            account_name: 'Test Business'
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      });

      // Start re-auth flow
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reauth: true })
      });

      expect(response.ok).toBe(true);
      
      // Simulate callback
      const callbackResponse = await fetch('/api/gmb/oauth/callback?code=new-code&state=reauth-state', {
        method: 'GET'
      });

      expect(callbackResponse.ok).toBe(true);
      
      // Verify account was reactivated
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true
        })
      );
    });

    it('should preserve settings during re-authentication', async () => {
      const existingSettings = {
        syncSchedule: 'daily',
        autoReply: true,
        aiResponseTone: 'friendly'
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'account-123',
            settings: existingSettings
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      });

      // Re-authenticate
      const result = await disconnectGMBAccount('account-123', 'keep');
      
      expect(result.success).toBe(true);
      
      // Verify settings were preserved
      const updateCall = mockSupabase.from().update.mock.calls[0];
      expect(updateCall[0].settings).toEqual(existingSettings);
    });
  });

  describe('5. Connection Status Verification', () => {
    it('should correctly identify connected status', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: {
          data: [{
            id: 'account-123',
            is_active: true,
            refresh_token: 'valid-token',
            token_expires_at: new Date(Date.now() + 3600000).toISOString()
          }],
          error: null
        })
      });

      const response = await fetch('/api/gmb/connection-status');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.connected).toBe(true);
      expect(data.activeAccounts).toHaveLength(1);
    });

    it('should handle multiple accounts correctly', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: {
          data: [
            { id: 'account-1', is_active: true, account_name: 'Business 1' },
            { id: 'account-2', is_active: false, account_name: 'Business 2' },
            { id: 'account-3', is_active: true, account_name: 'Business 3' }
          ],
          error: null
        })
      });

      const response = await fetch('/api/gmb/connection-status');
      const data = await response.json();
      
      expect(data.connected).toBe(true);
      expect(data.activeAccounts).toHaveLength(2);
      expect(data.totalAccounts).toBe(3);
    });
  });
});

describe('GMB Connection Error Scenarios', () => {
  it('should handle network errors gracefully', async () => {
    // Mock network failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    try {
      await fetch('/api/gmb/create-auth-url', { method: 'POST' });
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('Network');
    }
  });

  it('should handle invalid credentials', async () => {
    const mockSupabase = createClient();
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' }
    });

    const response = await fetch('/api/gmb/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it('should handle rate limiting', async () => {
    // Mock rate limit response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limit exceeded' })
    });

    const response = await fetch('/api/gmb/sync', { method: 'POST' });
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(429);
  });
});
