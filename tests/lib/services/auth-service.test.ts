import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(authMock: any): SupabaseClient {
  return {
    auth: authMock,
  } as unknown as SupabaseClient;
}

// Mock the entire module
jest.mock("@/lib/supabase/client", () => {
  const mockFn = jest.fn();
  return {
    createClient: mockFn,
    isSupabaseConfigured: true,
    __mockCreateClient: mockFn,
  };
});

describe("Auth Service", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateClient: jest.Mock<any>;

  let authService: typeof import("@/lib/services/auth-service").authService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Get the mock function
    const clientModule = await import("@/lib/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateClient =
      (clientModule as any).__mockCreateClient ||
      (clientModule as any).createClient;

    // Re-import authService to get fresh instance
    const authModule = await import("@/lib/services/auth-service");
    authService = authModule.authService;
  });

  describe("signUp", () => {
    it("should successfully sign up a new user", async () => {
      const mockAuthResponse = {
        data: {
          user: { id: "user-123", email: "test@example.com" },
          session: { access_token: "token-123" },
        },
        error: null,
      };

      const mockAuth = {
        signUp: jest.fn().mockResolvedValue(mockAuthResponse),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      const result = await authService.signUp(
        "test@example.com",
        "password123",
        "Test User",
      );

      expect(mockAuth.signUp).toHaveBeenCalled();
      expect(result).toEqual(mockAuthResponse.data);
    });

    it("should throw error when sign up fails", async () => {
      const mockError = { message: "Email already registered" };
      const mockAuth = {
        signUp: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await expect(
        authService.signUp("test@example.com", "password123"),
      ).rejects.toEqual(mockError);
    });

    it("should throw error when Supabase client fails to initialize", async () => {
      mockCreateClient.mockReturnValue(null);

      await expect(
        authService.signUp("test@example.com", "password123"),
      ).rejects.toThrow("Failed to initialize Supabase client");
    });
  });

  describe("signIn", () => {
    it("should successfully sign in user", async () => {
      const mockAuthResponse = {
        data: {
          user: { id: "user-123", email: "test@example.com" },
          session: {
            access_token: "token-123",
            refresh_token: "refresh-123",
          },
        },
        error: null,
      };

      const mockAuth = {
        signInWithPassword: jest.fn().mockResolvedValue(mockAuthResponse),
        setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      const result = await authService.signIn(
        "test@example.com",
        "password123",
      );

      expect(mockAuth.signInWithPassword).toHaveBeenCalled();
      expect(result).toEqual(mockAuthResponse.data);
    });

    it("should throw error when credentials are invalid", async () => {
      const mockError = { message: "Invalid credentials" };
      const mockAuth = {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await expect(
        authService.signIn("test@example.com", "wrong-password"),
      ).rejects.toEqual(mockError);
    });
  });

  describe("signOut", () => {
    it("should successfully sign out user", async () => {
      const mockAuth = {
        signOut: jest.fn().mockResolvedValue({ error: null }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await authService.signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it("should throw error when sign out fails", async () => {
      const mockError = { message: "Sign out error" };
      const mockAuth = {
        signOut: jest.fn().mockResolvedValue({ error: mockError }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await expect(authService.signOut()).rejects.toEqual(mockError);
    });
  });

  describe("getUser", () => {
    it("should successfully get current user", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      const user = await authService.getUser();

      expect(user).toEqual(mockUser);
    });

    it("should throw error when not authenticated", async () => {
      const mockError = { message: "Not authenticated" };
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: mockError,
        }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await expect(authService.getUser()).rejects.toEqual(mockError);
    });
  });

  describe("resetPassword", () => {
    it("should successfully send password reset email", async () => {
      const mockAuth = {
        resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await authService.resetPassword("test@example.com");

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalled();
    });
  });

  describe("updatePassword", () => {
    it("should successfully update password", async () => {
      const mockAuth = {
        updateUser: jest.fn().mockResolvedValue({ error: null }),
      };

      mockCreateClient.mockReturnValue(createMockSupabase(mockAuth));

      await authService.updatePassword("newPassword123");

      expect(mockAuth.updateUser).toHaveBeenCalled();
    });
  });
});
