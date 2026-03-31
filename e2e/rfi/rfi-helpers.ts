import { Page } from '@playwright/test';

export async function injectBuyerAuth(page: Page) {
    const token = 'fake-buyer-token-test';

    // Set up route mocks before any navigation
    await setupGlobalMocks(page);

    // Set auth cookies at context level — works without a prior navigation
    await page.context().addCookies([
        { name: 'token', value: token, url: 'http://localhost:3000' },
        { name: 'role',  value: 'BUYER', url: 'http://localhost:3000' },
    ]);

    // addInitScript runs before every page load (before React hydration),
    // so localStorage is populated before the app reads it.
    // This replaces the old page.goto('/api/health') + page.evaluate() pattern,
    // which was fragile: HMR could fire between goto and evaluate, destroying
    // the execution context and failing with "context was destroyed".
    await page.addInitScript(({ authToken }) => {
        window.localStorage.setItem('token', authToken);
        window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
                user: {
                    role: 'BUYER',
                    userId: 'buyer-1',
                    username: 'Test Buyer',
                    email: 'buyer@test.com',
                    buyerId: 'buyer-1',
                    subRole: 'Admin',
                    isSandboxActive: false,
                },
                isAuthenticated: true,
                isLoading: false,
                registeredBuyers: [],
            },
            version: 0,
        }));
    }, { authToken: token });
}

export async function injectSupplierAuth(page: Page) {
    const token = 'fake-supplier-token-test';

    await setupGlobalMocks(page);

    await page.context().addCookies([
        { name: 'token', value: token, url: 'http://localhost:3000' },
        { name: 'role',  value: 'SUPPLIER', url: 'http://localhost:3000' },
    ]);

    await page.addInitScript(({ authToken }) => {
        window.localStorage.setItem('token', authToken);
        window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
                user: {
                    role: 'SUPPLIER',
                    userId: 'sup-1',
                    username: 'Acme Corp',
                    email: 'acme@example.com',
                    supplierId: 'sup-1',
                    buyerId: 'buyer-1',
                    subRole: 'Admin',
                    approvalStatus: 'APPROVED',
                    isSandboxActive: false,
                },
                isAuthenticated: true,
                isLoading: false,
                registeredBuyers: [],
            },
            version: 0,
        }));
    }, { authToken: token });
}

export async function setupGlobalMocks(page: Page) {
    // 0. CATCH-ALL but return 404 (Registered first = Match LAST)
    await page.route('**/api/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/api/auth/session') || url.includes('/api/health')) {
            return route.continue();
        }
        // console.log(`[E2E] UNMOCKED API CALL: ${url}`);
        await route.fulfill({
            status: 404,
            headers: { 'X-E2E-Mock': 'Catch-All' },
            json: { error: "Not Mocked", url }
        });
    });

    // 1. Mock Notification Poller
    await page.route('**/api/notifications*', async (route) => {
        await route.fulfill({ status: 200, json: [] });
    });

    // 2. Mock Supplier Message Poller
    await page.route('**/api/suppliers/*/messages*', async (route) => {
        await route.fulfill({ status: 200, json: { messages: [], total: 0 } });
    });

    // 3. Mock auth/me (matches both /auth/me and /api/auth/me)
    await page.route(/\/auth\/me/, async (route) => {
        const cookies = await page.context().cookies();
        const roleCookie = cookies.find(c => c.name === 'role')?.value || 'BUYER';

        const json: any = {
            role: roleCookie,
            userId: roleCookie === 'BUYER' ? 'buyer-1' : 'sup-1',
            username: roleCookie === 'BUYER' ? 'Test Buyer' : 'Acme Corp',
            email: roleCookie === 'BUYER' ? 'buyer@test.com' : 'acme@example.com',
            buyerId: 'buyer-1',
            supplierId: roleCookie === 'SUPPLIER' ? 'sup-1' : undefined
        };

        if (roleCookie === 'SUPPLIER') {
            json.approvalStatus = 'APPROVED';
        }

        await route.fulfill({ status: 200, json });
    });
}
