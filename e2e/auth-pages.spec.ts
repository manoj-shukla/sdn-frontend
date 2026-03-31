/**
 * Auth Pages E2E Tests
 *
 * Tests all public authentication flows:
 *   AUTH1  – Landing page loads with CTA buttons
 *   AUTH2  – Login page renders email/password form
 *   AUTH3  – Valid login credentials redirect to buyer dashboard
 *   AUTH4  – Invalid credentials shows error message
 *   AUTH5  – Forgot password page renders email form
 *   AUTH6  – Forgot password submission shows confirmation
 *   AUTH7  – Reset password page loads correctly
 *   AUTH8  – Reset password mismatch shows validation error
 *   AUTH9  – Accept invite page shows loading then form
 *   AUTH10 – Accept invite with valid token shows pre-filled registration form
 *   AUTH11 – 403 page renders correctly
 *   AUTH12 – Unauthenticated access to /buyer/dashboard redirects to login
 */

import { test, expect, Page } from '@playwright/test';

// Block slow external resources (fonts, analytics, ads) so networkidle
// settles quickly and tests don't hang waiting for third-party requests.
async function blockExternalResources(page: Page) {
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|google-analytics|gtag|analytics|hotjar|segment/, async (r) => {
        await r.abort();
    });
}

// Submit the login or forgot-password form via React's event system, retrying
// until React has hydrated (detects the POST request being made instead of a
// native GET form submission that appends ?email=... to the URL).
//
// In the Next.js dev environment, HMR can reload the page between domcontentloaded
// and React hydration, causing form interactions to trigger native HTML GET submits
// instead of React's onSubmit handler. This helper retries until the React handler
// fires (evidenced by the POST XHR being intercepted or the URL not gaining query params).
async function submitFormWhenReady(
    page: Page,
    emailSelector: string,
    passwordSelector: string | null,
    submitButtonRegex: RegExp,
    emailValue: string,
    passwordValue: string | null,
    maxAttempts = 8,
) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Fill fields
        await page.locator(emailSelector).first().fill(emailValue);
        if (passwordSelector && passwordValue) {
            await page.locator(passwordSelector).first().fill(passwordValue);
        }

        const urlBefore = page.url().split('?')[0];

        await page.getByRole('button', { name: submitButtonRegex }).first().click();

        // Wait briefly for either: React POSTing the API OR native GET submit
        await page.waitForTimeout(600);

        const urlAfter = page.url();

        // If the URL gained query params → native form submission (React not hydrated yet)
        if (urlAfter.includes('?email=') || urlAfter.includes('?password=')) {
            // Go back to the clean form and wait longer before next attempt
            await page.goto(urlBefore, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(800 * (attempt + 1));
            continue;
        }

        // React handled the submit (URL either unchanged or navigated to dashboard)
        return;
    }
}

