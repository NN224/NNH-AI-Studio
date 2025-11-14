import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';

// Import messages
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';

const messages = {
  en: enMessages,
  ar: arMessages,
};

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  locale?: 'en' | 'ar';
  theme?: 'light' | 'dark' | 'system';
}

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const AllTheProviders: React.FC<{ 
  children: React.ReactNode;
  locale?: 'en' | 'ar';
  theme?: 'light' | 'dark' | 'system';
}> = ({ 
  children, 
  locale = 'en',
  theme = 'light'
}) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <IntlProvider messages={messages[locale]} locale={locale}>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  {
    locale = 'en',
    theme = 'light',
    ...options
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders locale={locale} theme={theme}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to wait for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Mock router helper
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  locale: 'en',
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  isReady: true,
  isPreview: false,
};

// Mock Supabase client helper
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
};

// Mock API response helpers
export const createMockResponse = <T>(data: T, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

// Common test data factories
export const createMockLocation = (overrides = {}) => ({
  id: '1',
  location_name: 'Test Location',
  address: '123 Test St, Test City, TC 12345',
  phone: '+1234567890',
  website: 'https://test.com',
  business_status: 'OPERATIONAL',
  rating: 4.5,
  total_reviews: 100,
  place_id: 'test-place-id',
  ...overrides,
});

export const createMockReview = (overrides = {}) => ({
  id: '1',
  reviewer_name: 'Test Reviewer',
  rating: 5,
  review_text: 'Great service!',
  created_at: new Date().toISOString(),
  responded: false,
  location_id: '1',
  ...overrides,
});

export const createMockQuestion = (overrides = {}) => ({
  id: '1',
  author_name: 'Test Author',
  question_text: 'What are your hours?',
  created_at: new Date().toISOString(),
  answered: false,
  location_id: '1',
  ...overrides,
});

// Accessibility helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe, toHaveNoViolations } = await import('jest-axe');
  expect.extend(toHaveNoViolations);
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};
