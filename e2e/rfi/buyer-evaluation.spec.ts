import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth } from './rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const EVENT_ID = 'evt-closed-1';

const mockClosedEvent = {
    rfiId: EVENT_ID,
    title: 'IT Security Assessment 2025',
    description: 'Annual IT security RFI',
    templateId: 'tpl-active-1',
    templateName: 'IT Security RFI',
    status: 'CLOSED',
    deadline: '2025-04-01T00:00:00Z',
    createdAt: '2025-02-15T00:00:00Z',
};

const mockEvaluationData = {
    sections: [
        {
            title: 'Security & Compliance',
            questions: [
                {
                    templateQuestionId: 101,
                    questionId: 'q-1',
                    isMandatory: true,
                    promoteToRfp: false,
                    orderIndex: 0,
                    question: {
                        questionId: 'q-1',
                        text: 'Describe your security practices',
                        questionType: 'SHORT_TEXT',
                        isMandatory: true,
                        promoteToRfp: false,
                        createdAt: new Date().toISOString()
                    }
                },
                {
                    templateQuestionId: 102,
                    questionId: 'q-2',
                    isMandatory: false,
                    promoteToRfp: false,
                    orderIndex: 1,
                    question: {
                        questionId: 'q-2',
                        text: 'Last audit date',
                        questionType: 'SHORT_TEXT',
                        isMandatory: false,
                        promoteToRfp: false,
                        createdAt: new Date().toISOString()
                    }
                },
                {
                    templateQuestionId: 103,
                    questionId: 'q-3',
                    isMandatory: false,
                    promoteToRfp: false,
                    orderIndex: 2,
                    question: {
                        questionId: 'q-3',
                        text: 'ISO 27001 Certified?',
                        questionType: 'YES_NO',
                        isMandatory: false,
                        promoteToRfp: false,
                        createdAt: new Date().toISOString()
                    }
                }
            ]
        }
    ],
    suppliers: [
        {
            supplierId: 'sup-1',
            invitationId: 'inv-1',
            supplierName: 'Acme Corp',
            status: 'SUBMITTED',
            notes: [],
            answers: [
                { questionId: 'q-1', value: { text: 'We follow NIST framework and conduct quarterly audits.' } },
                { questionId: 'q-2', value: { bool: true } },
                { questionId: 'q-3', value: { attachments: [{ fileName: 'security-policy.pdf' }] } },
            ],
        },
        {
            supplierId: 'sup-2',
            invitationId: 'inv-2',
            supplierName: 'TechVendor Ltd',
            status: 'SUBMITTED',
            notes: [],
            answers: [
                { questionId: 'q-1', value: { text: 'We use industry-standard security practices.' } },
                { questionId: 'q-2', value: { bool: false } },
                { questionId: 'q-3', value: { attachments: [] } },
            ],
        },
    ],
};

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function setupEvaluationRoutes(page: Page) {
    // Note: Playwright matches in REVERSE order of registration for overlapping routes.
    // Register general ones FIRST, then specific ones to override.
    
    // 1. General Event Detail
    await page.route(/\/api\/rfi\/events\/[^/]+$/, async (route) => {
        await route.fulfill({ json: mockClosedEvent });
    });

    // 2. Evaluation Data
    await page.route(/\/api\/rfi\/events\/[^/]+\/evaluation$/, async (route) => {
        await route.fulfill({ json: mockEvaluationData });
    });

    // 3. Evaluation Status/Notes/Clarification (More specific)
    await page.route('**/api/rfi/events/*/evaluation/*/notes', async (route) => {
        await route.fulfill({ json: { success: true } });
    });
    await page.route('**/api/rfi/events/*/evaluation/*/clarification', async (route) => {
        await route.fulfill({ json: { success: true } });
    });
    await page.route('**/api/rfi/events/*/evaluation/*/status', async (route) => {
        await route.fulfill({ json: { success: true } });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Buyer – Evaluation Workspace', () => {
    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
        await setupEvaluationRoutes(page);
    });

    test('EV1: Buyer can open evaluation page for a CLOSED RFI', async ({ page }) => {
        await page.goto(`/buyer/rfi/${EVENT_ID}/evaluation`);
        await expect(page.getByTestId('evaluation-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('evaluation-heading')).toContainText('Evaluation');
    });

    test('EV2: Comparison matrix renders with supplier columns and question rows', async ({ page }) => {
        await page.goto(`/buyer/rfi/${EVENT_ID}/evaluation`);
        await expect(page.getByTestId('comparison-matrix')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('supplier-column-sup-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('supplier-column-sup-2')).toBeVisible();
        await expect(page.getByTestId('question-row-q-1')).toBeVisible();
        await expect(page.getByTestId('question-row-q-2')).toBeVisible();
        await expect(page.getByTestId('question-row-q-3')).toBeVisible();
    });

    test('EV3: Clicking a supplier column opens the full response sidebar', async ({ page }) => {
        await page.goto(`/buyer/rfi/${EVENT_ID}/evaluation`);
        await expect(page.getByTestId('supplier-column-sup-1')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('response-sidebar')).not.toBeVisible();
        await page.getByTestId('supplier-column-sup-1').click();
        await expect(page.getByTestId('response-sidebar')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('close-sidebar-btn').click();
        await expect(page.getByTestId('response-sidebar')).not.toBeVisible({ timeout: 5000 });
    });

    test('EV4: Buyer can change supplier status (Shortlist)', async ({ page }) => {
        await page.goto(`/buyer/rfi/${EVENT_ID}/evaluation`);
        await page.getByTestId('supplier-column-sup-1').click();
        await expect(page.getByTestId('supplier-status-select-sup-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('supplier-status-select-sup-1').click();
        await page.getByRole('option', { name: /shortlisted/i }).click();
        await expect(page.getByTestId('supplier-status-select-sup-1')).toBeVisible();
    });

    test('EV5: Buyer can add internal note to a supplier', async ({ page }) => {
        await page.goto(`/buyer/rfi/${EVENT_ID}/evaluation`);
        await page.getByTestId('supplier-column-sup-1').click();
        await expect(page.getByTestId('add-note-btn-sup-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('add-note-btn-sup-1').click();
        await expect(page.getByTestId('note-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('note-input').fill('This supplier has strong security practices.');
        await page.getByTestId('save-note-btn').click();
        await expect(page.getByTestId('note-input')).not.toBeVisible({ timeout: 5000 });
    });

    test('EV6: Buyer can request clarification from a supplier', async ({ page }) => {
        await page.goto(`/buyer/rfi/${EVENT_ID}/evaluation`);
        await page.getByTestId('supplier-column-sup-1').click();
        await expect(page.getByTestId('request-clarification-btn-sup-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('request-clarification-btn-sup-1').click();
        await expect(page.getByTestId('clarification-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('clarification-input').fill('Please clarify your ISO 27001 certification status.');
        await page.getByTestId('send-clarification-btn').click();
        await expect(page.getByTestId('clarification-input')).not.toBeVisible({ timeout: 5000 });
    });
});