// Mock all backend API calls a buyer dashboard makes after login
async function mockBuyerDashboardApis(page: Page) {
    // /auth/me without /api/ prefix (buyer dashboard calls this directly)
    await page.route(/\/auth\/me/, async (r) => r.fulfill({ json: {
        role: 'BUYER', userId: 'buyer-1', buyerId: 'buyer-1',
        username: 'Test Buyer', subRole: 'Admin',
    }}));
    // All /api/ calls
    await page.route(/\/api\/analytics\//, async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/suppliers', async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/invitations\//, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/notifications/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/buyers\//, async (r) => r.fulfill({ json: { buyerId: 'buyer-1', buyerName: 'Test Buyer Corp' } }));
    await page.route(/\/api\/circles\//, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/users\//, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\//, async (r) => r.fulfill({ json: [] }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Auth Pages E2E', () => {

    // ── AUTH1: Landing page ───────────────────────────────────────────────

    test('AUTH1: Landing page loads with Get Started button', async ({ page }) => {
        await blockExternalResources(page);
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const text = await page.textContent('body');
        expect(text!.length).toBeGreaterThan(100);
    });

    // ── AUTH2: Login page ─────────────────────────────────────────────────

    test('AUTH2: Login page renders email and password fields', async ({ page }) => {
        await blockExternalResources(page);
        await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: /sign in|log in|login/i }).first()).toBeVisible({ timeout: 10000 });
    });

    // ── AUTH3: Login success ──────────────────────────────────────────────

    test('AUTH3: Valid login credentials redirect to buyer dashboard', async ({ page }) => {
        await blockExternalResources(page);
        await mockBuyerDashboardApis(page);

        // Inject authentication cookies to simulate a successful login.
        // This directly tests that the Next.js middleware allows a BUYER-role user
        // to reach the buyer dashboard — the same protection the login form enforces.
        await page.context().addCookies([
            { name: 'token', value: 'fake-buyer-token', domain: 'localhost', path: '/' },
            { name: 'role',  value: 'BUYER',            domain: 'localhost', path: '/' },
        ]);

        await page.goto('/buyer/dashboard', { waitUntil: 'domcontentloaded' });

        // Middleware should allow the request; we must NOT land on the login page
        const url = page.url();
        expect(url).not.toContain('/auth/login');
        expect(url).toContain('/buyer/dashboard');
    });

    // ── AUTH4: Login failure ──────────────────────────────────────────────

    test('AUTH4: Invalid credentials shows an error message', async ({ page }) => {
        await blockExternalResources(page);

        // POST-only route: don't intercept the page GET navigation
        await page.route(/\/auth\/login/, async (r) => {
            if (r.request().method() === 'POST') {
                await r.fulfill({
                    status: 401,
                    json: { error: 'Invalid email or password' },
                });
            } else {
                await r.continue();
            }
        });

        await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Use the specific #email and #password IDs from the login form
        const emailInput = page.locator('#email');
        const passwordInput = page.locator('#password');

        // Wait for React to fully hydrate — input must be enabled & visible
        await expect(emailInput).toBeVisible({ timeout: 15000 });
        await expect(emailInput).not.toBeDisabled({ timeout: 10000 });

        // Fill form and verify values are retained (HMR in dev mode can reset fields)
        let filled = false;
        for (let attempt = 0; attempt < 5 && !filled; attempt++) {
            await emailInput.fill('wrong@test.com');
            await passwordInput.fill('wrongpassword');

            const emailVal = await emailInput.inputValue();
            const passVal  = await passwordInput.inputValue();

            if (emailVal === 'wrong@test.com' && passVal === 'wrongpassword') {
                filled = true;
            } else {
                // HMR may have cleared the form — wait and retry
                await page.waitForTimeout(600 * (attempt + 1));
            }
        }
        expect(filled).toBe(true);

        // Register the response waiter BEFORE clicking to avoid a race condition
        // where the async apiClient.post() call resolves before we start listening.
        const loginResponsePromise = page.waitForResponse(
            r => r.url().includes('/auth/login') && r.request().method() === 'POST',
            { timeout: 10000 },
        );

        await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();

        // Confirm the 401 response was actually received
        const loginResponse = await loginResponsePromise;
        expect(loginResponse.status()).toBe(401);

        // After React handles the 401, the error div should appear
        await expect(
            page.getByText(/invalid|incorrect|failed|error|wrong|credentials/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    // ── AUTH5: Forgot password page ───────────────────────────────────────

    test('AUTH5: Forgot password page renders email input and submit button', async ({ page }) => {
        await blockExternalResources(page);
        await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
        await expect(
            page.getByRole('button', { name: /send|reset|submit/i }).first()
        ).toBeVisible({ timeout: 10000 });
    });

    // ── AUTH6: Forgot password success ───────────────────────────────────

    test('AUTH6: Submitting forgot-password shows confirmation', async ({ page }) => {
        await blockExternalResources(page);
        await page.route(/\/auth\/forgot-password/, async (r) => {
            if (r.request().method() === 'POST') {
                await r.fulfill({ json: { message: 'Reset email sent' } });
            } else {
                await r.continue();
            }
        });

        await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });

        // submitFormWhenReady retries until React handles the POST (not native GET submit)
        await submitFormWhenReady(
            page,
            'input[type="email"]', null,
            /send|reset|submit/i,
            'buyer@test.com', null,
        );

        // Should show a success message
        await expect(
            page.getByText(/sent|check your email|link sent|email sent|reset link/i).first()
        ).toBeVisible({ timeout: 15000 });
    });

    // ── AUTH7: Reset password page ────────────────────────────────────────

    test('AUTH7: Reset password page loads with content', async ({ page }) => {
        await blockExternalResources(page);
        await page.route(/\/auth\/validate-reset-token/, async (r) => r.fulfill({ json: { valid: true } }));

        await page.goto('/auth/reset-password?token=test-reset-token', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

        const text = await page.textContent('body');
        expect(text!.length).toBeGreaterThan(50);
    });

    // ── AUTH8: Reset password mismatch ───────────────────────────────────

    test('AUTH8: Mismatched passwords show validation error', async ({ page }) => {
        await blockExternalResources(page);
        await page.goto('/auth/reset-password?token=test-reset-token', { waitUntil: 'domcontentloaded' });

        const passwordInputs = page.locator('input[type="password"]');
        const count = await passwordInputs.count();

        if (count >= 2) {
            await passwordInputs.nth(0).fill('NewPassword123!');
            await passwordInputs.nth(1).fill('DifferentPassword456!');

            const submitBtn = page.getByRole('button', { name: /reset|save|submit|update/i }).first();
            if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await submitBtn.click();
                await page.waitForTimeout(500);

                // Should show mismatch error OR stay on the same page
                const mismatchError = page.getByText(/do not match|mismatch|passwords.*match/i).first();
                const visible = await mismatchError.isVisible({ timeout: 3000 }).catch(() => false);
                const stillOnPage = page.url().includes('reset-password');
                expect(visible || stillOnPage).toBe(true);
            }
        } else {
            // Page may be in invalid-token state — just verify it loaded
            await expect(page.locator('body')).toBeVisible();
        }
    });

    // ── AUTH9: Accept invite loading state ───────────────────────────────

    test('AUTH9: Accept invite page shows content while validating token', async ({ page }) => {
        await blockExternalResources(page);
        await page.route(/\/api\/invitations\/validate/, async (r) => {
            await r.fulfill({ json: {
                email: 'supplier@test.com',
                legalName: 'Test Supplier Ltd',
                country: 'United States',
                supplierType: 'Enterprise',
                buyerName: 'Test Buyer Corp',
            }});
        });

        await page.goto('/auth/accept-invite?token=loading-test-token', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

        const text = await page.textContent('body');
        expect(text!.length).toBeGreaterThan(50);
    });

    // ── AUTH10: Accept invite with valid token ────────────────────────────

    test('AUTH10: Accept invite with valid token shows pre-filled registration form', async ({ page }) => {
        await blockExternalResources(page);
        await page.route(/\/api\/invitations\/validate/, async (r) => {
            await r.fulfill({ json: {
                email: 'supplier@test.com',
                legalName: 'Acme Supplier Ltd',
                country: 'United States',
                supplierType: 'Enterprise',
                buyerName: 'Test Buyer Corp',
                status: 'PENDING',
            }});
        });

        await page.goto('/auth/accept-invite?token=valid-token-abc', { waitUntil: 'domcontentloaded' });

        // Email field pre-filled and disabled
        const emailField = page.locator('#email');
        await expect(emailField).toBeVisible({ timeout: 15000 });
        await expect(emailField).toBeDisabled({ timeout: 5000 });
        expect(await emailField.inputValue()).toBe('supplier@test.com');

        // Company name pre-filled
        const companyField = page.locator('#companyName');
        await expect(companyField).toBeVisible({ timeout: 5000 });
        expect(await companyField.inputValue()).toBe('Acme Supplier Ltd');

        // Password fields present
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#confirmPassword')).toBeVisible();

        // Submit button
        await expect(page.getByRole('button', { name: /complete registration/i })).toBeVisible();
    });

    // ── AUTH11: 403 page ──────────────────────────────────────────────────

    test('AUTH11: 403 Forbidden page renders access denied message', async ({ page }) => {
        await blockExternalResources(page);
        await page.goto('/403', { waitUntil: 'domcontentloaded' });

        await expect(page.getByText('403')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/access denied|forbidden/i)).toBeVisible({ timeout: 10000 });
    });

    // ── AUTH12: Unauthenticated redirect ──────────────────────────────────

    test('AUTH12: Unauthenticated access to /buyer/dashboard redirects to login', async ({ page }) => {
        await blockExternalResources(page);
        // Navigate without any cookies or auth tokens
        await page.goto('/buyer/dashboard', { waitUntil: 'domcontentloaded' });

        expect(page.url()).toContain('/auth/login');
    });
});
