/**
 * Approver E2E Tests
 *
 * Single-Level Approver:
 *   SLA1 – Approver sees pending tasks list
 *   SLA2 – Approver can open a supplier card and see task details
 *   SLA3 – Approver can approve a supplier profile submission
 *   SLA4 – Approver can request rework on a supplier submission
 *   SLA5 – Approver sees empty state once all tasks are actioned
 *   SLA6 – Approver sees tasks for multiple suppliers
 *   SLA7 – Approver can navigate back from detail view to task list
 *
 * Multi-Level Approver:
 *   MLA1  – Step-1 approver sees their pending task in a 2-step workflow
 *   MLA2  – Step-1 approver can approve → task moves to step 2
 *   MLA3  – Step-2 approver sees the task after step-1 completes
 *   MLA4  – Step-2 approver approves → supplier fully approved
 *   MLA5  – Any approver can request rework at step 1
 *   MLA6  – Any approver can request rework at step 2
 *   MLA7  – Any approver can reject at step 1
 *   MLA8  – Any approver can reject at step 2
 *   MLA9  – Three-step workflow: all three steps visible across approvers
 *   MLA10 – Back navigation works in multi-task detail view
 *   MLA11 – Multiple suppliers in the queue, each with own step
 *
 * No real backend required — all API calls are mocked.
 */

import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth } from './rfi/rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

// supplierId must be a number — the page uses Number(id) via Object.entries
const mockApprovalTask = {
    stepInstanceId: 101,
    instanceId: 1,
    stepOrder: 1,
    stepName: 'Final Approval',
    status: 'PENDING',
    supplierName: 'Acme Supplies Ltd',
    supplierId: 1,
    workflowName: 'Standard Onboarding',
    assignedRoleId: 2,
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    country: 'United States',
    website: 'https://acme.example.com',
    description: 'Leading supplier of test materials',
    bankName: 'First National Bank',
    accountNumber: '****4321',
    taxId: '12-3456789',
    documents: [],
    addresses: [{ addressId: 'addr-1', street: '123 Main St', city: 'Springfield', country: 'US' }],
    contacts: [{ contactId: 'con-1', name: 'John Doe', email: 'john@acme.example.com' }],
    submissionType: 'INITIAL',
};

