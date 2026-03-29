import { test, expect, Page } from '@playwright/test';
import { injectSupplierAuth, setupGlobalMocks } from './rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function buildRegulatoryInvitation(supplierCountry: string, isCrossBorder: boolean) {
    return {
        rfiId: 'inv-reg-1',
        title: 'Regulatory Compliance RFI',
        buyerName: 'Global Procurement',
        deadline: '2025-05-30T00:00:00Z',
        status: 'INVITED',
        submittedAt: null,
        supplierCountry,
        isCrossBorder,
        template: {
            templateId: 'tpl-reg-1',
            name: 'Regulatory Template',
            sections: [
                {
                    sectionId: 'sec-general',
                    title: 'General Information',
                    questions: [
                        {
                            templateQuestionId: 1,
                            questionId: 'q-general-1',
                            isMandatory: true,
                            question: {
                                questionId: 'q-general-1',
                                text: 'What is your company registration number?',
                                questionType: 'SHORT_TEXT',
                                isMandatory: true,
                                categoryTag: undefined,
                            }
                        },
                    ],
                },
                {
                    sectionId: 'sec-india',
                    title: 'India-Specific Compliance',
                    questions: [
                        {
                            templateQuestionId: 2,
                            questionId: 'q-gst-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-gst-1',
                                text: 'What is your GST number?',
                                questionType: 'SHORT_TEXT',
                                isMandatory: false,
                                categoryTag: 'GST_PAN_MSME',
                            }
                        },
                        {
                            templateQuestionId: 3,
                            questionId: 'q-pan-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-pan-1',
                                text: 'What is your PAN number?',
                                questionType: 'SHORT_TEXT',
                                isMandatory: false,
                                categoryTag: 'GST_PAN_MSME',
                            }
                        },
                        {
                            templateQuestionId: 4,
                            questionId: 'q-msme-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-msme-1',
                                text: 'Are you MSME registered?',
                                questionType: 'YES_NO',
                                isMandatory: false,
                                categoryTag: 'GST_PAN_MSME',
                            }
                        },
                    ],
                },
                {
                    sectionId: 'sec-crossborder',
                    title: 'Cross-Border Compliance',
                    questions: [
                        {
                            templateQuestionId: 5,
                            questionId: 'q-aml-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-aml-1',
                                text: 'Do you have AML compliance policies in place?',
                                questionType: 'YES_NO',
                                isMandatory: false,
                                categoryTag: 'AML_EXPORT_CONTROL',
                            }
                        },
                        {
                            templateQuestionId: 6,
                            questionId: 'q-export-1',
                            isMandatory: false,
                            question: {
                                questionId: 'q-export-1',
                                text: 'Are you subject to export control regulations?',
                                questionType: 'YES_NO',
                                isMandatory: false,
                                categoryTag: 'AML_EXPORT_CONTROL',
                            }
                        },
                    ],
                },
            ],
        },
        answers: [],
    };
}

