import { test, expect, Page } from '@playwright/test';
import { injectSupplierAuth, setupGlobalMocks } from './rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

const mockInvitations = [
    {
        invitationId: 'inv-1',
        rfiId: 'evt-open-1',
        rfiTitle: 'IT Security Assessment 2025',
        buyerName: 'Global Corp',
        deadline: '2025-05-01T00:00:00Z',
        status: 'INVITED',
        submittedAt: null,
    },
    {
        invitationId: 'inv-2',
        rfiId: 'evt-open-2',
        rfiTitle: 'Vendor Qualification RFI',
        buyerName: 'Acme Procurement',
        deadline: '2025-06-15T00:00:00Z',
        status: 'SUBMITTED',
        submittedAt: '2025-04-10T00:00:00Z',
    },
];

function buildMockInvitationDetail(overrides?: {
    status?: 'INVITED' | 'SUBMITTED';
    supplierCountry?: string;
    isCrossBorder?: boolean;
    savedAnswers?: { questionId: string; value: any }[];
}) {
    return {
        invitationId: 'inv-1',
        rfiId: 'evt-open-1',
        title: 'IT Security Assessment 2025',
        buyerName: 'Global Corp',
        deadline: '2027-05-01T00:00:00Z',
        status: overrides?.status ?? 'INVITED',
        submittedAt: overrides?.status === 'SUBMITTED' ? '2025-04-10T00:00:00Z' : null,
        supplierCountry: overrides?.supplierCountry ?? 'United States',
        isCrossBorder: overrides?.isCrossBorder ?? false,
        template: {
            sections: [
                {
                    sectionId: 'sec-1',
                    title: 'Company Overview',
                    questions: [
                        {
                            templateQuestionId: 1,
                            questionId: 'q-text-1',
                            isMandatory: true,
                            question: {
                                questionId: 'q-text-1',
                                text: 'Describe your company in one paragraph.',
                                questionType: 'SHORT_TEXT',
                                isMandatory: true,
                            }
                        },
                        {
                            templateQuestionId: 2,
                            questionId: 'q-yn-1',
                            isMandatory: true,
                            question: {
                                questionId: 'q-yn-1',
                                text: 'Are you ISO 9001 certified?',
                                questionType: 'YES_NO',
                                isMandatory: true,
                            }
                        },
                        {
                            templateQuestionId: 3,
                            questionId: 'q-conditional-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-conditional-1',
                                text: 'Please provide your ISO 9001 certificate number.',
                                questionType: 'SHORT_TEXT',
                                isMandatory: false,
                            }
                        },
                    ],
                },
                {
                    sectionId: 'sec-2',
                    title: 'Technical Capabilities',
                    questions: [
                        {
                            templateQuestionId: 4,
                            questionId: 'q-select-1',
                            isMandatory: true,
                            question: {
                                questionId: 'q-select-1',
                                text: 'What is your primary service type?',
                                questionType: 'SINGLE_SELECT',
                                isMandatory: true,
                                options: [
                                    { value: 'Software', label: 'Software' },
                                    { value: 'Hardware', label: 'Hardware' },
                                    { value: 'Consulting', label: 'Consulting' },
                                    { value: 'Services', label: 'Services' }
                                ]
                            }
                        },
                        {
                            templateQuestionId: 5,
                            questionId: 'q-attach-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-attach-1',
                                text: 'Upload your company profile document.',
                                questionType: 'ATTACHMENT',
                                isMandatory: false,
                            }
                        },
                    ],
                },
            ],
        },
        answers: overrides?.savedAnswers ?? [],
    };
}

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function setupInvitationDetailRoutes(page: Page, invitation: any) {
    await page.route(/\/api\/rfi\/events\/[^/]+$/, async (route) => {
        await route.fulfill({ json: invitation });
    });
    
    await page.route(/\/api\/rfi\/rules\/[^/]+\/evaluate$/, async (route) => {
        const body = JSON.parse(route.request().postData() ?? '{}');
        const answers = body.answers ?? [];
        const isCertified = answers.find((a: any) => a.questionId === 'q-yn-1')?.value?.selected === 'YES';
        
        const visibleIds = ['q-text-1', 'q-yn-1', 'q-select-1', 'q-attach-1'];
        if (isCertified) visibleIds.push('q-conditional-1');
        
        await route.fulfill({ json: { visibleQuestionIds: visibleIds } });
    });

    await page.route(/\/api\/rfi\/responses\/[^/]+\/progress$/, async (route) => {
        await route.fulfill({ json: { percentComplete: 40, answered: 2, totalRequired: 5 } });
    });

    await page.route(/\/api\/rfi\/responses\/[^/]+$/, async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({ json: { answers: invitation.answers, status: invitation.status } });
        } else {
            await route.fulfill({ json: { success: true } });
        }
    });

    await page.route(/\/api\/rfi\/responses\/[^/]+\/draft$/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });

    await page.route(/\/api\/rfi\/responses\/[^/]+\/submit$/, async (route) => {
        await route.fulfill({ json: { success: true } });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Supplier – RFI Response Flow', () => {
    test.beforeEach(async ({ page }) => {
        await setupGlobalMocks(page);
        await injectSupplierAuth(page);
    });

    test('SR1: Supplier can see RFI in their inbox', async ({ page }) => {
        await page.route(/\/api\/rfi\/invitations$/, async (route) => {
            await route.fulfill({ json: mockInvitations });
        });

        await page.goto('/supplier/rfi');
        await expect(page.getByTestId('rfi-inbox-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('rfi-invitation-row-inv-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('rfi-invitation-row-inv-2')).toBeVisible();
    });

    test('SR2: Opening RFI shows the questionnaire with sections in sidebar', async ({ page }) => {
        const inv = buildMockInvitationDetail();
        await setupInvitationDetailRoutes(page, inv);

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('section-nav-sec-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('section-nav-sec-2')).toBeVisible();
    });

    test('SR3: Answering YES/NO triggers conditional show/hide of follow-up', async ({ page }) => {
        const inv = buildMockInvitationDetail();
        await setupInvitationDetailRoutes(page, inv);

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('question-q-yn-1')).toBeVisible({ timeout: 15000 });

        // Conditional not visible initially
        await expect(page.getByTestId('question-q-conditional-1')).not.toBeVisible();

        // Answer YES → conditional appears
        await page.getByTestId('yes-no-q-yn-1-yes').click();
        await expect(page.getByTestId('question-q-conditional-1')).toBeVisible({ timeout: 10000 });

        // Answer NO → conditional hides
        await page.getByTestId('yes-no-q-yn-1-no').click();
        await expect(page.getByTestId('question-q-conditional-1')).not.toBeVisible({ timeout: 10000 });
    });

    test('SR4: Progress bar updates as questions are answered', async ({ page }) => {
        const inv = buildMockInvitationDetail();
        await setupInvitationDetailRoutes(page, inv);

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('progress-text')).toBeVisible({ timeout: 15000 });

        const initialText = await page.getByTestId('progress-text').textContent();

        // Answer one question
        await page.getByTestId('question-answer-q-text-1').fill('We are a leading technology company.');
        
        // Wait for debounce and local state update
        await expect(async () => {
            const updatedText = await page.getByTestId('progress-text').textContent();
            expect(updatedText).not.toEqual(initialText);
        }).toPass({ timeout: 5000 });
    });

    test('SR5: Draft auto-saves (network call made after input)', async ({ page }) => {
        const inv = buildMockInvitationDetail();
        let autoSaveCallMade = false;

        await setupInvitationDetailRoutes(page, inv);
        await page.route(/\/api\/rfi\/responses\/[^/]+\/draft$/, async (route) => {
            autoSaveCallMade = true;
            await route.fulfill({ json: { success: true } });
        });

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('question-answer-q-text-1')).toBeVisible({ timeout: 15000 });

        await page.getByTestId('question-answer-q-text-1').fill('This is my company description for auto-save testing.');
        
        // Wait for debounce (1200ms) + buffer
        await expect(async () => {
            expect(autoSaveCallMade).toBe(true);
        }).toPass({ timeout: 5000 });
    });

    test('SR6: Mandatory field validation prevents submit (shows inline errors)', async ({ page }) => {
        const inv = buildMockInvitationDetail();
        await setupInvitationDetailRoutes(page, inv);

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('submit-btn')).toBeVisible({ timeout: 15000 });

        // Submit without filling mandatory fields
        await page.getByTestId('submit-btn').click();

        // Confirmation dialog
        await expect(page.getByTestId('confirm-submit-btn')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('confirm-submit-btn').click();

        // Should show "required" error in the toast or on fields
        await expect(page.getByText('This question is required.').first()).toBeVisible({ timeout: 5000 });
    });

    test('SR7: Valid submission succeeds and shows confirmation', async ({ page }) => {
        const inv = buildMockInvitationDetail();
        await setupInvitationDetailRoutes(page, inv);

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('question-answer-q-text-1')).toBeVisible({ timeout: 15000 });

        // Fill mandatory questions in Sec 1
        await page.getByTestId('question-answer-q-text-1').fill('We are a leading technology company with 500+ employees.');
        await page.getByTestId('yes-no-q-yn-1-yes').click();
        
        // Go to Next Section (Sec 2)
        await page.getByTestId('next-section-btn').click();

        // Fill mandatory questions in Sec 2
        await page.getByTestId('question-answer-q-select-1').click();
        await page.getByRole('option', { name: 'Software' }).click();

        await page.getByTestId('submit-btn').click();
        await expect(page.getByTestId('confirm-submit-btn')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('confirm-submit-btn').click();
        
        await expect(page.getByTestId('submission-success')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('submission-success')).toContainText(/submitted/i);
    });

    test('SR8: Submitted RFI shows as read-only', async ({ page }) => {
        const inv = buildMockInvitationDetail({
            status: 'SUBMITTED',
            savedAnswers: [
                { questionId: 'q-text-1', value: { text: 'We are a leading technology company.' } },
                { questionId: 'q-yn-1', value: { selected: 'YES' } },
                { questionId: 'q-select-1', value: { selected: 'Software' } },
            ],
        });
        await setupInvitationDetailRoutes(page, inv);

        await page.goto('/supplier/rfi/inv-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });

        // Action buttons not visible for submitted
        await expect(page.getByTestId('submit-btn')).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('save-draft-btn')).not.toBeVisible();

        // Confirmation shown
        await expect(page.getByTestId('submission-success')).toBeVisible({ timeout: 5000 });
    });
});
