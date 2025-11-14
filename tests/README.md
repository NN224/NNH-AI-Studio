# Testing Guide for NNH AI Studio

This guide covers the comprehensive testing suite for the GMB Dashboard platform, ensuring 95%+ code coverage and production readiness.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Testing Best Practices](#testing-best-practices)
6. [CI/CD Integration](#cicd-integration)
7. [Debugging Tests](#debugging-tests)

## Overview

Our testing suite consists of:
- **Unit Tests**: Jest + React Testing Library for components, hooks, and utilities
- **Integration Tests**: API route testing with mocked dependencies
- **E2E Tests**: Playwright for critical user flows
- **Coverage Target**: 95% across all metrics (statements, branches, functions, lines)

## Test Structure

```
tests/
├── unit/                  # Unit tests
│   ├── components/        # React component tests
│   ├── hooks/            # Custom hook tests
│   ├── lib/              # Utility and service tests
│   └── stores/           # State management tests
├── e2e/                  # End-to-end tests
│   ├── auth.spec.ts      # Authentication flows
│   ├── dashboard.spec.ts # Dashboard functionality
│   └── reviews.spec.ts   # Review management
├── setup/                # Test configuration
│   └── test-utils.tsx    # Testing utilities
└── __mocks__/           # Mock files
    ├── styleMock.js     # CSS mock
    └── fileMock.js      # Static file mock
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/components/dashboard/stats-card.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npm run test:e2e:install

# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:headed

# Run specific E2E test
npx playwright test tests/e2e/auth.spec.ts

# Debug E2E tests
npx playwright test --debug
```

### All Tests

```bash
# Run unit tests with coverage + E2E tests
npm run test:all
```

## Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@/tests/setup/test-utils';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/hooks/use-my-hook';

describe('useMyHook', () => {
  it('should update state correctly', () => {
    const { result } = renderHook(() => useMyHook());
    
    expect(result.current.value).toBe(0);
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.value).toBe(1);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test('should complete user journey', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to feature
    await page.click('text=Get Started');
    
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Verify result
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

## Testing Best Practices

### 1. Test Structure
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern: Arrange, Act, Assert
- Group related tests using `describe` blocks
- Keep tests focused and isolated

### 2. Component Testing
- Test user interactions, not implementation details
- Use accessibility queries (`getByRole`, `getByLabelText`)
- Test error states and edge cases
- Mock external dependencies

### 3. Data Mocking
```typescript
// Use factory functions for test data
const mockLocation = createMockLocation({
  location_name: 'Custom Location',
  rating: 4.8
});

// Mock API responses
await page.route('**/api/locations', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ locations: [mockLocation] })
  });
});
```

### 4. Async Testing
```typescript
// Always await async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Use findBy queries for async elements
const element = await screen.findByText('Async Content');
```

### 5. Accessibility Testing
```typescript
import { checkAccessibility } from '@/tests/setup/test-utils';

it('should be accessible', async () => {
  const { container } = render(<MyComponent />);
  await checkAccessibility(container);
});
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation/update
- Pre-merge checks
- Deployment pipeline

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e:install
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Debugging Tests

### Unit Tests
```bash
# Run with Node debugger
node --inspect-brk ./node_modules/.bin/jest --runInBand

# VS Code: Use "Jest: Debug" from command palette
```

### E2E Tests
```bash
# Interactive debugging
npx playwright test --debug

# Pause at specific point
await page.pause();

# View browser
npm run test:e2e:headed

# Trace viewer for failures
npx playwright show-trace trace.zip
```

### Common Issues

1. **Test Timeouts**
   ```typescript
   // Increase timeout for slow operations
   test('slow test', async () => {
     // ...
   }, 30000);
   ```

2. **Flaky Tests**
   - Use `waitFor` instead of fixed delays
   - Mock external dependencies
   - Ensure proper cleanup between tests

3. **Coverage Gaps**
   ```bash
   # View detailed coverage report
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

## Test Data Management

### Environment Variables
```javascript
// Use test-specific env vars in jest.setup.mjs
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
```

### Database Seeding
```typescript
// For integration tests
beforeEach(async () => {
  await seedTestDatabase();
});

afterEach(async () => {
  await cleanupTestDatabase();
});
```

## Performance Testing

Monitor test suite performance:

```bash
# Measure test execution time
time npm test

# Profile slow tests
npm test -- --verbose
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass locally
3. Maintain or increase coverage
4. Update test documentation

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

For questions or issues with tests, please contact the development team or create an issue in the repository.
