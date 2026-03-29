# Frontend Tests

This directory contains comprehensive unit and integration tests for the SDN Tech frontend application.

## Test Structure

```
src/tests/
├── setup.ts                          # Global test configuration
├── stores/
│   ├── auth-store.test.ts           # Authentication store tests
│   ├── onboarding-store.test.ts     # Supplier onboarding store tests
│   ├── notification-store.test.ts   # Notification store tests
│   └── supplier-erp-store.test.ts   # Supplier governance store tests
└── components/                       # Component tests (to be added)
    ├── auth/
    ├── supplier/
    └── buyer/
```

## Test Files

### Store Tests

#### `auth-store.test.ts`
Tests for the authentication Zustand store:
- User login and logout
- Session management
- Profile switching (suppliers with multiple memberships)
- Buyer management (CRUD operations)
- Token storage

#### `onboarding-store.test.ts`
Tests for the supplier onboarding store:
- Section navigation
- Section completion tracking
- Company details management
- Tax and bank details
- Document status tracking
- Message management

#### `notification-store.test.ts`
Tests for the notification store:
- Unread count management
- Batch operations
- Count decrement (with floor at zero)

#### `supplier-erp-store.test.ts`
Comprehensive tests for the supplier governance store:
- **Milestone 3: Risk & Compliance**
  - Risk level assessment
  - Compliance document management
  - Auto-expiry status refresh
- **Milestone 4: Relationships**
  - Buyer-supplier relationship tracking
  - Status updates
  - Active relationship filtering
- **Milestone 5: Contract & ERP**
  - Contract readiness validation
  - Contract association
  - ERP readiness checks
  - ERP sync and failure handling
  - Supplier offboarding
- **Helper Functions**
  - Compliance status computation
  - Tax ID validation (UAE, India, Singapore, US)
  - Duplicate detection
  - Change classification (MINOR/MAJOR)
  - ERP readiness validation

## Running Tests

### Prerequisites

Install test dependencies:
```bash
cd frontend
npm install
```

### Run All Tests

```bash
# Run all tests
npm test

# Run with UI
npm test -- --ui

# Run in watch mode
npm test -- --watch

# Run tests once
npm test -- --run

# Run with coverage
npm test -- --coverage
```

### Run Specific Test Files

```bash
# Run auth store tests
npm test -- auth-store.test.ts

# Run onboarding store tests
npm test -- onboarding-store.test.ts

# Run notification store tests
npm test -- notification-store.test.ts

# Run supplier ERP store tests
npm test -- supplier-erp-store.test.ts

# Run all store tests
npm test -- stores/
```

### Filter Tests by Name

```bash
# Run tests matching a pattern
npm test -- --grep "login"

# Run tests in a specific describe block
npm test -- --grep "Risk & Compliance"
```

## Test Configuration

### `vitest.config.ts`

```typescript
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',           // Browser-like environment
        globals: true,                   // Use global describe/it/expect
        setupFiles: ['./src/tests/setup.ts'],
        include: ['src/tests/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/app/**', 'src/tests/**', 'src/components/ui/**'],
        },
    },
});
```

### `src/tests/setup.ts`

Global test setup includes:
- **Next.js router mocking** - Mocks useRouter, usePathname, useSearchParams
- **localStorage mocking** - In-memory storage for tests
- **cookie mocking** - Mock document.cookie for auth token tests
- **Jest DOM matchers** - Extends Vitest with DOM assertions

## Writing Tests

### Store Test Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useYourStore } from '@/lib/store/your-store';

const resetStore = () => {
    useYourStore.setState({ /* initial state */ });
};

describe('Your Store', () => {
    beforeEach(() => resetStore());

    describe('feature', () => {
        it('should do something correctly', () => {
            act(() => useYourStore.getState().someAction());
            expect(useYourStore.getState().value).toBe(expected);
        });
    });
});
```

### Component Test Pattern

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { YourComponent } from '@/components/YourComponent';

describe('YourComponent', () => {
    it('renders correctly', () => {
        render(<YourComponent />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('handles user interaction', async () => {
        render(<YourComponent />);
        const button = screen.getByRole('button');
        await userEvent.click(button);
        expect(screen.getByText('Clicked')).toBeInTheDocument();
    });
});
```

