import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth, setupGlobalMocks } from './rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockQuestions = [
    {
        questionId: 'lib-q-1',
        text: 'What is your annual revenue?',
        questionType: 'SHORT_TEXT',
        category: 'Financial',
        isMandatory: false,
        options: [],
        isDeleted: false,
    },
    {
        questionId: 'lib-q-2',
        text: 'Are you ISO 27001 certified?',
        questionType: 'YES_NO',
        category: 'Compliance',
        isMandatory: true,
        options: [],
        isDeleted: false,
    },
    {
        questionId: 'lib-q-3',
        text: 'What is your primary industry?',
        questionType: 'SINGLE_SELECT',
        category: 'General',
        isMandatory: false,
        options: [
            { value: 'Technology', label: 'Technology' },
            { value: 'Manufacturing', label: 'Manufacturing' },
            { value: 'Healthcare', label: 'Healthcare' },
            { value: 'Retail', label: 'Retail' }
        ],
        isDeleted: false,
    },
    {
        questionId: 'lib-q-4',
        text: 'Upload your financial statements.',
        questionType: 'ATTACHMENT',
        category: 'Financial',
        isMandatory: false,
        options: [],
        isDeleted: false,
    },
    {
        questionId: 'lib-q-5',
        text: 'Describe your quality management process.',
        questionType: 'SHORT_TEXT',
        category: 'Operations',
        isMandatory: false,
        options: [],
        isDeleted: false,
    },
];

// ---------------------------------------------------------------------------
// Route setup
// ---------------------------------------------------------------------------

