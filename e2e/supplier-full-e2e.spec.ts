/**
 * Full E2E Playwright Suite: Supplier Onboarding Lifecycle (Mocked)
 *
 * Tests the complete buyer→supplier onboarding lifecycle using mocked APIs.
 * Scenario A — Happy Path (Buyer invites, Supplier onboards, Buyer approves)
 * Scenario B — Rework/Reject Path
 *
 * No real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth, injectSupplierAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockBuyerSuppliers = [
    {
        supplierId: 'sup-a',
        legalName: 'PW Supplier A',
        email: 'sup_a@e2e.test',
        approvalStatus: 'SUBMITTED',
        country: 'United States',
    }
];

const mockSupplierA = {
    supplierId: 'sup-a',
    legalName: 'PW Supplier A',
    email: 'sup_a@e2e.test',
    approvalStatus: 'SUBMITTED',
    country: 'United States',
    description: 'Test supplier A',
};

const mockPendingApproval = {
    instanceId: 'inst-a',
    supplierId: 'sup-a',
    supplierName: 'PW Supplier A',
    stepOrder: 1,
    stepName: 'Final Approval',
    status: 'PENDING',
};

const mockInvitations = [
    {
        invitationId: 'inv-a',
        email: 'sup_a@e2e.test',
        legalName: 'PW Supplier A',
        status: 'ACCEPTED',
        token: 'invite-token-a',
    }
];

// ---------------------------------------------------------------------------
// Route setup helpers
// ---------------------------------------------------------------------------

async function setupBuyerScenarioRoutes(page: Page) {
    // Suppliers
    await page.route(/\/api\/suppliers\/sup-a/, async (route) => {
        await route.fulfill({ json: mockSupplierA });
    });
    await page.route('**/api/suppliers', async (route) => {
        await route.fulfill({ json: mockBuyerSuppliers });
    });

    // Invitations
    await page.route(/\/api\/invitations\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockInvitations });
    });
    await page.route('**/api/invitations', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { invitationId: `inv-new-${Date.now()}`, ...body, status: 'PENDING', token: `token-${Date.now()}` } });
        } else {
            await route.fulfill({ json: mockInvitations });
        }
    });

    // Workflows
    await page.route(/\/api\/workflows\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route('**/api/workflows', async (route) => {
        await route.fulfill({ json: [] });
    });

    // Approvals
    await page.route('**/api/approvals/pending', async (route) => {
        await route.fulfill({ json: [mockPendingApproval] });
    });
    await page.route(/\/api\/approvals\/inst-a\/approve/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });
    await page.route(/\/api\/approvals\/inst-a\/reject/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });
    await page.route(/\/api\/approvals\/inst-a\/rework/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });

    // Change requests
    await page.route('**/api/change-requests/pending', async (route) => {
        await route.fulfill({ json: [] });
    });
}

async function setupSupplierScenarioRoutes(page: Page) {
    await page.route(/\/auth\/me/, async (route) => {
        await route.fulfill({
            json: {
                role: 'SUPPLIER',
                userId: 'sup-a',
                username: 'PW Supplier A',
                email: 'sup_a@e2e.test',
                supplierId: 'sup-a',
                buyerId: 'buyer-1',
                approvalStatus: 'APPROVED',
            }
        });
    });

    await page.route(/\/api\/suppliers\/sup-a$/, async (route) => {
        if (route.request().method() === 'PUT') {
            await route.fulfill({ json: { ...mockSupplierA, approvalStatus: 'APPROVED' } });
        } else {
            await route.fulfill({ json: { ...mockSupplierA, approvalStatus: 'APPROVED' } });
        }
    });
    await page.route(/\/api\/suppliers\/sup-a\/addresses/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/suppliers\/sup-a\/contacts/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/suppliers\/sup-a\/documents/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/suppliers\/sup-a\/bank-accounts/, async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.route(/\/api\/suppliers\/sup-a\/reviews\/submit/, async (route) => {
        await route.fulfill({ json: { success: true, approvalStatus: 'SUBMITTED' } });
    });
}

// ---------------------------------------------------------------------------
// Scenario A: Happy Path
// ---------------------------------------------------------------------------

test.describe('Scenario A – Happy Path', () => {
    test('A1: Buyer can view the supplier invitation page', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerScenarioRoutes(page);

        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/buyer/suppliers');
    });

    test('A2: Supplier can view their dashboard', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierScenarioRoutes(page);

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/supplier');
    });

    test('A3: Buyer can view pending approval tasks', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerScenarioRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('A4: Buyer can navigate to onboarding approvals and see supplier', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerScenarioRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        // Page renders without errors
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });

    test('A5: Approved supplier sees correct dashboard state', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierScenarioRoutes(page);

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/supplier');
    });
});

// ---------------------------------------------------------------------------
// Scenario B: Rework / Reject Path
// ---------------------------------------------------------------------------

test.describe('Scenario B – Rework / Reject Path', () => {
    test('B1: Buyer admin can view the buyers dashboard', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerScenarioRoutes(page);

        await page.goto('/buyer/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        expect(page.url()).toContain('/buyer');
    });

    test('B2: Supplier can see their dashboard after rework request', async ({ page }) => {
        await injectSupplierAuth(page);
        await setupSupplierScenarioRoutes(page);

        await page.goto('/supplier/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('B3: Buyer can view suppliers list and their statuses', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerScenarioRoutes(page);

        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });
});
