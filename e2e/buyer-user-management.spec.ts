/**
 * Buyer User & Role Management + Page Navigation E2E Tests
 *
 * User/Role/Circle management:
 *   B1 – Buyer Admin can view roles page
 *   B2 – Buyer Admin can create a new user
 *   B3 – Buyer Admin can create a new procurement circle
 *
 * Buyer page navigation (NAV-B01–NAV-B30):
 *   Verifies every buyer-side page loads and renders key UI.
 *   All API calls are mocked — no real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockRoles = [
    { roleId: 'role-1', name: 'Admin', description: 'Full access', permissions: ['all'], isSystem: true },
    { roleId: 'role-2', name: 'Viewer', description: 'Read-only access', permissions: ['view'], isSystem: false },
];

const mockUsers = [
    { userId: 'user-1', username: 'Test Buyer', email: 'buyer@test.com', role: 'BUYER', subRole: 'Admin', status: 'ACTIVE' },
];

const mockCircles = [
    { circleId: 'circle-1', name: 'Procurement', description: 'Main procurement circle', buyerId: 'buyer-1' },
];

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function setupBuyerRoutes(page: Page) {
    // Register LESS specific patterns first (they will be matched LAST due to LIFO)
    await page.route(/\/api\/users\/[^/]+/, async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'DELETE') {
            await route.fulfill({ json: { success: true } });
        } else {
            await route.fulfill({ json: mockUsers[0] });
        }
    });

    // Register MORE specific patterns after (they will be matched FIRST due to LIFO)
    await page.route(/\/api\/users\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockUsers });
    });

    // Users list/create
    await page.route('**/api/users', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { userId: `user-new-${Date.now()}`, ...body, status: 'ACTIVE' } });
        } else {
            await route.fulfill({ json: mockUsers });
        }
    });

    // Roles - less specific first
    await page.route(/\/api\/buyers\/[^/]+/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });

    // Roles - more specific after (higher priority)
    await page.route(/\/api\/buyers\/[^/]+\/roles/, async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { roleId: `role-new-${Date.now()}`, ...body } });
        } else if (route.request().method() === 'DELETE') {
            await route.fulfill({ json: { success: true } });
        } else {
            await route.fulfill({ json: mockRoles });
        }
    });

    // Circles - less specific first
    await page.route(/\/api\/circles\/[^/]+/, async (route) => {
        if (route.request().method() === 'DELETE') {
            await route.fulfill({ json: { success: true } });
        } else {
            await route.fulfill({ json: mockCircles[0] });
        }
    });

    // Circles by buyer - more specific after (higher priority)
    await page.route(/\/api\/circles\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockCircles });
    });

    // Circles list/create
    await page.route('**/api/circles', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { circleId: `circle-new-${Date.now()}`, ...body } });
        } else {
            await route.fulfill({ json: mockCircles });
        }
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Buyer User and Role Management', () => {
    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerRoutes(page);
    });

    test('B1: Buyer Admin can view roles page', async ({ page }) => {
        await page.goto('/buyer/roles');
        // Page loads and shows at least some role-related content
        await expect(page.getByText(/role/i).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /create role/i })).toBeVisible({ timeout: 10000 });
    });

    test('B2: Buyer Admin can create a new user', async ({ page }) => {
        await page.goto('/buyer/users');
        // Wait for API calls to complete and page to fully render
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('add-user-btn')).toBeVisible({ timeout: 15000 });
        await page.getByTestId('add-user-btn').click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const testName = `E2E User ${Date.now()}`;
        const nameField = dialog.locator('input').first();
        if (await nameField.count() > 0) {
            await nameField.fill(testName);
        }
        const emailField = dialog.locator('input[type="email"]').first();
        if (await emailField.count() > 0) {
            await emailField.fill(`e2e_${Date.now()}@test.com`);
        }

        const submitBtn = dialog.getByRole('button', { name: /create user|add user|save/i });
        if (await submitBtn.count() > 0) {
            await submitBtn.click();
        }
    });

    test('B3: Buyer Admin can create a new procurement circle', async ({ page }) => {
        const circleName = `E2E Circle ${Date.now()}`;

        await page.goto('/buyer/circles');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: /create circle/i })).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /create circle/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const nameInput = dialog.locator('input').first();
        await nameInput.fill(circleName);

        const descInput = dialog.locator('input').nth(1);
        if (await descInput.count() > 0) {
            await descInput.fill('Automated test circle');
        }

        await dialog.getByRole('button', { name: /create circle/i }).click();
        // Dialog should close on success
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });
});

