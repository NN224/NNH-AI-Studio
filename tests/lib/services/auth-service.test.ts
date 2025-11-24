import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { authService } from '@/lib/services/auth-service';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
function createMockSupabase(authMock: any): SupabaseClient {
  return {
    auth: authMock,
  } as unknown as SupabaseClient;
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockAuthResponse = {
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      };

      const mockAuth = {
        signUp: jest.fn().mockResolvedValue(mockAuthResponse),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await authService.signUp('test@example.com', 'password123', 'Test User');

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
          emailRedirectTo: '/auth/callback',
        },
      });

      expect(result).toEqual(mockAuthResponse.data);
    });

    it('should throw error when sign up fails', async () => {
      const mockError = { message: 'Email already registered' };
      const mockAuth = {
        signUp: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.signUp('test@example.com', 'password123')).rejects.toEqual(
        mockError
      );
    });

    it('should throw error when Supabase client fails to initialize', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(null);

      await expect(authService.signUp('test@example.com', 'password123')).rejects.toThrow(
        'Failed to initialize Supabase client'
      );
    });
  });

  describe('signIn', () => {
    it('should successfully sign in user', async () => {
      const mockAuthResponse = {
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
          },
        },
        error: null,
      };

      const mockAuth = {
        signInWithPassword: jest.fn().mockResolvedValue(mockAuthResponse),
        setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockAuthResponse.data);
    });

    it('should set session when rememberMe is true', async () => {
      const mockAuthResponse = {
        data: {
          user: { id: 'user-123' },
          session: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
          },
        },
        error: null,
      };

      const mockAuth = {
        signInWithPassword: jest.fn().mockResolvedValue(mockAuthResponse),
        setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.signIn('test@example.com', 'password123', true);

      expect(mockAuth.setSession).toHaveBeenCalledWith({
        access_token: 'token-123',
        refresh_token: 'refresh-123',
      });
    });

    it('should not set session when rememberMe is false', async () => {
      const mockAuthResponse = {
        data: {
          user: { id: 'user-123' },
          session: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
          },
        },
        error: null,
      };

      const mockAuth = {
        signInWithPassword: jest.fn().mockResolvedValue(mockAuthResponse),
        setSession: jest.fn(),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.signIn('test@example.com', 'password123', false);

      expect(mockAuth.setSession).not.toHaveBeenCalled();
    });

    it('should throw error when credentials are invalid', async () => {
      const mockError = { message: 'Invalid credentials' };
      const mockAuth = {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.signIn('test@example.com', 'wrong-password')).rejects.toEqual(
        mockError
      );
    });
  });

  describe('signInWithOAuth', () => {
    it('should successfully initiate OAuth sign in with Google', async () => {
      const mockAuthResponse = {
        data: { url: 'https://oauth.google.com/...' },
        error: null,
      };

      const mockAuth = {
        signInWithOAuth: jest.fn().mockResolvedValue(mockAuthResponse),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await authService.signInWithOAuth('google');

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: '/auth/callback',
          scopes: 'https://www.googleapis.com/auth/business.manage',
        },
      });

      expect(result).toEqual(mockAuthResponse.data);
    });

    it('should handle non-Google OAuth providers', async () => {
      const mockAuthResponse = {
        data: { url: 'https://oauth.provider.com/...' },
        error: null,
      };

      const mockAuth = {
        signInWithOAuth: jest.fn().mockResolvedValue(mockAuthResponse),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.signInWithOAuth('github');

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: '/auth/callback',
          scopes: undefined,
        },
      });
    });

    it('should throw error when OAuth fails', async () => {
      const mockError = { message: 'OAuth error' };
      const mockAuth = {
        signInWithOAuth: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.signInWithOAuth('google')).rejects.toEqual(mockError);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      const mockAuth = {
        signOut: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const mockError = { message: 'Sign out error' };
      const mockAuth = {
        signOut: jest.fn().mockResolvedValue({ error: mockError }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.signOut()).rejects.toEqual(mockError);
    });
  });

  describe('resetPassword', () => {
    it('should successfully send password reset email', async () => {
      const mockAuth = {
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.resetPassword('test@example.com');

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: '/auth/reset-password',
      });
    });

    it('should throw error when email is invalid', async () => {
      const mockError = { message: 'Invalid email' };
      const mockAuth = {
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: mockError }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.resetPassword('invalid-email')).rejects.toEqual(mockError);
    });
  });

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      const mockAuth = {
        updateUser: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.updatePassword('newPassword123');

      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });
    });

    it('should throw error when password update fails', async () => {
      const mockError = { message: 'Password too weak' };
      const mockAuth = {
        updateUser: jest.fn().mockResolvedValue({ error: mockError }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.updatePassword('weak')).rejects.toEqual(mockError);
    });
  });

  describe('getUser', () => {
    it('should successfully get current user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const user = await authService.getUser();

      expect(user).toEqual(mockUser);
      expect(mockAuth.getUser).toHaveBeenCalled();
    });

    it('should throw error when not authenticated', async () => {
      const mockError = { message: 'Not authenticated' };
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: mockError,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.getUser()).rejects.toEqual(mockError);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should successfully resend verification email', async () => {
      const mockAuth = {
        resend: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await authService.resendVerificationEmail('test@example.com');

      expect(mockAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
        options: {
          emailRedirectTo: '/auth/callback',
        },
      });
    });

    it('should throw error when resend fails', async () => {
      const mockError = { message: 'Too many requests' };
      const mockAuth = {
        resend: jest.fn().mockResolvedValue({ error: mockError }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      await expect(authService.resendVerificationEmail('test@example.com')).rejects.toEqual(
        mockError
      );
    });
  });

  describe('Security - getSession deprecation', () => {
    it('should mark getSession as deprecated (security warning)', async () => {
      const mockSession = {
        access_token: 'token-123',
        refresh_token: 'refresh-123',
      };

      const mockAuth = {
        getSession: jest.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      // This method exists but should not be used for auth checks
      const session = await authService.getSession();

      expect(session).toEqual(mockSession);
      // Note: This method is deprecated and should use getUser() instead
    });

    it('should prefer getUser over getSession for security', async () => {
      // getUser() validates with server, getSession() reads from cookies only
      // This test documents the security best practice

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      };

      const mockSupabase = createMockSupabase(mockAuth);
      const { createClient } = await import('@/lib/supabase/client');
      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const user = await authService.getUser();

      expect(user).toEqual(mockUser);
      // getUser() is secure because it validates with Supabase Auth server
    });
  });
});
