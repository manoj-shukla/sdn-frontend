import { Page } from '@playwright/test';

export async function injectBuyerAuth(page: Page) {
    const token = 'fake-buyer-token-test';
    
    // Setup mocks first so the establishment navigation doesn't fail or leak
    await setupGlobalMocks(page);

    // 1. Visit an unprotected route to establish domain for cookies and localStorage
    await page.goto('http://localhost:3000/api/health').catch(() => {});

    // 2. Set cookies at the context level
    await page.context().addCookies([
        { name: 'token', value: token, url: 'http://localhost:3000' },
        { name: 'role', value: 'BUYER', url: 'http://localhost:3000' }
    ]);

    // 3. Set localStorage directly while on the domain
    await page.evaluate(({ token }) => {
        window.localStorage.setItem('token', token);
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
    }, { token });
}

export async function injectSupplierAuth(page: Page) {
    const token = 'fake-supplier-token-test';
    
    await setupGlobalMocks(page);
    await page.goto('http://localhost:3000/api/health').catch(() => {});

    await page.context().addCookies([
        { name: 'token', value: token, domain: 'localhost', path: '/' },
        { name: 'role', value: 'SUPPLIER', domain: 'localhost', path: '/' }
    ]);

    await page.evaluate(({ token }) => {
        window.localStorage.setItem('token', token);
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
    }, { token });
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
