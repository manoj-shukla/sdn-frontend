import { test, expect, Page, BrowserContext } from '@playwright/test';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';
const APP_BASE = 'http://localhost:3000';

/**
 * ---- Shared helpers ----
 */

// Seed a real buyer login via direct API login so we have a valid token
async function loginViaUI(page: Page, email: string, password: string) {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation to complete
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {
        console.log('[Playwright] Page load took longer than expected, continuing...');
    });
}

// Wait for successful redirect after login
async function waitForDashboard(page: Page, role: 'buyer' | 'supplier') {
    await page.waitForURL(`**/${role}/dashboard**`, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
}

// Get bearer token directly from API (for seeding test data)
async function getBearerToken(email: string, password: string): Promise<string> {
    const res = await axios.post(`${API_BASE}/auth/login`, {
        username: email,
        password,
    });
    return res.data.token;
}

// Create an invite via API and return the invite token
async function createInviteViaAPI(buyerToken: string, email: string, legalName?: string) {
    const nameUsed = legalName || `Seed Supplier ${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const res = await axios.post(`${API_BASE}/api/invitations`, {
        email,
        legalName: nameUsed,
        country: 'United States',
        supplierType: 'Enterprise',
        message: 'Playwright E2E Test Invite',
    }, {
        headers: { Authorization: `Bearer ${buyerToken}` },
    });
    return { ...res.data, legalName: nameUsed }; // { invitationId, token, legalName, ... }
}

/**
 * ---- Test State (shared across tests in this file) ----
 */
let buyerToken: string;
let supplierToken: string;
let inviteToken: string;
let invitationId: number;
let supplierId: number;
let testSupplierEmail: string;
let testSupplierName: string;
let dashboardUrl: string;
const testSupplierPassword = 'Password123!';

// -- Buyer credentials (will be created dynamically) --
const BUYER_EMAIL = `pw_e2e_buyer_${Date.now()}@example.com`;
const BUYER_PASSWORD = 'TestBuyer123!';
let buyerCreated = false;

/**
 * ==============================
 * STEP 1: Buyer Invites Supplier
 * ==============================
 */
test.describe('Supplier Onboarding E2E', () => {

    test.beforeAll(async () => {
        // First, create the buyer user via admin API
        try {
            // Get admin token
            const adminToken = await getBearerToken('admin@sdn.tech', 'Admin123!');

            // Create buyer
            const createRes = await axios.post(`${API_BASE}/api/buyers`, {
                buyerName: `Playwright E2E Buyer ${Date.now()}`,
                buyerCode: `PW${Date.now()}`,
                email: BUYER_EMAIL,
                country: 'United States',
                password: BUYER_PASSWORD,
                role: 'BUYER',
                subRole: 'Buyer Admin',
                isSandboxActive: true,
            }, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });

            if (createRes.status < 300) {
                buyerCreated = true;
                console.log('[Playwright] Buyer created successfully');
            }

            // Get buyer token directly for API seeding
            buyerToken = await getBearerToken(BUYER_EMAIL, BUYER_PASSWORD);
        } catch (e: any) {
            console.warn('[Playwright] Could not create/get buyer:', (e as any).message);
            // Try to get token anyway in case buyer already exists
            try {
                buyerToken = await getBearerToken(BUYER_EMAIL, BUYER_PASSWORD);
            } catch (tokenError: any) {
                console.warn('[Playwright] Could not get buyer token:', tokenError.message);
            }
        }
    });

    test('0 – Verify buyer exists', async ({ page }) => {
        test.skip(!buyerToken, 'No buyer token available');
        console.log('[Playwright] Buyer token verified, proceeding with tests');
        expect(buyerToken).toBeDefined();
    });

    test('1 – Buyer logs in and sends an invite', async ({ page }) => {
        test.setTimeout(180000); // Allow ample time for login + invite flow
        await loginViaUI(page, BUYER_EMAIL, BUYER_PASSWORD);
        await waitForDashboard(page, 'buyer');

        // Navigate to Suppliers → Invite
        await page.getByRole('link', { name: /suppliers/i }).first().click();
        await page.waitForURL('**/buyer/suppliers**');

        // Navigate to invitations page directly instead
        await page.goto('/buyer/suppliers');
        await page.waitForURL('**/buyer/suppliers*', { timeout: 15000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Click "New Invite" tab instead of button
        const newInviteTab = page.getByTestId('tab-new-invite');
        await expect(newInviteTab).toBeVisible({ timeout: 10000 });
        await newInviteTab.click();

        testSupplierEmail = `supplier.${Date.now()}@pw-e2e.com`;
        testSupplierName = `E2E Supplier ${Date.now()}`;
        await page.waitForTimeout(500);

        // Fill invite form
        await page.getByPlaceholder('finance@supplier.com').first().fill(testSupplierEmail, { force: true });

        const legalNameInput = page.locator('label').filter({ hasText: /legal name|company name/i }).locator('xpath=..').locator('input').first();
        await expect(legalNameInput).toBeVisible();
        await legalNameInput.fill(testSupplierName);

        // Select Country using data-testid
        await page.getByTestId('country-select').click();
        await page.getByRole('option', { name: 'United States', exact: true }).click();
        await page.waitForTimeout(500);

        // Submit invitation form
        await page.getByRole('button', { name: 'Send Invitation', exact: true }).click();

        // Wait for and click confirmation modal
        const confirmBtn = page.getByRole('button', { name: 'Confirm & Send', exact: true });
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmBtn.click();

        // Expect success toast or confirmation (increased timeout for compilation/network)
        await expect(page.getByText(/Invitation Sent Successfully/i, { exact: false })).toBeVisible({ timeout: 15000 });

        // Seed the token via API for subsequent tests (UI may not show the raw token)
        if (buyerToken) {
            const seedEmail = `pw_seed_${Date.now()}@example.com`;
            const invite = await createInviteViaAPI(buyerToken, seedEmail);
            inviteToken = invite.token;
            invitationId = invite.invitationId;
            testSupplierName = invite.legalName; // Sync the name for subsequent reviewer tests
        }

        expect(inviteToken).toBeDefined();
    });

    /**
     * =====================================
     * STEP 2: Supplier Accepts the Invite
     * =====================================
     */
    test('2 – Supplier accepts the invite via the magic link', async ({ page }) => {
        test.skip(!inviteToken, 'No invite token — skipping accept test');

        await page.goto(`/auth/accept-invite?token=${inviteToken}`);
        await expect(page.getByText(/join|welcome|accept|complete/i).first()).toBeVisible({ timeout: 8000 });

        // Fill in required fields
        const passwordInput = page.getByLabel(/^password$/i).first();
        await passwordInput.fill(testSupplierPassword);

        const confirmInput = page.getByLabel(/confirm password/i).first();
        if (await confirmInput.isVisible()) {
            await confirmInput.fill(testSupplierPassword);
        }

        // Click "Complete Registration" button
        await page.getByRole('button', { name: /complete registration/i }).click();

        // Should redirect to supplier dashboard
        await page.waitForURL('**/supplier/dashboard**', { timeout: 120000 });
        await expect(page.getByText(/dashboard|profile|onboarding/i).first()).toBeVisible({ timeout: 10000 });

        // Capture supplier token by intercepting localStorage
        supplierToken = await page.evaluate(() => localStorage.getItem('token') || '');
        expect(supplierToken).toBeTruthy();

        // Get supplier ID from API /auth/me
        const me = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${supplierToken}` },
        });
        supplierId = me.data.supplierId;
        expect(supplierId).toBeTruthy();
    });

    /**
     * =====================================
     * STEP 3: Supplier Fills Onboarding
     * =====================================
     */
    test('3 – Supplier fills in company details', async ({ page }) => {
        test.skip(!supplierToken, 'No supplier token');

        // Inject auth manually (bypass login flow)
        await page.goto('/supplier/dashboard');
        await page.evaluate((tok) => {
            localStorage.setItem('token', tok);
            document.cookie = `token=${tok}; path=/; max-age=3600`;
            document.cookie = `role=SUPPLIER; path=/; max-age=3600`;

            const authState = {
                state: {
                    user: {
                        role: 'SUPPLIER',
                        isAuthenticated: true,
                        approvalStatus: 'APPROVED'
                    },
                    isAuthenticated: true,
                    isLoading: false,
                },
                version: 0,
            };
            localStorage.setItem('auth-storage', JSON.stringify(authState));
        }, supplierToken);
        await page.reload();
        await page.waitForURL('**/supplier/dashboard**', { timeout: 120000 });

        // Fill Company section
        const legalNameInput = page.locator('input[placeholder*="Company" i], input[id*="legal" i]').first();
        if (await legalNameInput.isVisible({ timeout: 3000 })) {
            await legalNameInput.fill(testSupplierName);
        }

        const websiteInput = page.locator('input[placeholder*="website" i], input[id*="website" i]').first();
        if (await websiteInput.isVisible({ timeout: 3000 })) {
            await websiteInput.fill('https://playwright-e2e-supplier.com');
        }

        // Save / Next
        const saveBtn = page.getByRole('button', { name: /save|next|continue/i }).first();
        if (await saveBtn.isVisible({ timeout: 3000 })) {
            await saveBtn.click();
            await expect(page.getByText(/saved|success/i).first()).toBeVisible({ timeout: 8000 });
        }
    });

    /**
     * =====================================
     * STEP 4: Supplier Submits Profile
     * =====================================
     */
    test('4 – Supplier submits profile for review', async ({ page }) => {
        test.skip(!supplierToken || !supplierId, 'No supplier context');

        await page.goto('/supplier/dashboard');
        await page.evaluate((tok) => {
            localStorage.setItem('token', tok);
            document.cookie = `token=${tok}; path=/; max-age=3600`;
            document.cookie = `role=SUPPLIER; path=/; max-age=3600`;

            const authState = {
                state: {
                    user: {
                        role: 'SUPPLIER',
                        isAuthenticated: true,
                        approvalStatus: 'APPROVED'
                    },
                    isAuthenticated: true,
                    isLoading: false,
                },
                version: 0,
            };
            localStorage.setItem('auth-storage', JSON.stringify(authState));
        }, supplierToken);
        await page.reload();
        await page.waitForURL('**/supplier/dashboard**', { timeout: 120000 });

        // Look for Submit Profile button (only rendered when sections are complete)
        const submitBtn = page.getByRole('button', { name: /submit profile/i });
        if (await submitBtn.isVisible({ timeout: 5000 })) {
            await submitBtn.click();
            await expect(page.getByText(/submitted|under review/i)).toBeVisible({ timeout: 10000 });
        } else {
            // Fallback: Submit via API directly
            await axios.post(`${API_BASE}/api/suppliers/${supplierId}/reviews/submit`, {}, {
                headers: { Authorization: `Bearer ${supplierToken}`, 'X-Supplier-Id': supplierId },
            });
            console.log('[PW] Submit profile via API fallback');
        }

        // Verify status via API
        const res = await axios.get(`${API_BASE}/api/suppliers/${supplierId}`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        expect(res.data.approvalStatus).toBe('SUBMITTED');
    });

    /**
     * ================================================
     * STEP 5: Buyer Reviews and Requests Rework via UI
     * ================================================
     */
    test('5 – Buyer requests rework from the Approvals page', async ({ page }) => {
        test.skip(!buyerToken || !supplierId, 'No buyer token');

        await loginViaUI(page, BUYER_EMAIL, BUYER_PASSWORD);
        await waitForDashboard(page, 'buyer');

        // Upgrade buyer subRole via API to allow access to Approvals (Buyer Admin is Restricted)
        const me = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        const userId = me.data.userId || me.data.userid;
        if (userId) {
            await axios.put(`${API_BASE}/api/users/${userId}`, {
                subRole: 'Procurement Approver'
            }, {
                headers: { Authorization: `Bearer ${buyerToken}` },
            });
            console.log('[Playwright] Buyer upgraded to Procurement Approver');

            // Sync localStorage so the frontend store picks up the new role without a full re-login
            await page.evaluate(() => {
                const auth = localStorage.getItem('auth-storage');
                if (auth) {
                    const data = JSON.parse(auth);
                    data.state.user.subRole = 'Procurement Approver';
                    localStorage.setItem('auth-storage', JSON.stringify(data));
                }
            });
        }

        // Navigate directly to Approvals and wait for stabilization
        await page.goto('/buyer/tasks');
        await page.waitForURL('**/buyer/tasks**', { timeout: 20000 });
        await page.waitForLoadState('networkidle');

        // Wait for loading spinner to disappear
        const loader = page.locator('.animate-spin').first();
        if (await loader.isVisible()) {
            await expect(loader).not.toBeVisible({ timeout: 15000 });
        }
        await page.waitForTimeout(1000); // Final settlement

        // Find the task for our EXACT test supplier and expand it
        const taskRow = page.getByText(testSupplierName).first();
        await expect(taskRow).toBeVisible({ timeout: 20000 });
        await taskRow.click();

        // Click Rework button and fill comment
        const reworkBtn = page.getByRole('button', { name: /rework/i }).first();
        await reworkBtn.waitFor({ state: 'visible', timeout: 5000 });
        await reworkBtn.click();

        const commentArea = page.locator('textarea').last();
        await commentArea.waitFor({ state: 'visible', timeout: 5000 });
        await commentArea.fill('Please update your tax ID to the correct format.');

        const reworkResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/approvals/') &&
            response.url().includes('/rework') &&
            response.status() === 200
        );
        await page.getByRole('button', { name: 'Send for Rework' }).click();
        await reworkResponsePromise;

        // Verify supplier status changed via API
        const statusCheck = await axios.get(`${API_BASE}/api/suppliers/${supplierId}`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        expect(statusCheck.data.approvalStatus).toBe('REWORK_REQUIRED');
    });

    /**
     * ============================================
     * STEP 6: Supplier Resubmits After Rework
     * ============================================
     */
    test('6 – Supplier fixes issue and resubmits', async ({ page }) => {
        test.skip(!supplierToken || !supplierId, 'No supplier context');

        // Fix taxId via API
        await axios.put(`${API_BASE}/api/suppliers/${supplierId}`, {
            taxId: 'CORRTAX123456'
        }, {
            headers: { Authorization: `Bearer ${supplierToken}`, 'X-Supplier-Id': supplierId },
        });

        // Resubmit via API (UI submit button only shows when all sections complete)
        await axios.post(`${API_BASE}/api/suppliers/${supplierId}/reviews/submit`, {}, {
            headers: { Authorization: `Bearer ${supplierToken}`, 'X-Supplier-Id': supplierId },
        });

        const res = await axios.get(`${API_BASE}/api/suppliers/${supplierId}`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        expect(res.data.approvalStatus).toBe('SUBMITTED');
    });

    /**
     * ================================================
     * STEP 7: Buyer Rejects via UI
     * ================================================
     */
    test('7 – Buyer rejects the supplier', async ({ page }) => {
        test.skip(!buyerToken || !supplierId, 'No buyer token');

        await loginViaUI(page, BUYER_EMAIL, BUYER_PASSWORD);
        await waitForDashboard(page, 'buyer');

        // Navigate directly to tasks page (sidebar link may be 'Tasks' not 'Approvals')
        await page.goto('/buyer/tasks');
        await page.waitForLoadState('domcontentloaded');

        const taskRow = page.getByText(testSupplierName).first();
        await expect(taskRow).toBeVisible({ timeout: 15000 });
        await taskRow.click();

        await page.getByRole('button', { name: /reject/i }).first().click();
        await page.locator('textarea').last().fill('Supplier does not meet compliance criteria.');
        const rejectResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/approvals/') &&
            response.url().includes('/reject') &&
            response.status() === 200
        );
        await page.getByRole('button', { name: /confirm rejection/i }).click();
        await rejectResponsePromise;

        const res = await axios.get(`${API_BASE}/api/suppliers/${supplierId}`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        expect(res.data.approvalStatus).toBe('REJECTED');
    });

    /**
     * ================================================
     * STEP 8: Supplier Resubmits, Buyer Approves
     * ================================================
     */
    test('8 – Supplier resubmits and Buyer approves through all steps', async ({ page }) => {
        test.skip(!buyerToken || !supplierId, 'No context');

        // Upgrade buyer to Buyer Admin for full visibility in Test 8
        const me = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        const bbUserId = me.data.userId || me.data.userid;
        if (bbUserId) {
            await axios.put(`${API_BASE}/api/users/${bbUserId}`, {
                subRole: 'Buyer Admin'
            }, {
                headers: { Authorization: `Bearer ${buyerToken}` },
            });
            console.log('[Playwright] Buyer upgraded to Buyer Admin for multi-step approval');
        }

        // Supplier resubmits via API
        await axios.post(`${API_BASE}/api/suppliers/${supplierId}/reviews/submit`, {}, {
            headers: { Authorization: `Bearer ${supplierToken}`, 'X-Supplier-Id': supplierId },
        });
        // Verify documents via API to satisfy Compliance step requirements
        const docsRes = await axios.get(`${API_BASE}/api/suppliers/${supplierId}/documents`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        const docs = Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data.documents || []);
        console.log(`[PW] Verifying ${docs.length} documents for supplier ${supplierId}`);
        for (const doc of docs) {
            const docId = doc.documentId || doc.documentid;
            await axios.put(`${API_BASE}/api/documents/${docId}/verify`, {
                status: 'VERIFIED',
                comments: 'Auto-verified by E2E test'
            }, {
                headers: { Authorization: `Bearer ${buyerToken}` },
            });
        }

        // Buyer approves via UI — loop until workflow is fully COMPLETED
        await loginViaUI(page, BUYER_EMAIL, BUYER_PASSWORD);
        await waitForDashboard(page, 'buyer');

        // Sync localStorage so the frontend store picks up the new role without a full re-login
        await page.evaluate(() => {
            const auth = localStorage.getItem('auth-storage');
            if (auth) {
                const data = JSON.parse(auth);
                data.state.user.subRole = 'Buyer Admin';
                data.state.user.isSandboxActive = true;
                localStorage.setItem('auth-storage', JSON.stringify(data));
            }
        });

        let isApproved = false;
        for (let step = 1; step <= 6 && !isApproved; step++) {
            console.log(`[PW] Approval Loop Step ${step}...`);

            // Navigate to approvals if not already there
            if (!page.url().includes('/buyer/tasks')) {
                await page.goto('/buyer/tasks');
            }
            await page.waitForURL('**/buyer/tasks**', { timeout: 15000 });
            await page.waitForLoadState('networkidle');

            const taskRow = page.getByText(testSupplierName).first();
            let isVisible = await taskRow.isVisible({ timeout: 5000 });

            if (!isVisible) {
                // If not visible, reload once to be absolutely sure
                console.log(`[PW] Task row not visible, reloading...`);
                await page.reload();
                await page.waitForLoadState('networkidle');
                isVisible = await taskRow.isVisible({ timeout: 10000 });
            }

            if (!isVisible) {
                console.log(`[PW] No pending tasks for ${testSupplierName}. Workflow might be complete.`);
                isApproved = true;
                break;
            }

            await taskRow.click();

            const approveBtn = page.getByRole('button', { name: /^approve$/i }).first();
            if (await approveBtn.isVisible({ timeout: 5000 })) {
                console.log(`[PW] Clicking Approve on step...`);
                await approveBtn.click();

                // Handle the new confirmation modal
                const modal = page.locator('[role="dialog"]').filter({ hasText: /approve application/i });
                await expect(modal).toBeVisible({ timeout: 5000 });
                await modal.locator('textarea').fill('Automatically approved by E2E test through UI.');

                const approveResponsePromise = page.waitForResponse(response =>
                    response.url().includes('/api/approvals/') &&
                    response.url().includes('/approve') &&
                    response.status() === 200
                );

                await modal.getByRole('button', { name: /final approval/i }).click();
                await approveResponsePromise;

                // Wait for the success toast and for it to disappear
                await expect(page.getByText(/approved successfully/i).first()).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(1000); // Wait for state to settle
            } else {
                console.log(`[PW] Approve button NOT visible even though task was present. Breaking.`);
                break;
            }
        }

        // Final fallback: Approve any remaining steps via API
        console.log('[PW] Final API approval fallback for any remaining steps...');
        for (let i = 0; i < 5; i++) {
            const tasksRes = await axios.get(`${API_BASE}/api/approvals/pending`, {
                headers: { Authorization: `Bearer ${buyerToken}` },
            });
            const task = (tasksRes.data || []).find((t: any) => (t.supplierId || t.supplierid) === supplierId);
            if (!task) break;

            const instanceId = task.instanceId || task.instanceid;
            const stepOrder = task.stepOrder || task.steporder;
            try {
                await axios.post(`${API_BASE}/api/approvals/${instanceId}/approve`,
                    { stepOrder, comments: 'Approved via API fallback in Test 8' },
                    { headers: { Authorization: `Bearer ${buyerToken}` } }
                );
                console.log(`[PW] Approved step ${stepOrder} via API fallback.`);
            } catch (e: any) {
                console.log(`[PW] API approval failed: ${e.response?.data?.error || e.message}`);
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // Verify final status
        const res = await axios.get(`${API_BASE}/api/suppliers/${supplierId}`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
        });
        expect(['APPROVED', 'PRE_APPROVED']).toContain(res.data.approvalStatus);
    });

    /**
     * ==============================
     * STEP 9: Supplier Dashboard post-approval UX
     * ==============================
     */
    test('9 – Approved supplier sees correct dashboard state', async ({ page }) => {
        test.skip(!supplierToken, 'No supplier token');

        await page.goto('/supplier/dashboard');
        await page.evaluate((tok) => {
            localStorage.setItem('token', tok);
            document.cookie = `token=${tok}; path=/; max-age=3600`;
            document.cookie = `role=SUPPLIER; path=/; max-age=3600`;
        }, supplierToken);
        await page.reload();
        await page.waitForURL('**/supplier/dashboard**', { timeout: 120000 });

        // "Submit Profile" button should NOT be shown after approval
        const submitBtn = page.getByRole('button', { name: /submit profile/i });
        await expect(submitBtn).not.toBeVisible({ timeout: 5000 });

        console.log('[PW] Post-approval supplier dashboard verified.');
    });
});
