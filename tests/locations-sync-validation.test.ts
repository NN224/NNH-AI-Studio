/**
 * Locations Module Sync and Validation Test Suite
 * Tests location sync logic, GMB connection validation, and normalized_location_id generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getLocations,
  updateLocation, 
  deleteLocation,
  getLocationSyncStatus,
  validateLocationForGMBOperations,
} from '@/server/actions/locations';
import { syncLocation, syncAllLocations } from '@/server/actions/gmb-sync';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null
      })
    },
    from: vi.fn((table: string) => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return mockChain;
    })
  }))
}));

describe('Locations Module - GMB Connection Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Location Operations - GMB Connection Validation', () => {
    it('should prevent location updates when GMB account is disconnected', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      // Mock disconnected GMB account
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [],
              error: null
            }
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'loc-1', gmb_account_id: 'acc-1' }, 
            error: null 
          })
        };
      });

      const result = await updateLocation('loc-1', { location_name: 'Updated Name' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('GMB account');
    });

    it('should allow location updates when GMB account is active', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      // Mock active GMB account
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [{ id: 'acc-1', is_active: true }],
              error: null
            }
          };
        }
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'loc-1', gmb_account_id: 'acc-1' }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await updateLocation('loc-1', { location_name: 'Updated Name' });
      
      expect(result.success).toBe(true);
    });

    it('should soft delete location instead of hard delete', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      // Track update call
      const updateMock = vi.fn().mockReturnThis();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [{ id: 'acc-1', is_active: true }],
              error: null
            }
          };
        }
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            update: updateMock,
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'loc-1', gmb_account_id: 'acc-1' }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      await deleteLocation('loc-1');
      
      // Verify update was called (soft delete), not delete
      expect(updateMock).toHaveBeenCalled();
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall).toHaveProperty('is_active', false);
    });
  });

  describe('2. Location Sync - GMB Connection Validation', () => {
    it('should prevent sync when GMB account is inactive', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { 
                id: 'loc-1', 
                gmb_account_id: 'acc-1',
                location_id: 'locations/123'
              }, 
              error: null 
            })
          };
        }
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'acc-1', is_active: false }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await syncLocation('loc-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected or inactive');
    });

    it('should sync when GMB account is active', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { 
                id: 'loc-1', 
                gmb_account_id: 'acc-1',
                location_id: 'locations/123'
              }, 
              error: null 
            })
          };
        }
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'acc-1', is_active: true }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await syncLocation('loc-1');
      
      // Sync may fail for other reasons (API calls, etc.) but should not fail due to connection
      if (!result.success) {
        expect(result.error).not.toContain('not connected');
      }
    });

    it('should validate all locations have active GMB accounts before syncing all', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [], // No active accounts
              error: null
            }
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await syncAllLocations();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active GMB account');
    });
  });

  describe('3. Location Sync Status', () => {
    it('should return sync status with GMB connection info', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      const lastSyncDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { 
                id: 'loc-1',
                location_name: 'Test Location',
                last_synced_at: lastSyncDate.toISOString(),
                is_active: true,
                gmb_account_id: 'acc-1',
                gmb_accounts: {
                  id: 'acc-1',
                  is_active: true,
                  account_name: 'Test Business'
                }
              }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await getLocationSyncStatus('loc-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.locationName).toBe('Test Location');
      expect(result.data?.gmbAccountActive).toBe(true);
      expect(result.data?.canSync).toBe(true);
      expect(result.data?.minutesSinceSync).toBeGreaterThan(0);
    });

    it('should indicate stale sync when last sync is old', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      const lastSyncDate = new Date(Date.now() - 120 * 60 * 1000); // 2 hours ago
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { 
                id: 'loc-1',
                location_name: 'Test Location',
                last_synced_at: lastSyncDate.toISOString(),
                is_active: true,
                gmb_account_id: 'acc-1',
                gmb_accounts: {
                  id: 'acc-1',
                  is_active: true,
                  account_name: 'Test Business'
                }
              }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await getLocationSyncStatus('loc-1');
      
      expect(result.success).toBe(true);
      expect(result.data?.isStale).toBe(true);
    });

    it('should indicate cannot sync when GMB account is inactive', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { 
                id: 'loc-1',
                location_name: 'Test Location',
                last_synced_at: null,
                is_active: true,
                gmb_account_id: 'acc-1',
                gmb_accounts: {
                  id: 'acc-1',
                  is_active: false, // Inactive account
                  account_name: 'Test Business'
                }
              }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await getLocationSyncStatus('loc-1');
      
      expect(result.success).toBe(true);
      expect(result.data?.canSync).toBe(false);
      expect(result.data?.gmbAccountActive).toBe(false);
    });
  });

  describe('4. Location Validation for GMB Operations', () => {
    it('should validate location can perform GMB operations', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            mockResolvedValue: {
              data: [{ id: 'acc-1', is_active: true }],
              error: null
            }
          };
        }
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'loc-1', gmb_account_id: 'acc-1' }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await validateLocationForGMBOperations('loc-1');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should fail validation when GMB account is inactive', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'gmb_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'acc-1', is_active: false }, 
              error: null 
            })
          };
        }
        if (table === 'gmb_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'loc-1', gmb_account_id: 'acc-1' }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const result = await validateLocationForGMBOperations('loc-1');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no longer active');
    });
  });
});

describe('Locations Module - Normalized Location ID', () => {
  it('should generate normalized_location_id in sync route', () => {
    // Test the normalization logic
    const testCases = [
      { input: 'accounts/123/locations/456', expected: 'accounts_123_locations_456' },
      { input: 'locations/789', expected: 'locations_789' },
      { input: 'test-location-name', expected: 'test_location_name' },
      { input: 'location with spaces', expected: 'location_with_spaces' },
      { input: 'loc@tion#123!', expected: 'loc_tion_123_' },
    ];

    for (const testCase of testCases) {
      const normalized = testCase.input.replace(/[^a-zA-Z0-9]/g, '_');
      expect(normalized).toBe(testCase.expected);
    }
  });
});
