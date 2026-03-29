import { test, expect, Page } from '@playwright/test';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';

async function loginUI(page: Page, email: string, password: string) {
    await page.goto('/auth/login');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
}

/** Get API bearer token directly from backend */
async function apiToken(email: string, password: string): Promise<string> {
    const res = await axios.post(`${API}/auth/login`, { username: email, password });
    return res.data.token as string;
}

async function createTestBuyer(adminToken: string) {
    const run = Date.now() + Math.floor(Math.random() * 1000);
    const testBuyer = {
        email: `buyeradmin_${run}@e2e.test`,
        name: `Test Buyer Org ${run}`,
        code: `TB${run}`,
        password: 'SDNtech123!',
    };

    const res = await axios.post(`${API}/api/buyers`, {
        buyerName: testBuyer.name,
        buyerCode: testBuyer.code,
        email: testBuyer.email,
        password: testBuyer.password,
        country: 'United States',
        isSandboxActive: true
    }, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    return { ...testBuyer, buyerId: res.data.buyerId };
}

test.describe('Buyer User and Role Management', () => {
    let adminToken = '';

    test.beforeAll(async () => {
        let retries = 3;
        while (retries > 0) {
            try {
                adminToken = await apiToken('admin@sdn.tech', 'Admin123!');
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        // Ensure test mode
        await axios.put(`${API}/api/config`, { key: 'TEST_MODE', value: 'true' }, { headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => { });
    });

    test('B1: Buyer Admin can create a custom role and it appears in the sandbox DevTool', async ({ page }) => {
        const testBuyer = await createTestBuyer(adminToken);
        const run = Date.now();

        await loginUI(page, testBuyer.email, testBuyer.password);
        await page.waitForTimeout(1000);
        await page.goto('/buyer/roles');

        // Create a new role
        await page.getByRole('button', { name: 'Create Role', exact: true }).first().click();
        const roleName = `Test Role ${run}`;
        await page.getByLabel('Role Name').fill(roleName);
        await page.getByLabel('Description').fill('A role created by automated E2E tests.');

        // Select "Approve Suppliers" permission ONLY
        await page.getByLabel('Approve Suppliers').check();

        // Save
        await page.getByRole('dialog').getByRole('button', { name: 'Create Role', exact: true }).click();

        // Wait for success toast
        await expect(page.getByText('Role created successfully.')).toBeVisible();

        // Verify it appears in the Sandbox DevTool dropdown
        const devToolSelect = page.getByTestId('sandbox-role-select');
        await expect(devToolSelect).toBeVisible();

        // Switch to the new role
        await devToolSelect.selectOption({ label: roleName });
        await page.waitForLoadState('networkidle');

        // Verify 'Tasks' is now visible in the sidebar (Dynamic Permission Check)
        await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible();

        // Verify route accessibility
        await page.goto('/buyer/tasks');
        await expect(page).toHaveURL(/\/buyer\/tasks/);
        await expect(page.getByText(/access denied/i)).not.toBeVisible();
    });

    test('B2: Buyer Admin can create a new user', async ({ page }) => {
        const testBuyer = await createTestBuyer(adminToken);
        const run = Date.now();

        await loginUI(page, testBuyer.email, testBuyer.password);
        await page.waitForTimeout(1000);
        await page.goto('/buyer/users');

        // Create a new user
        await page.getByRole('button', { name: 'Add User' }).click();

        // Wait for modal to be visible
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        const testEmail = `testuser_${run}@buyer.test`;
        const testName = `Test User ${run}`;

        // Using simplest possible locators for robustness in modal
        const inputs = dialog.locator('input');
        await inputs.nth(0).fill(testName);
        await inputs.nth(1).fill(testEmail);

        // SubRole select
        const roleTrigger = dialog.locator('button[role="combobox"]').first();
        await roleTrigger.click();
        await page.getByRole('option', { name: 'Admin' }).click();

        // Save
        // Wait for creation API - User
        const createUserResponse = page.waitForResponse(response =>
            response.url().includes('/api/users') && response.request().method() === 'POST'
        );
        await page.getByRole('button', { name: 'Create User' }).click();
        const response = await createUserResponse;
        expect(response.status()).toBe(200);

        // Verification - wait for UI update
        await page.getByRole('cell', { name: testName }).first().waitFor({ state: 'visible', timeout: 5000 });
        await expect(page.getByRole('cell', { name: testName }).first()).toBeVisible();
    });

    test('B3: Buyer Admin can create a new procurement circle', async ({ page }) => {
        const testBuyer = await createTestBuyer(adminToken);
        const run = Date.now();

        await loginUI(page, testBuyer.email, testBuyer.password);
        await page.waitForTimeout(2000);
        await page.goto('/buyer/circles');

        // Create a new circle
        await page.getByRole('button', { name: 'Create Circle' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.waitForTimeout(500);

        const circleName = `Test Circle ${run}`;
        const inputs = dialog.locator('input');
        await inputs.nth(0).fill(circleName);
        await inputs.nth(1).fill('Automated circle creation test.');

        // Wait for creation API - Circle
        const createCircleResponse = page.waitForResponse(response =>
            response.url().includes('/api/circles') && response.request().method() === 'POST'
        );
        await dialog.getByRole('button', { name: 'Create Circle' }).click();
        const responseCert = await createCircleResponse;
        expect(responseCert.status()).toBe(200);

        // Increased wait for table reload
        await page.waitForTimeout(1000);
        await page.getByText(circleName).first().waitFor({ state: 'visible', timeout: 5000 });
        await expect(page.getByText(circleName).first()).toBeVisible();
    });
});
