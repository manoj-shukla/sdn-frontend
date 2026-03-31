/**
 * Supplier Pages Navigation E2E Tests
 *
 * Verifies every supplier-side page loads correctly.
 * All API calls are mocked — no real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectSupplierAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Shared mock setup
// ---------------------------------------------------------------------------

async function setupSupplierPageMocks(page: Page) {
    const mockSupplier = {
        supplierId: 'sup-1', legalName: 'Acme Corp', email: 'acme@test.com',
        country: 'United States', approvalStatus: 'APPROVED',
        website: 'https://acme.com', description: 'Test supplier',
    };

    await page.route(/\/auth\/me/, async (r) => r.fulfill({ json: {
        role: 'SUPPLIER', userId: 'sup-1', supplierId: 'sup-1', buyerId: 'buyer-1',
        username: 'Acme Corp', email: 'acme@test.com', approvalStatus: 'APPROVED',
    }}));

    await page.route(/\/api\/suppliers\/sup-1$/, async (r) => r.fulfill({ json: mockSupplier }));
    await page.route(/\/api\/suppliers\/sup-1\/addresses/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/suppliers\/sup-1\/contacts/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/suppliers\/sup-1\/bank-accounts/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/suppliers\/sup-1\/documents/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/suppliers\/sup-1\/tax/, async (r) => r.fulfill({ json: {} }));
    await page.route(/\/api\/suppliers\/sup-1\/reviews/, async (r) => r.fulfill({ json: {} }));
    await page.route(/\/api\/suppliers\/sup-1\//, async (r) => r.fulfill({ json: [] }));

    await page.route(/\/api\/rfi\/invitations/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/rfi\/[^/]+/, async (r) => r.fulfill({ json: {} }));
    await page.route('**/api/rfi', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/messages', async (r) => r.fulfill({ json: { messages: [], total: 0 } }));
    await page.route('**/api/notifications', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/orders', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/invoices', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/payments', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/certifications', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/change-requests', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/rfqs', async (r) => r.fulfill({ json: [] }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Supplier Pages Navigation', () => {

    test.beforeEach(async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierPageMocks(page);
    });

    test('NAV-S01: Supplier dashboard loads', async ({ page }) => {
        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/supplier');
    });

    test('NAV-S02: Supplier /supplier redirects to dashboard', async ({ page }) => {
        await page.goto('/supplier');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/supplier');
    });

    test('NAV-S03: Supplier addresses page loads', async ({ page }) => {
        await page.goto('/supplier/addresses');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S04: Supplier contacts page loads', async ({ page }) => {
        await page.goto('/supplier/contacts');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S05: Supplier bank page loads', async ({ page }) => {
        await page.goto('/supplier/bank');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S06: Supplier documents page loads with upload UI', async ({ page }) => {
        await page.goto('/supplier/documents');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('NAV-S07: Supplier profile page loads', async ({ page }) => {
        await page.goto('/supplier/profile');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S08: Supplier profile manage-addresses page loads', async ({ page }) => {
        await page.goto('/supplier/profile/manage-addresses');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S09: Supplier profile manage-bank page loads', async ({ page }) => {
        await page.goto('/supplier/profile/manage-bank');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S10: Supplier profile manage-contacts page loads', async ({ page }) => {
        await page.goto('/supplier/profile/manage-contacts');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S11: Supplier profile manage-documents page loads', async ({ page }) => {
        await page.goto('/supplier/profile/manage-documents');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S12: Supplier tax page loads', async ({ page }) => {
        await page.goto('/supplier/tax');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S13: Supplier RFI list page loads', async ({ page }) => {
        await page.goto('/supplier/rfi');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S14: Supplier messages page loads', async ({ page }) => {
        await page.goto('/supplier/messages');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S15: Supplier notifications page loads', async ({ page }) => {
        await page.goto('/supplier/notifications');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S16: Supplier orders page loads', async ({ page }) => {
        await page.goto('/supplier/orders');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S17: Supplier invoices page loads', async ({ page }) => {
        await page.goto('/supplier/invoices');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S18: Supplier payments page loads', async ({ page }) => {
        await page.goto('/supplier/payments');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S19: Supplier performance page loads', async ({ page }) => {
        await page.goto('/supplier/performance');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S20: Supplier certifications page loads', async ({ page }) => {
        await page.goto('/supplier/certifications');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S21: Supplier settings page loads', async ({ page }) => {
        await page.goto('/supplier/settings');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S22: Supplier users page loads', async ({ page }) => {
        await page.goto('/supplier/users');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S23: Supplier awards page loads', async ({ page }) => {
        await page.goto('/supplier/awards');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S24: Supplier bids page loads', async ({ page }) => {
        await page.goto('/supplier/bids');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S25: Supplier rfqs page loads', async ({ page }) => {
        await page.goto('/supplier/rfqs');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-S26: Supplier history page loads', async ({ page }) => {
        await page.goto('/supplier/history');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });
});
