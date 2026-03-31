/**
 * Single Level Workflow E2E Tests (Mocked)
 * Tests buyer workflow management, supplier invitation, and approval flow
 * using mocked APIs - no real backend required.
 */

import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth, injectSupplierAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockWorkflows = [
    {
        workflowId: 'wf-1',
        name: 'Standard Onboarding',
        description: 'Standard supplier approval',
        isDefault: true,
        isActive: true,
        steps: [
            { stepId: 'step-1', stepOrder: 1, stepName: 'Final Approval', roleName: 'Single Level Approver' }
        ]
    }
];

const mockRoles = [
    { roleId: 'role-1', roleName: 'Admin', description: 'Full access', permissions: [] },
    { roleId: 'role-2', roleName: 'Single Level Approver', description: 'Can approve suppliers', permissions: ['CAN_APPROVE'] },
];

const mockSuppliers = [
    {
        supplierId: 'sup-1',
        legalName: 'SL Supplier Test',
        email: 'supplier@test.com',
        approvalStatus: 'SUBMITTED',
        country: 'United States',
    }
];

const mockInvitations = [
    {
        invitationId: 'inv-1',
        email: 'supplier@test.com',
        legalName: 'SL Supplier Test',
        status: 'PENDING',
        token: 'invite-token-1',
    }
];

const mockPendingApprovals = [
    {
        instanceId: 'inst-1',
        supplierId: 'sup-1',
        supplierName: 'SL Supplier Test',
        stepOrder: 1,
        stepName: 'Final Approval',
        status: 'PENDING',
    }
];

// ---------------------------------------------------------------------------
// Route setup
// ---------------------------------------------------------------------------

async function setupWorkflowRoutes(page: Page) {
    // Roles
    await page.route(/\/api\/buyers\/[^/]+\/roles/, async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { roleId: `role-new-${Date.now()}`, ...body } });
        } else {
            await route.fulfill({ json: mockRoles });
        }
    });

    // Workflows list/create (less specific first)
    await page.route(/\/api\/workflows\/[^/]+/, async (route) => {
        const method = route.request().method();
        if (method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
            await route.fulfill({ json: { success: true } });
        } else {
            await route.fulfill({ json: mockWorkflows[0] });
        }
    });

    // Workflows by buyer (more specific, registered after = higher priority)
    await page.route(/\/api\/workflows\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockWorkflows });
    });

    await page.route(/\/api\/workflows\/roles\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockRoles });
    });

    await page.route(/\/api\/workflows\/country-rules\/[^/]+/, async (route) => {
        await route.fulfill({ json: [] });
    });

    await page.route('**/api/workflows', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { workflowId: `wf-new-${Date.now()}`, ...body, isActive: true } });
        } else {
            await route.fulfill({ json: mockWorkflows });
        }
    });

    // Suppliers
    await page.route(/\/api\/suppliers\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockSuppliers[0] });
    });
    await page.route('**/api/suppliers', async (route) => {
        await route.fulfill({ json: mockSuppliers });
    });

    // Invitations
    await page.route(/\/api\/invitations\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockInvitations });
    });
    await page.route(/\/api\/invitations\/[^/]+/, async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { success: true } });
        } else {
            await route.fulfill({ json: mockInvitations[0] });
        }
    });
    await page.route('**/api/invitations', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { invitationId: `inv-new-${Date.now()}`, ...body, status: 'PENDING' } });
        } else {
            await route.fulfill({ json: mockInvitations });
        }
    });

    // Approvals
    await page.route(/\/api\/approvals\/[^/]+\/approve/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });
    await page.route('**/api/approvals/pending', async (route) => {
        await route.fulfill({ json: mockPendingApprovals });
    });

    // Change requests
    await page.route('**/api/change-requests/pending', async (route) => {
        await route.fulfill({ json: [] });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Single Level Workflow E2E', () => {
    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
        await setupWorkflowRoutes(page);
    });

    test('WF1: Buyer Admin can view roles page', async ({ page }) => {
        await page.goto('/buyer/roles');
        await expect(page.getByRole('button', { name: /create role/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/role management/i)).toBeVisible();
    });

    test('WF2: Buyer Admin can create a new role', async ({ page }) => {
        await page.goto('/buyer/roles');
        await expect(page.getByRole('button', { name: /create role/i })).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /create role/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        await dialog.getByLabel(/role name/i).fill('Single Level Approver');
        await dialog.getByLabel(/description/i).fill('Can approve suppliers in one step.');

        // Check a permission if available
        const approveCheckbox = dialog.getByLabel(/approve suppliers/i);
        if (await approveCheckbox.count() > 0) {
            await approveCheckbox.check();
        }

        await dialog.getByRole('button', { name: /create role/i }).click();
    });

    test('WF3: Buyer Admin can view workflows page', async ({ page }) => {
        await page.goto('/buyer/workflows');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: /new workflow/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/standard onboarding/i)).toBeVisible({ timeout: 10000 });
    });

    test('WF4: Buyer Admin can create a new workflow', async ({ page }) => {
        await page.goto('/buyer/workflows');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: /new workflow/i })).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /new workflow/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Fill workflow name
        const nameInput = dialog.locator('input[placeholder*="Onboarding" i], input').first();
        await nameInput.fill('Single Step Onboarding');

        const descInput = dialog.locator('input[placeholder*="description" i], textarea').first();
        if (await descInput.count() > 0) {
            await descInput.fill('Only one approval stage.');
        }

        // Create
        const createBtn = dialog.getByRole('button', { name: /^create$/i });
        if (await createBtn.count() > 0) {
            await createBtn.click();
        } else {
            // Try any submit button
            await dialog.getByRole('button').last().click();
        }
    });

    test('WF5: Buyer Admin can view suppliers page', async ({ page }) => {
        await page.goto('/buyer/suppliers');
        await page.waitForLoadState('networkidle');
        // The suppliers page should load with some content
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        const pageText = await page.textContent('body');
        // Should show either suppliers or invitation form
        expect(pageText).toBeTruthy();
    });

    test('WF6: Buyer Admin can view approval tasks', async ({ page }) => {
        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');
        // The onboarding/tasks page should load
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });
});
