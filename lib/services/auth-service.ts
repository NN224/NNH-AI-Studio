import { createClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';

export const authService = {
  async signUp(email: string, password: string, fullName?: string) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/callback`
          : '/auth/callback',
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string, rememberMe?: boolean) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (rememberMe && data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return data;
  },

  async signInWithOAuth(provider: Provider) {
    const supabase = createClient();
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: provider === 'google' ? 'https://www.googleapis.com/auth/business.manage' : undefined,
      },
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const supabase = createClient();
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/reset-password`
      : '/auth/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  /**
   * @deprecated SECURITY WARNING: Using getSession() is insecure!
   * 
   * This method reads session data directly from storage (cookies) without verifying
   * its authenticity with the Supabase Auth server. An attacker could modify cookies
   * to impersonate another user.
   * 
   * Use getUser() instead, which validates the session by contacting the
   * Supabase Auth server and ensures the data is authentic.
   * 
   * @see {@link https://supabase.com/docs/guides/auth/server-side/creating-a-client#creating-a-client}
   */
  async getSession() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;
    // WARNING: This session data comes from cookies and may not be authentic!
    // Do not use this for authentication checks. Use getUser() instead.
    return data.session;
  },

  async getUser() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) throw error;
    return data.user;
  },

  async resendVerificationEmail(email: string) {
    const supabase = createClient();
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) throw error;
  },
};

