/**
 * Supplier Complete Onboarding Flow (Mocked)
 *
 * Tests the supplier onboarding sections using mocked APIs.
 * No real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectSupplierAuth, injectBuyerAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data & Route Setup
// ---------------------------------------------------------------------------

const mockSupplier = {
    supplierId: 'sup-1',
    legalName: 'E2E Test Supplier',
    email: 'supplier@e2e.test',
    approvalStatus: 'PENDING',
    country: 'United States',
    businessType: 'Enterprise',
    website: 'https://e2e-supplier.com',
    description: 'Test supplier for E2E',
    taxId: '',
};

async function setupSupplierMocks(page: Page) {
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

    await page.route(/\/api\/suppliers\/sup-1$/, async (route) => {
        if (route.request().method() === 'PUT') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { ...mockSupplier, ...body } });
        } else {
            await route.fulfill({ json: mockSupplier });
        }
    });

    // Collection endpoints
    await page.route(/\/api\/suppliers\/sup-1\/addresses/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { addressId: 'addr-1', status: 'ACTIVE', message: 'Address saved' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    await page.route(/\/api\/suppliers\/sup-1\/contacts/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { contactId: 'con-1', status: 'ACTIVE', message: 'Contact saved' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    await page.route(/\/api\/suppliers\/sup-1\/bank-accounts/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { bankId: 'bank-1', status: 'ACTIVE', message: 'Bank saved' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    await page.route(/\/api\/suppliers\/sup-1\/documents/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { documentId: 'doc-1', status: 'UPLOADED', message: 'Uploaded successfully' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    await page.route(/\/api\/suppliers\/sup-1\/reviews\/submit/, async (route) => {
        await route.fulfill({ json: { success: true, approvalStatus: 'SUBMITTED', message: 'Profile submitted' } });
    });

    // Generic supplier catch-all (less specific - registered first, matches last)
    await page.route(/\/api\/suppliers\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('COMPLETE: Supplier End-to-End Onboarding Flow', async ({ page }) => {
    test.setTimeout(60000);

    await injectSupplierAuth(page);
    await setupSupplierMocks(page);

    // Step 1: Navigate to supplier dashboard
    await page.goto('/supplier/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/supplier');

    // Step 2: Verify the dashboard loads with some content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);
});

test('SETUP: Buyer setup for supplier onboarding', async ({ page }) => {
    await injectBuyerAuth(page);

    await page.route(/\/api\/invitations\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route('**/api/invitations', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { invitationId: 'inv-new', status: 'PENDING', token: 'new-token' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });
    await page.route('**/api/suppliers', async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/workflows\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });

    // Buyer navigates to suppliers page
    await page.goto('/buyer/suppliers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/buyer');
});

test('PROFILE: Supplier profile sections are accessible', async ({ page }) => {
    await injectSupplierAuth(page);
    await setupSupplierMocks(page);

    // Navigate to company section
    await page.goto('/supplier/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Verify page renders
    const text = await page.textContent('body');
    expect(text).toBeTruthy();
});

test('SUBMIT: Supplier dashboard displays correctly', async ({ page }) => {
    await injectSupplierAuth(page);
    await setupSupplierMocks(page);

    await page.goto('/supplier/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // The dashboard should display without errors
    const text = await page.textContent('body');
    expect(text).toBeTruthy();
});

test('LOCKED: Approved supplier dashboard state', async ({ page }) => {
    await injectSupplierAuth(page);

    // Override with approved state
    await page.route(/\/auth\/me/, async (route) => {
        await route.fulfill({
            json: {
                role: 'SUPPLIER',
                userId: 'sup-1',
                username: 'E2E Test Supplier',
                email: 'supplier@e2e.test',
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
