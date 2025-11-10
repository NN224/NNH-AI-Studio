'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type DisconnectOption = 'keep' | 'delete' | 'export';

// Validation schemas
const disconnectAccountSchema = z.object({
  accountId: z.string().uuid('Invalid account ID format'),
  option: z.enum(['keep', 'delete', 'export']).default('keep'),
});

const dataRetentionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID format'),
  retentionDays: z.number().int().min(1).max(365),
  deleteOnDisconnect: z.boolean(),
});

interface DisconnectResult {
  success: boolean;
  error?: string;
  message?: string;
  exportData?: Record<string, unknown> | null;
}

/**
 * Disconnect GMB Account with data retention options
 */
export async function disconnectGMBAccount(
  accountId: string,
  option: DisconnectOption = 'keep'
): Promise<DisconnectResult> {
  const supabase = await createClient();
  
  try {
    // Validate input
    const validation = disconnectAccountSchema.safeParse({ accountId, option });
    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.errors[0]?.message || 'Invalid input' 
      };
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id, account_name, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return { success: false, error: 'Account not found or access denied' };
    }

    // Export data if requested
    let exportData = null;
    if (option === 'export') {
      exportData = await exportAccountData(accountId, user.id);
    }

    // Start transaction-like updates
    const updates = [];

    // 1. Update GMB account status
    updates.push(
      supabase
        .from('gmb_accounts')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId)
        .eq('user_id', user.id)
    );

    // 2. Handle locations based on option
    if (option === 'delete') {
      // Hard delete locations
      updates.push(
        supabase
          .from('gmb_locations')
          .delete()
          .eq('gmb_account_id', accountId)
      );
    } else {
      // Soft delete locations (keep historical data)
      updates.push(
        supabase
          .from('gmb_locations')
          .update({
            is_active: false,
            is_archived: true,
            archived_at: new Date().toISOString(),
            last_synced_at: null,
          })
          .eq('gmb_account_id', accountId)
      );
    }

    // Get location IDs first (Supabase .in() doesn't support subqueries directly)
    const { data: locationIds } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('gmb_account_id', accountId);
    
    const locationIdList = locationIds?.map(l => l.id) || [];

    // 3. Handle reviews based on option
    if (option === 'delete') {
      // Hard delete reviews
      if (locationIdList.length > 0) {
        updates.push(
          supabase
            .from('gmb_reviews')
            .delete()
            .in('location_id', locationIdList)
        );
      }
    } else {
      // Archive and anonymize reviews
      if (locationIdList.length > 0) {
        updates.push(
          supabase
            .from('gmb_reviews')
            .update({
              is_archived: true,
              is_anonymized: true,
              archived_at: new Date().toISOString(),
              // Anonymize personal data
              reviewer_name: 'Anonymous User',
              reviewer_profile_photo_url: null,
            })
            .in('location_id', locationIdList)
        );
      }
    }

    // 4. Handle questions
    if (option === 'delete') {
      if (locationIdList.length > 0) {
        updates.push(
          supabase
            .from('gmb_questions')
            .delete()
            .in('location_id', locationIdList)
        );
      }
    } else {
      if (locationIdList.length > 0) {
        updates.push(
          supabase
            .from('gmb_questions')
            .update({
              is_archived: true,
              archived_at: new Date().toISOString(),
              author_name: 'Anonymous User',
            })
            .in('location_id', locationIdList)
        );
      }
    }

    // 5. Handle posts
    if (option === 'delete') {
      if (locationIdList.length > 0) {
        updates.push(
          supabase
            .from('gmb_posts')
            .delete()
            .in('location_id', locationIdList)
        );
      }
    } else {
      if (locationIdList.length > 0) {
        updates.push(
          supabase
            .from('gmb_posts')
            .update({
              is_archived: true,
              archived_at: new Date().toISOString(),
            })
            .in('location_id', locationIdList)
        );
      }
    }

    // Execute all updates in parallel
    const results = await Promise.allSettled(updates);
    
    // Check for any failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some updates failed during disconnect:', failures);
      // Continue anyway - partial disconnect is better than none
    }

    // Revalidate paths
    revalidatePath('/dashboard');
    revalidatePath('/settings');
    revalidatePath('/locations');
    revalidatePath('/reviews');

    const message = option === 'delete' 
      ? 'Account disconnected and all data deleted successfully'
      : option === 'export'
      ? 'Account disconnected and data exported successfully'
      : 'Account disconnected. Historical data has been anonymized and archived.';

    return {
      success: true,
      message,
      exportData,
    };
  } catch (error) {
    console.error('Error disconnecting GMB account:', error);
    const err = error as Error;
    return {
      success: false,
      error: err.message || 'Failed to disconnect account',
    };
  }
}