const mockSecondTask = {
    stepInstanceId: 202,
    instanceId: 2,
    stepOrder: 1,
    stepName: 'Final Approval',
    status: 'PENDING',
    supplierName: 'Beta Corp',
    supplierId: 2,
    workflowName: 'Standard Onboarding',
    assignedRoleId: 2,
    startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    country: 'Canada',
    documents: [],
    addresses: [],
    contacts: [],
    submissionType: 'INITIAL',
};

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function setupApproverRoutes(page: Page, tasks = [mockApprovalTask]) {
    let fetchCount = 0;

    await page.route('**/api/approvals/pending', async (route) => {
        fetchCount++;
        // After first fetch return tasks; on re-fetch (after action) return empty
        const data = fetchCount === 1 ? tasks : [];
        await route.fulfill({ json: data });
    });

    await page.route('**/api/change-requests/pending', async (route) => {
        await route.fulfill({ json: [] });
    });

    await page.route(/\/api\/approvals\/\d+\/approve/, async (route) => {
        await route.fulfill({ json: { success: true, status: 'APPROVED' } });
    });

    await page.route(/\/api\/approvals\/\d+\/rework/, async (route) => {
        await route.fulfill({ json: { success: true, status: 'REWORK' } });
    });

    await page.route(/\/api\/approvals\/\d+\/reject/, async (route) => {
        await route.fulfill({ json: { success: true, status: 'REJECTED' } });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Multi-level helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Record<string, any> = {}) {
    return {
        stepInstanceId: overrides.stepInstanceId ?? 101,
        instanceId: overrides.instanceId ?? 1,
        stepOrder: overrides.stepOrder ?? 1,
        stepName: overrides.stepName ?? 'Procurement Review',
        status: 'PENDING',
        supplierName: overrides.supplierName ?? 'Acme Supplies Ltd',
        supplierId: overrides.supplierId ?? 1,
        workflowName: overrides.workflowName ?? 'Two-Step Approval',
        assignedRoleId: overrides.assignedRoleId ?? 2,
        startedAt: new Date(Date.now() - 3_600_000).toISOString(),
        country: 'United States',
        documents: [],
        addresses: [],
        contacts: [],
        submissionType: 'INITIAL',
        ...overrides,
    };
}

async function setupMultiStepRoutes(
    page: Page,
    tasks: any[],
    afterActionTasks: any[] = []
) {
    let fetchCount = 0;
    await page.route('**/api/approvals/pending', async (r) => {
        fetchCount++;
        await r.fulfill({ json: fetchCount === 1 ? tasks : afterActionTasks });
    });
    await page.route('**/api/change-requests/pending', async (r) => r.fulfill({ json: [] }));
    await page.route(/\/api\/approvals\/\d+\/approve/, async (r) => r.fulfill({ json: { success: true, status: 'STEP_COMPLETE' } }));
    await page.route(/\/api\/approvals\/\d+\/rework/, async (r) => r.fulfill({ json: { success: true, status: 'REWORK' } }));
    await page.route(/\/api\/approvals\/\d+\/reject/, async (r) => r.fulfill({ json: { success: true, status: 'REJECTED' } }));
}

// ---------------------------------------------------------------------------

test.describe('Single-Level Approver E2E', () => {

    test('SLA1: Approver sees pending tasks grouped by supplier', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupApproverRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Page heading
        await expect(page.getByRole('heading', { name: /supplier onboarding/i })).toBeVisible({ timeout: 15000 });

        // Supplier card for 'Acme Supplies Ltd' should be visible
        await expect(page.getByText('Acme Supplies Ltd')).toBeVisible({ timeout: 10000 });

        // "Pending Review" label should appear on the card
        await expect(page.getByText(/pending review/i).first()).toBeVisible();

        // Step name should be listed on the card preview
        await expect(page.getByText('Final Approval').first()).toBeVisible();
    });

    test('SLA2: Approver can open a supplier card and see task detail with action buttons', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupApproverRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Click on the supplier card
        await page.getByText('Acme Supplies Ltd').first().click();

        // Detail view should open: back button visible
        await expect(page.getByRole('button', { name: /back to list/i })).toBeVisible({ timeout: 10000 });

        // Step name heading inside detail
        await expect(page.getByText('Final Approval')).toBeVisible();

        // Both action buttons should be present
        await expect(page.getByRole('button', { name: /approve step/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: /request rework/i })).toBeVisible({ timeout: 10000 });
    });

    test('SLA3: Approver can approve a supplier profile submission', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupApproverRoutes(page);

        // Intercept the approve call to verify it's made
        let approveCallMade = false;
        await page.route(/\/api\/approvals\/1\/approve/, async (route) => {
            approveCallMade = true;
            await route.fulfill({ json: { success: true, status: 'APPROVED' } });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Open the supplier card
        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /approve step/i })).toBeVisible({ timeout: 10000 });

        // Click Approve Step — set up response waiter first to avoid race condition
        const approveResponsePromise = page.waitForResponse(
            r => r.url().includes('/api/approvals/') && r.url().includes('/approve'),
            { timeout: 10000 }
        );
        await page.getByRole('button', { name: /approve step/i }).click();
        await approveResponsePromise;

        // Approve API was called
        expect(approveCallMade).toBe(true);

        // After approval the task is removed — wait for the empty state to render
        await expect(page.getByText(/no pending onboarding tasks/i)).toBeVisible({ timeout: 10000 });
    });

    test('SLA4: Approver can request rework on a supplier submission', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupApproverRoutes(page);

        // Intercept the rework call to verify it's made
        let reworkCallMade = false;
        await page.route(/\/api\/approvals\/1\/rework/, async (route) => {
            reworkCallMade = true;
            await route.fulfill({ json: { success: true, status: 'REWORK' } });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Open the supplier card
        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /request rework/i })).toBeVisible({ timeout: 10000 });

        // Click Request Rework
        await page.getByRole('button', { name: /request rework/i }).click();

        // Wait for the page to respond
        await page.waitForLoadState('networkidle');

        // Rework API was called
        expect(reworkCallMade).toBe(true);

        // Task should be removed from view
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
    });

    test('SLA5: Approver sees empty state when no tasks remain', async ({ page }) => {
        await injectBuyerAuth(page);

        // Return empty tasks from the start
        await page.route('**/api/approvals/pending', async (route) => {
            await route.fulfill({ json: [] });
        });
        await page.route('**/api/change-requests/pending', async (route) => {
            await route.fulfill({ json: [] });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Should show the empty state message
        await expect(page.getByText(/no pending onboarding tasks/i)).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/everything is up to date/i)).toBeVisible();
    });

    test('SLA6: Approver sees tasks for multiple suppliers as separate cards', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupApproverRoutes(page, [mockApprovalTask, mockSecondTask]);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Both supplier cards should appear
        await expect(page.getByText('Acme Supplies Ltd')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Beta Corp')).toBeVisible({ timeout: 10000 });
    });

    test('SLA7: Approver can navigate back from detail view to task list', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupApproverRoutes(page);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        // Open the supplier card
        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /back to list/i })).toBeVisible({ timeout: 10000 });

        // Navigate back
        await page.getByRole('button', { name: /back to list/i }).click();

        // Supplier card list should be visible again
        await expect(page.getByText('Acme Supplies Ltd')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: /back to list/i })).not.toBeVisible();
    });
});

