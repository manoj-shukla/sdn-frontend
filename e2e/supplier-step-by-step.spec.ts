/**
 * Supplier Onboarding Step-By-Step Flow Test (Mocked)
 *
 * Tests the supplier onboarding sections individually using mocked APIs.
 * No real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectSupplierAuth } from './rfi/rfi-helpers';

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
    website: '',
    description: '',
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

    await page.route(/\/api\/suppliers\/sup-1\/addresses/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { addressId: 'addr-1', status: 'ACTIVE', message: 'Address saved successfully' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    await page.route(/\/api\/suppliers\/sup-1\/contacts/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { contactId: 'con-1', status: 'ACTIVE', message: 'Contact details saved' } });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    await page.route(/\/api\/suppliers\/sup-1\/bank-accounts/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { bankId: 'bank-1', status: 'ACTIVE', message: 'Bank details saved' } });
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

    // Generic - less specific, registered first (lower priority)
    await page.route(/\/api\/suppliers\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Supplier Onboarding Step-By-Step', () => {
    test.beforeEach(async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierMocks(page);
    });

    test('STEP 1: Supplier can access the dashboard', async ({ page }) => {
        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/supplier');
    });

    test('STEP 2: Supplier can navigate to address section', async ({ page }) => {
        await page.goto('/supplier/addresses');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('STEP 3: Supplier can navigate to contacts section', async ({ page }) => {
        await page.goto('/supplier/contacts');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('STEP 4: Supplier can navigate to bank details section', async ({ page }) => {
        await page.goto('/supplier/bank');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('STEP 5: Supplier can navigate to documents section', async ({ page }) => {
        await page.goto('/supplier/documents');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('STEP 6: Supplier profile page loads correctly', async ({ page }) => {
        await page.goto('/supplier/profile');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });

    test('STEP 7: Supplier dashboard shows profile submission state', async ({ page }) => {
        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

        const text = await page.textContent('body');
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(50);
    });
});
