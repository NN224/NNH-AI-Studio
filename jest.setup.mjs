/* eslint-disable no-undef, @typescript-eslint/no-require-imports */
// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Set up text encoder/decoder for tests
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.GOOGLE_MAPS_API_KEY = "test-google-maps-key";
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-google-maps-key";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  useParams() {
    return {};
  },
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
  useLocale: () => "en",
  useFormatter: () => ({
    dateTime: (date, _options) => date.toISOString(),
    number: (number) => number.toString(),
  }),
}));

// Mock Supabase
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  }),
  createServerComponentClient: () => ({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => {
      const { createElement } = require("react");
      return createElement("div", props, children);
    },
    span: ({ children, ...props }) => {
      const { createElement } = require("react");
      return createElement("span", props, children);
    },
    button: ({ children, ...props }) => {
      const { createElement } = require("react");
      return createElement("button", props, children);
    },
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress React rendering warnings
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Warning: React.createFactory"))
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