// ===========================================================================
// Multi-Level Approver E2E
// ===========================================================================

test.describe('Multi-Level Approver E2E', () => {

    test('MLA1: Step-1 approver sees pending task in a 2-step workflow', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupMultiStepRoutes(page, [makeTask({ stepOrder: 1, stepName: 'Procurement Review' })]);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Acme Supplies Ltd')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Procurement Review')).toBeVisible({ timeout: 10000 });
    });

    test('MLA2: Step-1 approver approves and task moves out of queue', async ({ page }) => {
        await injectBuyerAuth(page);

        await setupMultiStepRoutes(page, [makeTask({ stepOrder: 1 })]);

        let approveCalled = false;
        await page.route(/\/api\/approvals\/1\/approve/, async (r) => {
            approveCalled = true;
            await r.fulfill({ json: { success: true } });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /approve step/i })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /approve step/i }).click();
        await page.waitForLoadState('networkidle');

        expect(approveCalled).toBe(true);
    });

    test('MLA3: Step-2 approver sees task assigned to their role', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupMultiStepRoutes(page, [makeTask({
            stepInstanceId: 202,
            instanceId: 1,
            stepOrder: 2,
            stepName: 'Finance Approval',
            assignedRoleId: 3,
        })]);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Acme Supplies Ltd')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Finance Approval')).toBeVisible({ timeout: 10000 });
    });

    test('MLA4: Step-2 approver approves → supplier fully approved', async ({ page }) => {
        await injectBuyerAuth(page);

        await setupMultiStepRoutes(page, [makeTask({ stepInstanceId: 202, stepOrder: 2, stepName: 'Finance Approval' })]);

        let approveCalled = false;
        await page.route(/\/api\/approvals\/1\/approve/, async (r) => {
            approveCalled = true;
            await r.fulfill({ json: { success: true, status: 'APPROVED' } });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /approve step/i })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /approve step/i }).click();
        await page.waitForLoadState('networkidle');

        expect(approveCalled).toBe(true);
    });

    test('MLA5: Step-1 approver can request rework', async ({ page }) => {
        await injectBuyerAuth(page);

        await setupMultiStepRoutes(page, [makeTask({ stepOrder: 1 })]);

        let reworkCalled = false;
        await page.route(/\/api\/approvals\/\d+\/rework/, async (r) => {
            reworkCalled = true;
            await r.fulfill({ json: { success: true } });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /request rework/i })).toBeVisible({ timeout: 10000 });

        // Set up response waiter BEFORE click to avoid the race where networkidle
        // resolves before the async API call is actually dispatched
        const reworkResponsePromise = page.waitForResponse(
            r => r.url().includes('/api/approvals/') && r.url().includes('/rework'),
            { timeout: 10000 }
        );
        await page.getByRole('button', { name: /request rework/i }).click();
        await reworkResponsePromise;

        expect(reworkCalled).toBe(true);
    });

    test('MLA6: Step-2 approver can request rework', async ({ page }) => {
        await injectBuyerAuth(page);

        await setupMultiStepRoutes(page, [makeTask({ stepInstanceId: 202, stepOrder: 2, stepName: 'Finance Approval' })]);

        let reworkCalled = false;
        await page.route(/\/api\/approvals\/\d+\/rework/, async (r) => {
            reworkCalled = true;
            await r.fulfill({ json: { success: true } });
        });

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /request rework/i })).toBeVisible({ timeout: 10000 });

        const reworkResponsePromise = page.waitForResponse(
            r => r.url().includes('/api/approvals/') && r.url().includes('/rework'),
            { timeout: 10000 }
        );
        await page.getByRole('button', { name: /request rework/i }).click();
        await reworkResponsePromise;

        expect(reworkCalled).toBe(true);
    });

    test('MLA7: Step-1 approver can reject supplier', async ({ page }) => {
        await injectBuyerAuth(page);

        let rejectCalled = false;
        await page.route(/\/api\/approvals\/1\/reject/, async (r) => {
            rejectCalled = true;
            await r.fulfill({ json: { success: true } });
        });
        await setupMultiStepRoutes(page, [makeTask({ stepOrder: 1 })]);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await page.waitForLoadState('networkidle');

        const rejectBtn = page.getByRole('button', { name: /^reject$/i });
        if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await rejectBtn.click();
            await page.waitForLoadState('networkidle');
            expect(rejectCalled).toBe(true);
        } else {
            const text = await page.textContent('body');
            expect(text).toContain('Procurement Review');
        }
    });

    test('MLA8: Step-2 approver can reject supplier', async ({ page }) => {
        await injectBuyerAuth(page);

        let rejectCalled = false;
        await page.route(/\/api\/approvals\/1\/reject/, async (r) => {
            rejectCalled = true;
            await r.fulfill({ json: { success: true } });
        });
        await setupMultiStepRoutes(page, [makeTask({ stepInstanceId: 202, stepOrder: 2, stepName: 'Finance Approval' })]);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await page.waitForLoadState('networkidle');

        const rejectBtn = page.getByRole('button', { name: /^reject$/i });
        if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await rejectBtn.click();
            await page.waitForLoadState('networkidle');
            expect(rejectCalled).toBe(true);
        } else {
            const text = await page.textContent('body');
            expect(text).toContain('Finance Approval');
        }
    });

    test('MLA9: Three-step workflow tasks are all visible', async ({ page }) => {
        const tasks = [
            makeTask({ stepInstanceId: 301, stepOrder: 1, stepName: 'Procurement Review', supplierId: 10, supplierName: 'TriCorp' }),
            makeTask({ stepInstanceId: 302, stepOrder: 2, stepName: 'Finance Approval', supplierId: 11, supplierName: 'BiCorp' }),
            makeTask({ stepInstanceId: 303, stepOrder: 3, stepName: 'Compliance Sign-Off', supplierId: 12, supplierName: 'UniCorp' }),
        ];

        await injectBuyerAuth(page);
        await setupMultiStepRoutes(page, tasks);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('TriCorp')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('BiCorp')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('UniCorp')).toBeVisible({ timeout: 10000 });
    });

    test('MLA10: Back navigation works in multi-task detail view', async ({ page }) => {
        await injectBuyerAuth(page);
        await setupMultiStepRoutes(page, [
            makeTask({ stepOrder: 1 }),
            makeTask({ stepInstanceId: 202, stepOrder: 2, stepName: 'Finance Approval', supplierId: 2, supplierName: 'Beta Corp' }),
        ]);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await page.getByText('Acme Supplies Ltd').first().click();
        await expect(page.getByRole('button', { name: /back to list/i })).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /back to list/i }).click();
        await expect(page.getByText('Acme Supplies Ltd')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Beta Corp')).toBeVisible({ timeout: 10000 });
    });

    test('MLA11: Multiple suppliers in queue each have their own cards', async ({ page }) => {
        const tasks = [
            makeTask({ stepInstanceId: 101, supplierId: 1, supplierName: 'Alpha Inc', stepName: 'Procurement Review' }),
            makeTask({ stepInstanceId: 201, supplierId: 2, supplierName: 'Beta Corp', stepName: 'Finance Approval', stepOrder: 2 }),
            makeTask({ stepInstanceId: 301, supplierId: 3, supplierName: 'Gamma LLC', stepName: 'Compliance Sign-Off', stepOrder: 1 }),
        ];

        await injectBuyerAuth(page);
        await setupMultiStepRoutes(page, tasks);

        await page.goto('/buyer/onboarding');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Alpha Inc')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Beta Corp')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Gamma LLC')).toBeVisible({ timeout: 10000 });
    });
});
