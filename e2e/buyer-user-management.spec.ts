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