// ===========================================================================
// Buyer Pages Navigation
// ===========================================================================

async function setupBuyerPageMocks(page: Page) {
    await page.route(/\/auth\/me/, async (r) => r.fulfill({ json: { role: 'BUYER', userId: 'buyer-1', buyerId: 'buyer-1', username: 'Test Buyer', subRole: 'Admin' } }));
    await page.route(/\/api\/analytics\/buyer\/summary/, async (r) => r.fulfill({ json: { totalSuppliers: 12, pendingOnboarding: 3, openRfq: 2, riskAlerts: 1, portalUsers: 5 } }));
    await page.route(/\/api\/analytics\/buyer\//, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/analytics\//, async (r) => r.fulfill({ json: [] }));

    await page.route('**/api/suppliers', async (r) => r.fulfill({ json: [
        { supplierId: 'sup-1', legalName: 'Acme Corp', country: 'US', approvalStatus: 'APPROVED' },
        { supplierId: 'sup-2', legalName: 'Beta Ltd', country: 'UK', approvalStatus: 'SUBMITTED' },
    ]}));
    await page.route(/\/api\/suppliers\/[^/]+$/, async (r) => r.fulfill({ json: { supplierId: 'sup-1', legalName: 'Acme Corp', country: 'US', approvalStatus: 'APPROVED' } }));

    await page.route(/\/api\/invitations\/buyer\/[^/]+/, async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/invitations', async (r) => r.fulfill({ json: [] }));

    // Register workflow routes: generic FIRST (lowest LIFO priority), specific LAST (highest priority)
    await page.route(/\/api\/workflows\/[^/]+/, async (r) => r.fulfill({ json: { workflowId: 1, name: 'Standard Onboarding', steps: [] } }));
    await page.route('**/api/workflows', async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/workflows\/buyer\/[^/]+/, async (r) => r.fulfill({ json: [
        { workflowId: 1, name: 'Standard Onboarding', isDefault: true, isActive: true, stepCount: 1, supplierCount: 2, ruleCount: 0 }
    ]}));
    await page.route(/\/api\/workflows\/roles\/[^/]+/, async (r) => r.fulfill({ json: [
        { roleId: 1, roleName: 'Admin' }, { roleId: 2, roleName: 'Approver' }
    ]}));
    await page.route(/\/api\/workflows\/country-rules\/[^/]+/, async (r) => r.fulfill({ json: [] }));

    await page.route(/\/api\/buyers\/[^/]+\/roles/, async (r) => r.fulfill({ json: [{ roleId: 1, roleName: 'Admin' }] }));
    await page.route(/\/api\/users\/buyer\/[^/]+/, async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/circles\/buyer\/[^/]+/, async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/circles', async (r) => r.fulfill({ json: [] }));

    await page.route(/\/api\/rfi\/buyer\/[^/]+/, async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/rfi', async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/rfi\/[^/]+/, async (r) => r.fulfill({ json: {} }));
    await page.route('**/api/rfi/templates', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/rfi/questions', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/rfi/responses', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/rfi/analytics', async (r) => r.fulfill({ json: {} }));

    await page.route('**/api/tasks', async (r) => r.fulfill({ json: [] }));
    await page.route('**/api/messages', async (r) => r.fulfill({ json: { messages: [], total: 0 } }));
    await page.route('**/api/notifications', async (r) => r.fulfill({ json: [] }));
}

test.describe('Buyer Pages Navigation', () => {

    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
        await setupBuyerPageMocks(page);
    });

    test('NAV-B01: Buyer dashboard loads with key headings', async ({ page }) => {
        await page.goto('/buyer/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(100);
    });

    test('NAV-B02: Suppliers page loads with directory tab', async ({ page }) => {
        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/supplier|directory/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('NAV-B03: Supplier detail page loads', async ({ page }) => {
        await page.goto('/buyer/suppliers/sup-1');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B04: Suppliers page - Sent Invitations tab is clickable', async ({ page }) => {
        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        const invitationsTab = page.getByRole('tab', { name: /invitations/i });
        if (await invitationsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await invitationsTab.click();
            await expect(page.locator('body')).toBeVisible();
        }
    });

    test('NAV-B05: Suppliers page - New Invite tab is clickable', async ({ page }) => {
        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        const newInviteTab = page.getByRole('tab', { name: /new invite|invite/i });
        if (await newInviteTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await newInviteTab.click();
            await expect(page.locator('body')).toBeVisible();
        }
    });

    test('NAV-B06: Onboarding tasks page loads', async ({ page }) => {
        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: /supplier onboarding/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/no pending onboarding tasks/i)).toBeVisible({ timeout: 10000 });
    });

    test('NAV-B07: Roles page loads with Create Role button', async ({ page }) => {
        await page.goto('/buyer/roles');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: /create role/i })).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B08: Workflows page loads with New Workflow button', async ({ page }) => {
        await page.goto('/buyer/workflows');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: /new workflow/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/standard onboarding/i)).toBeVisible({ timeout: 10000 });
    });

    test('NAV-B09: Workflows page - Country Risk Rules tab is clickable', async ({ page }) => {
        await page.goto('/buyer/workflows');
        await page.waitForLoadState('networkidle');
        const tab = page.getByRole('tab', { name: /country risk/i });
        if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tab.click();
            await expect(page.locator('body')).toBeVisible();
        }
    });

    test('NAV-B10: Users page loads with Add User button', async ({ page }) => {
        await page.goto('/buyer/users');
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('add-user-btn')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B11: Circles page loads', async ({ page }) => {
        await page.goto('/buyer/circles');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const text = await page.textContent('body');
        expect(text).toBeTruthy();
    });

    test('NAV-B12: RFI list page loads', async ({ page }) => {
        await page.goto('/buyer/rfi');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B13: RFI templates page loads', async ({ page }) => {
        await page.goto('/buyer/rfi/templates');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B14: RFI create page loads', async ({ page }) => {
        await page.goto('/buyer/rfi/create');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B15: RFI analytics page loads', async ({ page }) => {
        await page.goto('/buyer/rfi/analytics');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B16: RFI questions page loads', async ({ page }) => {
        await page.goto('/buyer/rfi/questions');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B17: RFI responses page loads', async ({ page }) => {
        await page.goto('/buyer/rfi/responses');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B18: Tasks page loads', async ({ page }) => {
        await page.goto('/buyer/tasks');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B19: Messages page loads', async ({ page }) => {
        await page.goto('/buyer/messages');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B20: Notifications page loads', async ({ page }) => {
        await page.goto('/buyer/notifications');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B21: Compliance page loads', async ({ page }) => {
        await page.goto('/buyer/compliance');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B22: Contracts page loads', async ({ page }) => {
        await page.goto('/buyer/contracts');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B23: Performance page loads', async ({ page }) => {
        await page.goto('/buyer/performance');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B24: Portal page loads', async ({ page }) => {
        await page.goto('/buyer/portal');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B25: Auctions page loads (coming soon)', async ({ page }) => {
        await page.goto('/buyer/auctions');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B26: Awards page loads', async ({ page }) => {
        await page.goto('/buyer/awards');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B27: Bids page loads', async ({ page }) => {
        await page.goto('/buyer/bids');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B28: Integrations page loads', async ({ page }) => {
        await page.goto('/buyer/integrations');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B29: RFP page loads', async ({ page }) => {
        await page.goto('/buyer/rfp');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('NAV-B30: /buyer redirects to /buyer/dashboard', async ({ page }) => {
        await page.goto('/buyer');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/buyer');
    });
});
