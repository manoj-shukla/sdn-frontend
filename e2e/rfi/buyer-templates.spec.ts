import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth } from './rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockTemplates = [
    {
        templateId: 'tpl-draft-1',
        name: 'Standard Vendor Assessment',
        description: 'Assessment for new vendors',
        status: 'DRAFT',
        version: 1,
        sections: [],
        createdAt: '2027-01-01T00:00:00Z',
    },
    {
        templateId: 'tpl-active-1',
        name: 'IT Security RFI',
        description: 'Information security questionnaire',
        status: 'ACTIVE',
        version: 2,
        sections: [],
        createdAt: '2027-01-15T00:00:00Z',
    },
    {
        templateId: 'tpl-archived-1',
        name: 'Old Procurement Template',
        description: 'Legacy template',
        status: 'ARCHIVED',
        version: 1,
        sections: [],
        createdAt: '2024-06-01T00:00:00Z',
    },
];

const mockNewDraftTemplate = {
    templateId: 'tpl-new-draft-99',
    name: 'IT Security RFI',
    description: 'Information security questionnaire',
    status: 'DRAFT',
    version: 3,
    sections: [],
    createdAt: '2027-03-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function setupTemplateRoutes(page: Page, overrides?: {
    templates?: any[];
    archiveResponse?: any;
    newVersionResponse?: any;
}) {
    const templates = overrides?.templates ?? mockTemplates;

    // Specific sub-resources LATER to match FIRST
    await page.route('**/api/rfi/templates/*/archive', async (route) => {
        await route.fulfill({ json: overrides?.archiveResponse ?? { success: true } });
    });

    await page.route('**/api/rfi/templates/*/new-version', async (route) => {
        await route.fulfill({ json: overrides?.newVersionResponse ?? mockNewDraftTemplate });
    });

    await page.route('**/api/rfi/templates/*/publish', async (route) => {
        await route.fulfill({ json: { success: true, status: 'ACTIVE' } });
    });

    // Detail using anchored regex
    await page.route(/\/api\/rfi\/templates\/[^/]+$/, async (route) => {
        const url = route.request().url();
        const id = url.split('/').pop()?.split('?')[0];
        const template = templates.find((t) => (t.id === id || t.templateId === id)) ?? {
            id: id,
            name: 'New Template',
            description: '',
            status: 'DRAFT',
            version: 1,
            sections: [],
        };
        await route.fulfill({ json: template });
    });

    // List/Create (Most general)
    await page.route('**/api/rfi/templates', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { id: 'tpl-new-created', name: 'New RFI Template', status: 'DRAFT', version: 1, sections: [] } });
        } else {
            // Return raw array if dashboard expects it, OR wrapped
            await route.fulfill({ json: { content: templates, totalElements: templates.length, templates: templates } });
        }
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Buyer – Template Library', () => {
    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
    });

    test('T1: Buyer can navigate to Template Library from sidebar link', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-library-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('template-library-heading')).toContainText('Template Library');
    });

    test('T2: Template Library shows existing templates', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-library-heading')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('template-card-tpl-draft-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('template-card-tpl-active-1')).toBeVisible();
        await expect(page.getByTestId('template-card-tpl-archived-1')).toBeVisible();
    });

    test('T3: Draft template shows Edit button; Active template shows New Version button', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-card-tpl-draft-1')).toBeVisible({ timeout: 15000 });

        // Open menu
        await page.getByTestId('template-action-menu-tpl-draft-1').click();

        // DRAFT → Edit button visible
        await expect(page.getByTestId('template-edit-btn-tpl-draft-1')).toBeVisible();
        
        // ACTIVE → New Version button visible
        await page.keyboard.press('Escape'); // Close menu
        await page.getByTestId('template-action-menu-tpl-active-1').click();
        await expect(page.getByTestId('template-new-version-btn-tpl-active-1')).toBeVisible();
        // ACTIVE → No "Edit" button
        await expect(page.getByTestId('template-edit-btn-tpl-active-1')).not.toBeVisible();
    });

    test('T4: ACTIVE template has no Edit button (cannot edit published template)', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-card-tpl-active-1')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('template-edit-btn-tpl-active-1')).not.toBeVisible();
        await expect(page.getByTestId('template-status-tpl-active-1')).toContainText('ACTIVE');
    });

    test('T5: Archive action changes status badge to ARCHIVED', async ({ page }) => {
        const currentTemplates = JSON.parse(JSON.stringify(mockTemplates));
        await setupTemplateRoutes(page, { templates: currentTemplates });

        // Override the archive route to update the local data
        await page.route('**/api/rfi/templates/tpl-draft-1/archive', async (route) => {
            const t = currentTemplates.find((x: any) => x.templateId === 'tpl-draft-1');
            if (t) t.status = 'ARCHIVED';
            await route.fulfill({ json: { success: true } });
        });

        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-card-tpl-draft-1')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('template-status-tpl-draft-1')).toContainText('DRAFT');
        await page.getByTestId('template-action-menu-tpl-draft-1').click();
        
        page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('template-archive-btn-tpl-draft-1').click();
        
        await expect(page.getByTestId('template-status-tpl-draft-1')).toContainText('ARCHIVED', { timeout: 10000 });
    });

    test('T6: Archive button is absent for ARCHIVED templates', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-card-tpl-archived-1')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('template-archive-btn-tpl-archived-1')).not.toBeVisible();
    });

    test('T7: New Version creates a DRAFT clone and navigates to it', async ({ page }) => {
        await setupTemplateRoutes(page, { newVersionResponse: mockNewDraftTemplate });
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('template-card-tpl-active-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('template-action-menu-tpl-active-1').click();
        await expect(page.getByTestId('template-new-version-btn-tpl-active-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('template-new-version-btn-tpl-active-1').click();
        await page.waitForURL('**/buyer/rfi/templates/tpl-new-draft-99/edit', { timeout: 10000 });
    });

    test('T8: Create Template button navigates to template editor', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates');
        await expect(page.getByTestId('create-template-btn')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('create-template-btn').click();
        await page.waitForURL('**/buyer/rfi/templates/create', { timeout: 10000 });
    });

    test('T9: Buyer can fill and publish a new template', async ({ page }) => {
        await setupTemplateRoutes(page);
        await page.goto('/buyer/rfi/templates/create');

        const nameInput = page.getByTestId('template-name-input');
        await expect(nameInput).toBeVisible({ timeout: 15000 });
        await nameInput.fill('New RFI Template');

        // Add a section
        await page.getByTestId('add-section-btn').click();
        await expect(page.getByTestId('section-name-input-0')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('section-name-input-0').fill('Company Information');

        // Add a question to the section
        await page.getByTestId('add-question-btn-0').click();
        await expect(page.getByTestId('question-text-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('question-text-input').fill('What is your company size?');

        const typeSelect = page.getByTestId('question-type-select');
        await typeSelect.click();
        await page.getByRole('option', { name: /short text/i }).click();

        // Publish directly (create mode: clicking publish saves + publishes in one step)
        await page.getByTestId('publish-template-btn').click();
        await expect(page.getByTestId('confirm-publish-btn')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('confirm-publish-btn').click();

        await page.waitForURL('**/buyer/rfi/templates', { timeout: 10000 });
    });
});