async function setupQuestionRoutes(page: Page, questions = mockQuestions) {
    await page.route(/\/api\/rfi\/questions\/[^/?]+$/, async (route) => {
        const method = route.request().method();
        const url = route.request().url();
        const id = url.split('/').pop()?.split('?')[0] ?? '';
        
        if (method === 'PUT') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            const existing = questions.find(q => q.questionId === id) ?? questions[0];
            await route.fulfill({ json: { ...existing, ...body } });
        } else if (method === 'DELETE') {
            await route.fulfill({ json: { success: true } });
        } else {
            const q = questions.find(q => q.questionId === id) ?? questions[0];
            await route.fulfill({ json: q });
        }
    });

    await page.route(/\/api\/rfi\/questions/, async (route) => {
        const method = route.request().method();
        if (method === 'POST') {
            const body = JSON.parse(route.request().postData() ?? '{}');
            await route.fulfill({ json: { questionId: `lib-q-new-${Date.now()}`, ...body } });
        } else {
            await route.fulfill({ json: questions });
        }
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Buyer – Question Library', () => {
    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
    });

    test('QL1: Buyer can view question library', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await expect(page.getByTestId('question-library-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('question-library-heading')).toContainText('Question Library');

        await expect(page.getByTestId('question-row-lib-q-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('question-row-lib-q-2')).toBeVisible();
        await expect(page.getByTestId('question-row-lib-q-3')).toBeVisible();
        await expect(page.getByTestId('question-row-lib-q-4')).toBeVisible();
        await expect(page.getByTestId('question-row-lib-q-5')).toBeVisible();
    });

    test('QL2: Can filter by category tag', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await expect(page.getByTestId('question-row-lib-q-1')).toBeVisible({ timeout: 15000 });

        // Filter by Financial
        const categoryFilter = page.getByTestId('category-filter');
        await categoryFilter.click();
        await page.getByRole('option', { name: 'Financial' }).click();

        await expect(page.getByTestId('question-row-lib-q-1')).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('question-row-lib-q-4')).toBeVisible();
        await expect(page.getByTestId('question-row-lib-q-2')).not.toBeVisible();
        await expect(page.getByTestId('question-row-lib-q-3')).not.toBeVisible();
        await expect(page.getByTestId('question-row-lib-q-5')).not.toBeVisible();
    });

    test('QL3: Can add a new SHORT_TEXT question', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await expect(page.getByTestId('add-question-btn')).toBeVisible({ timeout: 15000 });
        await page.getByTestId('add-question-btn').click();

        await expect(page.getByTestId('question-text-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('question-text-input').fill('What is your company headquarters location?');
        await page.getByTestId('question-type-select').click();
        await page.getByRole('option', { name: /short text/i }).click();
        
        await page.getByTestId('question-category-input').click();
        await page.getByRole('option', { name: 'General' }).click();
        
        await page.getByTestId('save-question-btn').click();

        await expect(page.getByTestId('question-text-input')).not.toBeVisible({ timeout: 5000 });
    });

    test('QL4: Can add a YES_NO question', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await page.getByTestId('add-question-btn').click();
        await expect(page.getByTestId('question-text-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('question-text-input').fill('Do you have liability insurance?');
        await page.getByTestId('question-type-select').click();
        await page.getByRole('option', { name: 'Yes / No' }).click();
        
        await page.getByTestId('question-category-input').click();
        await page.getByRole('option', { name: 'Legal' }).click();
        
        await page.getByTestId('question-mandatory-checkbox').click();
        await page.getByTestId('save-question-btn').click();
        await expect(page.getByTestId('question-text-input')).not.toBeVisible({ timeout: 5000 });
    });

    test('QL5: Can add a SINGLE_SELECT question', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await page.getByTestId('add-question-btn').click();
        await expect(page.getByTestId('question-text-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('question-text-input').fill('What is your business size?');
        await page.getByTestId('question-type-select').click();
        await page.getByRole('option', { name: 'Single Select' }).click();
        
        await page.getByTestId('question-category-input').click();
        await page.getByRole('option', { name: 'General' }).click();
        
        await page.getByTestId('save-question-btn').click();
        await expect(page.getByTestId('question-text-input')).not.toBeVisible({ timeout: 5000 });
    });

    test('QL6: Can add an ATTACHMENT question', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await page.getByTestId('add-question-btn').click();
        await expect(page.getByTestId('question-text-input')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('question-text-input').fill('Upload your quality certification.');
        await page.getByTestId('question-type-select').click();
        await page.getByRole('option', { name: 'File Attachment' }).click();
        
        await page.getByTestId('question-category-input').click();
        await page.getByRole('option', { name: 'Compliance' }).click();
        
        await page.getByTestId('save-question-btn').click();
        await expect(page.getByTestId('question-text-input')).not.toBeVisible({ timeout: 5000 });
    });

    test('QL7: Can edit an existing question', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await expect(page.getByTestId('question-row-lib-q-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('question-edit-btn-lib-q-1').click();
        await expect(page.getByTestId('question-text-input')).toBeVisible({ timeout: 5000 });

        const inputValue = await page.getByTestId('question-text-input').inputValue();
        expect(inputValue).toContain('annual revenue');

        await page.getByTestId('question-text-input').clear();
        await page.getByTestId('question-text-input').fill('What is your company annual revenue?');
        await page.getByTestId('save-question-btn').click();
        await expect(page.getByTestId('question-text-input')).not.toBeVisible({ timeout: 5000 });
    });

    test("QL8: Soft delete removes question from list", async ({ page }) => {
        let deleteCallMade = false;
        let questions = [...mockQuestions];

        await page.route(/\/api\/rfi\/questions\/lib-q-5$/, async (route) => {
            if (route.request().method() === 'DELETE') {
                deleteCallMade = true;
                questions = questions.filter(q => q.questionId !== 'lib-q-5');
                await route.fulfill({ json: { success: true } });
            } else {
                await route.fulfill({ json: questions.find(q => q.questionId === 'lib-q-5') });
            }
        });
        await page.route(/\/api\/rfi\/questions$/, async (route) => {
            await route.fulfill({ json: questions });
        });

        await page.goto('/buyer/rfi/questions');
        await expect(page.getByTestId('question-row-lib-q-5')).toBeVisible({ timeout: 15000 });

        page.once('dialog', d => d.accept());
        await page.getByTestId('question-delete-btn-lib-q-5').click();
        
        await expect(page.getByTestId('question-row-lib-q-5')).not.toBeVisible({ timeout: 5000 });
        expect(deleteCallMade).toBe(true);
    });

    test('QL9: Type badge shows correct question type', async ({ page }) => {
        await setupQuestionRoutes(page);
        await page.goto('/buyer/rfi/questions');
        await expect(page.getByTestId('question-row-lib-q-1')).toBeVisible({ timeout: 15000 });

        await expect(page.getByTestId('question-type-badge-lib-q-1')).toContainText('SHORT TEXT');
        await expect(page.getByTestId('question-type-badge-lib-q-2')).toContainText('YES NO');
        await expect(page.getByTestId('question-type-badge-lib-q-3')).toContainText('SINGLE SELECT');
        await expect(page.getByTestId('question-type-badge-lib-q-4')).toContainText('ATTACHMENT');
    });
});