### Async Test Pattern

```typescript
it('handles async operations', async () => {
    const promise = Promise.resolve({ data: 'test' });
    // Act
    await act(async () => {
        await useYourStore.getState().asyncAction();
    });
    // Assert
    expect(useYourStore.getState().data).toBe('test');
});
```

## Test Coverage

### Current Coverage

| Store/Component | Tests | Status |
|-----------------|-------|--------|
| Auth Store | 15 tests | ✅ Complete |
| Onboarding Store | 12 tests | ✅ Complete |
| Notification Store | 6 tests | ✅ Complete |
| Supplier ERP Store | 35+ tests | ✅ Complete |
| **Total** | **68+ tests** | **✅ Comprehensive** |

### Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### View Coverage Report

```bash
npm test -- --coverage

# Open HTML report
open coverage/index.html
```

## Test Scenarios Covered

### Happy Path Tests
- ✅ Successful login/logout
- ✅ Profile switching
- ✅ Section completion tracking
- ✅ Document status updates
- ✅ Contract readiness validation
- ✅ ERP sync success

### Unhappy Path Tests
- ✅ Login with invalid credentials
- ✅ Missing required fields
- ✅ Invalid profile switches
- ✅ Contract readiness without criteria
- ✅ ERP sync without readiness
- ✅ Duplicate detection

### Edge Cases
- ✅ Empty state handling
- ✅ Count floor at zero (notifications)
- ✅ Multiple memberships
- ✅ Expiry date boundaries
- ✅ Tax ID validation by country
- ✅ Role-based access control

## Debugging Tests

### Enable Detailed Logging

```typescript
// Add to your test
console.log('Current state:', useYourStore.getState());
```

### Debug with UI

```bash
npm test -- --ui
```

### Run Specific Test

```bash
# Run only tests matching "should login"
npm test -- -t "should login"
```

### Watch Mode

```bash
npm test -- --watch
```

## Common Issues

### Import Errors

**Problem**: `Cannot find module '@/...'`

**Solution**: Ensure `@` alias is configured in `vitest.config.ts`:
```typescript
resolve: {
    alias: {
        '@': path.resolve(__dirname, './src'),
    },
}
```

### Act() Warnings

**Problem**: `Warning: An update to ... was not wrapped in act(...)`

**Solution**: Wrap state updates in `act()`:
```typescript
act(() => {
    useYourStore.getState().someAction();
});
```

### Async State Updates

**Problem**: Test fails because state hasn't updated yet

**Solution**: Use `async` act:
```typescript
await act(async () => {
    await useYourStore.getState().asyncAction();
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --run --coverage
      - uses: codecov/codecov-action@v3
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Clean up after tests

### 2. Descriptive Names
```typescript
// Good
it('should decrement unread count but not below zero', () => {});

// Bad
it('works', () => {});
```

### 3. Test Behavior, Not Implementation
```typescript
// Good - tests what happens
it('sets user as authenticated on login', () => {
    expect(state.isAuthenticated).toBe(true);
});

// Bad - tests how it works
it('sets user object and isAuthenticated to true', () => {
    expect(state.user).toBeDefined();
    expect(state.isAuthenticated).toBe(true);
});
```

### 4. Use Test Helpers
```typescript
// Create reusable test data
const createMockUser = (overrides = {}) => ({
    userId: 'U001',
    username: 'Test User',
    email: 'test@example.com',
    role: 'BUYER',
    ...overrides
});
```

### 5. Arrange-Act-Assert Pattern
```typescript
it('updates user profile', () => {
    // Arrange
    const user = createMockUser();
    const updates = { username: 'Updated Name' };

    // Act
    act(() => useAuthStore.getState().updateBuyer(user.userId, updates));

    // Assert
    expect(useAuthStore.getState().user?.username).toBe('Updated Name');
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Testing Library](https://testing-library.com/react)
- [Zustand Testing Guide](https://zustand.docs.pmnd.rs/guides/testing)
