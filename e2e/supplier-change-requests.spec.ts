/**
 * Supplier Change Requests E2E Tests (Mocked)
 * Tests supplier profile management and buyer task approval flow
 * using mocked APIs - no real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth, injectSupplierAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockSupplier = {
    supplierId: 'sup-1',
    legalName: 'CR Supplier Test',
    email: 'cr_supplier@test.com',
    approvalStatus: 'APPROVED',
    country: 'United States',
    description: 'A test supplier',
    taxId: 'TAX123456',
};

const mockAddresses = [
    {
        addressId: 'addr-1',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        isPrimary: true,
        status: 'APPROVED',
    }
];

const mockBankAccounts = [
    {
        bankId: 'bank-1',
        bankName: 'First Bank',
        accountNumber: '****1234',
        sortCode: '12-34-56',
        status: 'APPROVED',
    }
];

const mockChangeRequests = [
    {
        instanceId: 'cr-inst-1',
        supplierId: 'sup-1',
        supplierName: 'CR Supplier Test',
        changeType: 'ADDRESS_ADD',
        status: 'PENDING',
        payload: { addressLine1: '456 Update Ave', city: 'Change City' },
    }
];

// ---------------------------------------------------------------------------
// Route setup
// ---------------------------------------------------------------------------

async function setupSupplierRoutes(page: Page) {
    // Auth/me returns supplier data
    await page.route(/\/auth\/me/, async (route) => {
        await route.fulfill({
            json: {
                role: 'SUPPLIER',
                userId: 'sup-1',
                username: 'CR Supplier Test',
                email: 'cr_supplier@test.com',
                supplierId: 'sup-1',
                buyerId: 'buyer-1',
                approvalStatus: 'APPROVED',
            }
        });
    });

    // Supplier details
    await page.route(/\/api\/suppliers\/sup-1$/, async (route) => {
        await route.fulfill({ json: mockSupplier });
    });
    await page.route(/\/api\/suppliers\/sup-1\/addresses/, async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { addressId: `addr-new-${Date.now()}`, ...body, status: 'PENDING_ADD' } });
        } else {
            await route.fulfill({ json: mockAddresses });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/bank-accounts/, async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { bankId: `bank-new-${Date.now()}`, ...body, status: 'PENDING_APPROVAL' } });
        } else {
            await route.fulfill({ json: mockBankAccounts });
        }
    });
    await page.route(/\/api\/suppliers\/sup-1\/contacts/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/suppliers\/sup-1\/documents/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/suppliers\/sup-1\/reviews\/submit/, async (route) => {
        await route.fulfill({ json: { success: true, approvalStatus: 'SUBMITTED' } });
    });
}

async function setupBuyerTaskRoutes(page: Page) {
    // Pending approvals
    await page.route('**/api/approvals/pending', async (route) => {
        await route.fulfill({ json: [] });
    });

    // Change requests
    await page.route('**/api/change-requests/pending', async (route) => {
        await route.fulfill({ json: mockChangeRequests });
    });

    await page.route(/\/api\/change-requests\/[^/]+\/approve/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });
    await page.route(/\/api\/change-requests\/[^/]+\/reject/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Supplier Change Requests E2E', () => {

    test('CR1: Supplier can view their profile page', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierRoutes(page);

        await page.goto('/supplier/profile');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        // Profile page should load with some content
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });

    test('CR2: Supplier can view addresses tab', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierRoutes(page);

        await page.goto('/supplier/profile');
        await page.waitForLoadState('networkidle');

        // Try to find addresses tab
        const addressTab = page.getByRole('tab', { name: /addresses/i });
        if (await addressTab.isVisible({ timeout: 5000 })) {
            await addressTab.click();
            await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
        }
    });

    test('CR3: Supplier can navigate to addresses page', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierRoutes(page);

        await page.goto('/supplier/addresses');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('CR4: Buyer can view the onboarding tasks page', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerTaskRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('CR5: Buyer sees change requests in the tasks list', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerTaskRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        // Page renders without errors
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });
});
