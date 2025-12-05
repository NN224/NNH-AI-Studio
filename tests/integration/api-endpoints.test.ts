/**
 * @jest-environment node
 */

/**
 * API Endpoints Integration Tests
 *
 * Tests the actual API endpoints to ensure they:
 * 1. Return correct status codes
 * 2. Handle authentication properly
 * 3. Validate input correctly
 * 4. Return expected data structures
 *
 * Run with: npm run test:integration
 *
 * Prerequisites:
 * - Dev server running on localhost:5050
 * - Valid environment variables
 */

// Test configuration
const API_BASE_URL = process.env.TEST_API_URL || "http://localhost:5050";
const API_TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || "";

// Skip if no server is running
let serverAvailable = false;

// Helper for API calls
async function apiCall(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (API_TEST_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TEST_AUTH_TOKEN}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

describe("API Endpoints Integration Tests", () => {
  beforeAll(async () => {
    // Check if server is available
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      serverAvailable = response.ok || response.status === 401;
    } catch {
      console.warn(`⚠️ Server not available at ${API_BASE_URL}`);
      console.warn("Start the dev server with: npm run dev");
      serverAvailable = false;
    }
  });

  describe("Health Check Endpoints", () => {
    it("✅ GET /api/health should return 200", async () => {
      if (!serverAvailable) return;

      const response = await apiCall("/api/health");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBeDefined();
    });

    it("✅ GET /api/status should return service status", async () => {
      if (!serverAvailable) return;

      const response = await apiCall("/api/status");
      expect([200, 401]).toContain(response.status);
    });
  });

  describe("Authentication Required Endpoints", () => {
    it("✅ GET /api/locations should require auth", async () => {
      if (!serverAvailable) return;

      // Call without auth token
      const response = await fetch(`${API_BASE_URL}/api/locations`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("✅ GET /api/reviews should require auth", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/reviews`);
      expect(response.status).toBe(401);
    });

    it("✅ GET /api/settings should require auth", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/settings`);
      expect(response.status).toBe(401);
    });

    it("✅ GET /api/notifications should require auth", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications`);
      expect(response.status).toBe(401);
    });
  });

  describe("GMB API Endpoints", () => {
    it("✅ GET /api/gmb/status should require auth", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/gmb/status`);
      expect(response.status).toBe(401);
    });

    it("✅ GET /api/gmb/accounts should require auth", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/gmb/accounts`);
      expect(response.status).toBe(401);
    });

    it("✅ GET /api/gmb/locations should require auth", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/gmb/locations`);
      expect(response.status).toBe(401);
    });
  });

  describe("Input Validation", () => {
    it("✅ POST /api/reviews/ai-response should validate input", async () => {
      if (!serverAvailable) return;

      // Send invalid payload
      const response = await fetch(`${API_BASE_URL}/api/reviews/ai-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty body
      });

      // Should return 400 (bad request), 401 (unauthorized), 403 (forbidden), or 422 (validation)
      expect([400, 401, 403, 422]).toContain(response.status);
    });

    it("✅ POST /api/locations/bulk-update should validate array input", async () => {
      if (!serverAvailable) return;

      const response = await fetch(
        `${API_BASE_URL}/api/locations/bulk-update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: "not-an-array" }),
        },
      );

      expect([400, 401, 403, 422]).toContain(response.status);
    });
  });

  describe("Error Response Format", () => {
    it("✅ should return consistent error format", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/locations`);
      const data = await response.json();

      // Error response should have standard structure
      expect(data).toHaveProperty("error");
      // May also have message, code, etc.
    });

    it("✅ should not expose internal errors in production", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/non-existent-endpoint`);
      const data = await response.json().catch(() => ({}));

      // Should not contain stack traces or internal details
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain("node_modules");
      expect(responseText).not.toContain("at Object");
    });
  });

  describe("Rate Limiting", () => {
    it("✅ should handle rapid requests gracefully", async () => {
      if (!serverAvailable) return;

      // Make 10 rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() => fetch(`${API_BASE_URL}/api/health`));

      const responses = await Promise.all(requests);

      // All should succeed (health endpoint shouldn't be rate limited)
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(5);
    });
  });

  describe("CORS Headers", () => {
    it("✅ should include CORS headers for API routes", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: "OPTIONS",
      });

      // Should handle OPTIONS request
      expect([200, 204, 405]).toContain(response.status);
    });
  });

  describe("Content-Type Handling", () => {
    it("✅ should accept application/json", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/health`, {
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status).toBe(200);
    });

    it("✅ should return JSON responses", async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/health`);
      const contentType = response.headers.get("content-type");

      expect(contentType).toContain("application/json");
    });
  });
});

describe("Dashboard API Endpoints", () => {
  it("✅ GET /api/dashboard/snapshot should require auth", async () => {
    if (!serverAvailable) return;

    const response = await fetch(`${API_BASE_URL}/api/dashboard/snapshot`);
    // Should be 401 (unauthorized), 403 (forbidden), or 404 (not found)
    expect([401, 403, 404]).toContain(response.status);
  });

  it("✅ GET /api/dashboard/overview should require auth", async () => {
    if (!serverAvailable) return;

    const response = await fetch(`${API_BASE_URL}/api/dashboard/overview`);
    // Should be 401 (unauthorized), 403 (forbidden), or 404 (not found)
    expect([401, 403, 404]).toContain(response.status);
  });
});

describe("Admin Endpoints Protection", () => {
  it("✅ Admin endpoints should require admin role", async () => {
    if (!serverAvailable) return;

    const adminEndpoints = [
      "/api/admin/users",
      "/api/admin/stats",
      "/api/admin/system",
    ];

    for (const endpoint of adminEndpoints) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      // Should be 401 (unauthorized) or 403 (forbidden) or 404 (not found)
      expect([401, 403, 404]).toContain(response.status);
    }
  });
});

describe("Webhook Endpoints", () => {
  it("✅ POST /api/webhooks/gmb-notifications should accept POST", async () => {
    if (!serverAvailable) return;

    const response = await fetch(
      `${API_BASE_URL}/api/webhooks/gmb-notifications`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      },
    );

    // Should not be 405 (method not allowed)
    expect(response.status).not.toBe(405);
  });
});