async function setupRegulatoryRoutes(page: Page, supplierCountry: string, isCrossBorder: boolean) {
    const invitation = buildRegulatoryInvitation(supplierCountry, isCrossBorder);
    
    // 1. Fetch Event Detail
    await page.route(/\/api\/rfi\/events\/[^/]+$/, async (route) => {
        await route.fulfill({ json: invitation });
    });
    
    // 2. Rules Evaluation
    await page.route(/\/api\/rfi\/rules\/[^/]+\/evaluate$/, async (route) => {
        const visibleQuestionIds = ['q-general-1'];
        if (supplierCountry === 'India') {
            visibleQuestionIds.push('q-gst-1', 'q-pan-1', 'q-msme-1');
        }
        if (isCrossBorder) {
            visibleQuestionIds.push('q-aml-1', 'q-export-1');
        }
        await route.fulfill({ json: { visibleQuestionIds } });
    });

    // 3. Progress
    await page.route(/\/api\/rfi\/responses\/[^/]+\/progress$/, async (route) => {
        await route.fulfill({ json: { answeredCount: 0, totalQuestions: 5, percentage: 0 } });
    });

    // 4. Draft
    await page.route(/\/api\/rfi\/responses\/[^/]+$/, async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: { answers: [], status: 'INVITED' } });
        } else {
            await route.fulfill({ json: { success: true } });
        }
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Regulatory Overlay Logic', () => {
    test.beforeEach(async ({ page }) => {
        await setupGlobalMocks(page);
        await injectSupplierAuth(page);
    });

    test('REG1: India supplier sees GST/PAN/MSME questions', async ({ page }) => {
        await setupRegulatoryRoutes(page, 'India', false);
        await page.goto('/supplier/rfi/inv-reg-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('question-q-general-1')).toBeVisible({ timeout: 10000 });

        // Go to Section 2
        await page.getByTestId('next-section-btn').click();
        await expect(page.getByTestId('question-q-gst-1')).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('question-q-pan-1')).toBeVisible();
        await expect(page.getByTestId('question-q-msme-1')).toBeVisible();
    });

    test('REG2: Non-India supplier does NOT see GST/PAN/MSME questions', async ({ page }) => {
        await setupRegulatoryRoutes(page, 'United States', false);
        await page.goto('/supplier/rfi/inv-reg-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });
        
        // Go to Section 2 (India)
        await page.getByTestId('next-section-btn').click();
        await expect(page.getByTestId('question-q-gst-1')).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('question-q-pan-1')).not.toBeVisible();
    });

    test('REG3: Germany supplier also does NOT see GST/PAN/MSME questions', async ({ page }) => {
        await setupRegulatoryRoutes(page, 'Germany', false);
        await page.goto('/supplier/rfi/inv-reg-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });

        // Go to Section 2 (India)
        await page.getByTestId('next-section-btn').click();
        await expect(page.getByTestId('question-q-gst-1')).not.toBeVisible({ timeout: 5000 });
    });

    test('REG4: Cross-border flag shows AML/export control questions', async ({ page }) => {
        await setupRegulatoryRoutes(page, 'United States', true);
        await page.goto('/supplier/rfi/inv-reg-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });

        // Go to Section 3 (Cross-border) - Note: In this mock, India is Sec 2, Cross-border is Sec 3
        await page.getByTestId('next-section-btn').click(); // to Sec 2
        await page.getByTestId('next-section-btn').click(); // to Sec 3
        await expect(page.getByTestId('question-q-aml-1')).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('question-q-export-1')).toBeVisible();
    });

    test('REG5: Non-cross-border supplier does NOT see AML/export control questions', async ({ page }) => {
        await setupRegulatoryRoutes(page, 'United States', false);
        await page.goto('/supplier/rfi/inv-reg-1');
        await expect(page.getByTestId('rfi-response-heading')).toBeVisible({ timeout: 15000 });

        // Go to Section 3 (Cross-border)
        await page.getByTestId('next-section-btn').click(); // to Sec 2
        await page.getByTestId('next-section-btn').click(); // to Sec 3
        await expect(page.getByTestId('question-q-aml-1')).not.toBeVisible({ timeout: 5000 });
    });

    test('REG6: India cross-border supplier sees both regulatory question sets', async ({ page }) => {
        await setupRegulatoryRoutes(page, 'India', true);
        await page.goto('/supplier/rfi/inv-reg-1');
        await expect(page.getByTestId('question-q-general-1')).toBeVisible({ timeout: 15000 });

        // Section 2 (India)
        await page.getByTestId('next-section-btn').click();
        await expect(page.getByTestId('question-q-gst-1')).toBeVisible({ timeout: 5000 });
        
        // Section 3 (Cross-border)
        await page.getByTestId('next-section-btn').click();
        await expect(page.getByTestId('question-q-aml-1')).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('question-q-export-1')).toBeVisible();
    });
});
