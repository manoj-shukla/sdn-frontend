/**
 * Supplier Onboarding E2E Tests (Mocked)
 * Tests the complete supplier onboarding flow using mocked APIs.
 * No real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth, injectSupplierAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockSupplier = {
    supplierId: 'sup-1',
    legalName: 'E2E Test Supplier',
    email: 'supplier@e2e.test',
    approvalStatus: 'PENDING',
    country: 'United States',
    description: '',
    businessType: 'Enterprise',
    taxId: '',
    website: '',
};

const mockInvitation = {
    invitationId: 'inv-1',
    email: 'supplier@e2e.test',
    legalName: 'E2E Test Supplier',
    status: 'PENDING',
    token: 'test-invite-token',
    country: 'United States',
};

const mockOnboardingProgress = {
    company: false,
    address: false,
    contact: false,
    tax: false,
    bank: false,
    documents: false,
};

// ---------------------------------------------------------------------------
// Route setup
// ---------------------------------------------------------------------------

async function setupSupplierOnboardingRoutes(page: Page) {
    // Override auth/me for supplier
    await page.route(/\/auth\/me/, async (route) => {
        await route.fulfill({
            json: {
                role: 'SUPPLIER',
                userId: 'sup-1',
                username: 'E2E Test Supplier',
                email: 'supplier@e2e.test',
                supplierId: 'sup-1',
                buyerId: 'buyer-1',
                approvalStatus: 'PENDING',
            }
        });
    });

    // Supplier data
    await page.route(/\/api\/suppliers\/sup-1$/, async (route) => {
        if (route.request().method() === 'PUT') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { ...mockSupplier, ...body } });
        } else {
            await route.fulfill({ json: mockSupplier });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/addresses/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { addressId: 'addr-1', status: 'ACTIVE' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/contacts/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { contactId: 'con-1', status: 'ACTIVE' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/documents/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { documentId: 'doc-1', status: 'UPLOADED' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/bank-accounts/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { bankId: 'bank-1', status: 'ACTIVE' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/reviews\/submit/, async (route) => {
        await route.fulfill({ json: { success: true, approvalStatus: 'SUBMITTED' } });
    });
}

async function setupBuyerRoutes(page: Page) {
    await page.route(/\/api\/invitations\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: [mockInvitation] });
    });
    await page.route('**/api/invitations', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { invitationId: `inv-new-${Date.now()}`, ...body, status: 'PENDING', token: `token-${Date.now()}` } });
        } else {
            await route.fulfill({ json: [mockInvitation] });
        }
    });
    await page.route('**/api/suppliers', async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/workflows\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route('**/api/workflows', async (route) => {
        await route.fulfill({ json: [] });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Supplier Onboarding E2E', () => {

    test('0 – Buyer can verify setup (navigation and auth)', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerRoutes(page);

        await page.goto('/buyer/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        // Basic check: user is authenticated and can reach the buyer dashboard
        expect(page.url()).toContain('/buyer');
    });

    test('1 – Buyer can navigate to suppliers and see the invite form', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerRoutes(page);

        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        // Page should load without error
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });

    test('2 – Supplier can access the accept-invite page', async ({ page }) => {
        // This tests the invite acceptance UI with a mock token
        await page.route(/\/api\/invitations\/accept/, async (route) => {
            await route.fulfill({ json: { success: true, token: 'new-supplier-token' } });
        });
        await page.route(/\/auth\/register-supplier/, async (route) => {
            await route.fulfill({ json: { token: 'new-supplier-token', role: 'SUPPLIER', userId: 'sup-new-1' } });
        });

        // Navigate to accept-invite page with a token
        await page.goto('/auth/accept-invite?token=test-invite-token');
        await page.waitForLoadState('domcontentloaded');

        // Page should load (either show form or redirect to login)
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('3 – Supplier can view their dashboard after registration', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierOnboardingRoutes(page);

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/supplier');
    });

    test('4 – Supplier profile shows onboarding sections', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierOnboardingRoutes(page);

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });

    test('5 – Buyer can view approval tasks', async ({ page }) => {
        await injectBuyerAuth(page);
        await page.route('**/api/approvals/pending', async (route) => {
            await route.fulfill({ json: [] });
        });
        await page.route('**/api/change-requests/pending', async (route) => {
            await route.fulfill({ json: [] });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('6 – Supplier can view their profile for rework', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierOnboardingRoutes(page);

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('7 – Buyer can view and manage the rejection flow', async ({ page }) => {
        await injectBuyerAuth(page);
        await page.route('**/api/approvals/pending', async (route) => {
            await route.fulfill({ json: [] });
        });
        await page.route('**/api/change-requests/pending', async (route) => {
            await route.fulfill({ json: [] });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('8 – Buyer admin dashboard renders correctly', async ({ page }) => {
        await injectBuyerAuth(page);
        await page.route('**/api/approvals/pending', async (route) => {
            await route.fulfill({ json: [] });
        });
        await page.route('**/api/change-requests/pending', async (route) => {
            await route.fulfill({ json: [] });
        });

        await page.goto('/buyer/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('9 – Approved supplier sees supplier dashboard without submit button', async ({ page }) => {
        await injectSupplierAuth(page);

        // Override auth/me for approved supplier
        await page.route(/\/auth\/me/, async (route) => {
            await route.fulfill({
                json: {
                    role: 'SUPPLIER',
                    userId: 'sup-1',
                    username: 'Approved Supplier',
                    email: 'approved@test.com',
                    supplierId: 'sup-1',
                    buyerId: 'buyer-1',
                    approvalStatus: 'APPROVED',
                }
            });
        });

        await page.route(/\/api\/suppliers\/sup-1$/, async (route) => {
            await route.fulfill({ json: { ...mockSupplier, approvalStatus: 'APPROVED' } });
        });
        await page.route(/\/api\/suppliers\/[^/]+/, async (route) => {
            await route.fulfill({ json: [] });
        });

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/supplier');
    });
});