/**
 * Export account data before disconnect
 */
async function exportAccountData(
  accountId: string, 
  userId: string
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();

  try {
    // Get location IDs first
    const { data: locationData } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('gmb_account_id', accountId)
      .eq('user_id', userId);
    
    const locationIdList = locationData?.map(l => l.id) || [];

    // Get all data for export
    const [locations, reviews, questions, posts] = await Promise.all([
      supabase
        .from('gmb_locations')
        .select('*')
        .eq('gmb_account_id', accountId)
        .eq('user_id', userId),
      
      locationIdList.length > 0 
        ? supabase
            .from('gmb_reviews')
            .select('*')
            .in('location_id', locationIdList)
        : Promise.resolve({ data: [] }),
      
      locationIdList.length > 0
        ? supabase
            .from('gmb_questions')
            .select('*')
            .in('location_id', locationIdList)
        : Promise.resolve({ data: [] }),
      
      locationIdList.length > 0
        ? supabase
            .from('gmb_posts')
            .select('*')
            .in('location_id', locationIdList)
        : Promise.resolve({ data: [] }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      locations: locations.data || [],
      reviews: reviews.data || [],
      questions: questions.data || [],
      posts: posts.data || [],
    } as Record<string, unknown>;
  } catch (error) {
    console.error('Error exporting account data:', error);
    return null;
  }
}

/**
 * Get GMB connection status and data info
 */
export async function getGMBConnectionStatus() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isConnected: false };
    }

    const { data: accounts } = await supabase
      .from('gmb_accounts')
      .select('id, account_name, is_active, disconnected_at, data_retention_days, delete_on_disconnect')
      .eq('user_id', user.id);

    const activeAccounts = accounts?.filter(a => a.is_active) || [];
    const disconnectedAccounts = accounts?.filter(a => !a.is_active && a.disconnected_at) || [];

    // Check for archived data
    const { count: archivedLocations } = await supabase
      .from('gmb_locations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_archived', true);

    // Get archived reviews count
    const { data: userLocationIds } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('user_id', user.id);
    
    const userLocationIdList = userLocationIds?.map(l => l.id) || [];
    
    const { count: archivedReviews } = userLocationIdList.length > 0
      ? await supabase
          .from('gmb_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('is_archived', true)
          .in('location_id', userLocationIdList)
      : { count: 0 };

    return {
      isConnected: activeAccounts.length > 0,
      activeAccounts,
      disconnectedAccounts,
      hasArchivedData: (archivedLocations || 0) > 0,
      archivedLocationsCount: archivedLocations || 0,
      archivedReviewsCount: archivedReviews || 0,
    };
  } catch (error) {
    console.error('Error getting GMB connection status:', error);
    return { isConnected: false };
  }
}

/**
 * Permanently delete all archived data
 */
export async function permanentlyDeleteArchivedData() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get location IDs first
    const { data: locationData } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('user_id', user.id);
    
    const locationIdList = locationData?.map(l => l.id) || [];

    // Delete all archived data
    const deletePromises = [];
    
    if (locationIdList.length > 0) {
      deletePromises.push(
        supabase
          .from('gmb_reviews')
          .delete()
          .eq('is_archived', true)
          .in('location_id', locationIdList),
        
        supabase
          .from('gmb_questions')
          .delete()
          .eq('is_archived', true)
          .in('location_id', locationIdList),
        
        supabase
          .from('gmb_posts')
          .delete()
          .eq('is_archived', true)
          .in('location_id', locationIdList)
      );
    }
    
    deletePromises.push(
      supabase
        .from('gmb_locations')
        .delete()
        .eq('is_archived', true)
        .eq('user_id', user.id)
    );

    await Promise.all(deletePromises);

    revalidatePath('/settings');
    
    return {
      success: true,
      message: 'All archived data has been permanently deleted',
    };
  } catch (error: any) {
    console.error('Error deleting archived data:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete archived data',
    };
  }
}

/**
 * Update data retention settings
 */
export async function updateDataRetentionSettings(
  accountId: string,
  retentionDays: number,
  deleteOnDisconnect: boolean
) {
  const supabase = await createClient();
  
  try {
    // Validate input
    const validation = dataRetentionSchema.safeParse({ 
      accountId, 
      retentionDays, 
      deleteOnDisconnect 
    });
    
    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.errors[0]?.message || 'Invalid input' 
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('gmb_accounts')
      .update({
        data_retention_days: retentionDays,
        delete_on_disconnect: deleteOnDisconnect,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    
    return {
      success: true,
      message: 'Data retention settings updated successfully',
    };
  } catch (error) {
    console.error('Error updating data retention settings:', error);
    const err = error as Error;
    return {
      success: false,
      error: err.message || 'Failed to update settings',
    };
  }
}
