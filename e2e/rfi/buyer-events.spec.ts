import { test, expect, Page } from '@playwright/test';
import { injectBuyerAuth } from './rfi-helpers';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockEvents = [
    {
        rfiId: 'evt-draft-1',
        title: 'Q1 Vendor Assessment',
        description: 'Quarterly vendor review',
        templateId: 'tpl-active-1',
        templateName: 'Standard Vendor Assessment',
        status: 'DRAFT',
        deadline: '2027-04-30T00:00:00Z',
        suppliersCount: 0,
        createdAt: '2027-03-01T00:00:00Z',
    },
    {
        rfiId: 'evt-open-1',
        title: 'IT Security Assessment 2025',
        description: 'Annual IT security RFI',
        templateId: 'tpl-active-1',
        templateName: 'IT Security RFI',
        status: 'OPEN',
        deadline: '2027-05-01T00:00:00Z',
        suppliersCount: 3,
        createdAt: '2027-02-15T00:00:00Z',
    },
];

const mockActiveTemplates = [
    { templateId: 'tpl-active-1', name: 'Standard Vendor Assessment', description: 'For new vendors', status: 'PUBLISHED', sections: [] },
    { templateId: 'tpl-active-2', name: 'IT Security RFI', description: 'Security questionnaire', status: 'PUBLISHED', sections: [] },
];

const mockSuppliers = [
    { supplierId: 'sup-1', legalName: 'Acme Corp', email: 'acme@example.com' },
    { supplierId: 'sup-2', legalName: 'TechVendor Ltd', email: 'techvendor@example.com' },
];

const mockEventDetail = {
    rfiId: 'evt-open-1',
    title: 'IT Security Assessment 2025',
    description: 'Annual IT security RFI',
    templateId: 'tpl-active-1',
    templateName: 'IT Security RFI',
    status: 'OPEN',
    deadline: '2027-05-01T00:00:00Z',
    createdAt: '2027-02-15T00:00:00Z',
};

const mockEventInvitations = [
    {
        invitationId: 'inv-1',
        eventId: 'evt-open-1',
        supplierId: 'sup-1',
        supplierName: 'Acme Corp',
        email: 'acme@example.com',
        status: 'INVITED',
        submittedAt: null,
    },
    {
        invitationId: 'inv-2',
        eventId: 'evt-open-1',
        supplierId: 'sup-2',
        supplierName: 'TechVendor Ltd',
        email: 'techvendor@example.com',
        status: 'SUBMITTED',
        submittedAt: '2027-04-10T00:00:00Z',
    },
];

const mockInvitationsWithShortlisted = [
    {
        invitationId: 'inv-1',
        eventId: 'evt-open-1',
        supplierId: 'sup-1',
        supplierName: 'Acme Corp',
        email: 'acme@example.com',
        status: 'SUBMITTED',
        evaluationStatus: 'SHORTLISTED',
        submittedAt: '2027-04-05T00:00:00Z',
    },
    {
        invitationId: 'inv-2',
        eventId: 'evt-open-1',
        supplierId: 'sup-2',
        supplierName: 'TechVendor Ltd',
        email: 'techvendor@example.com',
        status: 'SUBMITTED',
        evaluationStatus: 'PENDING',
        submittedAt: '2027-04-10T00:00:00Z',
    },
];

// ---------------------------------------------------------------------------
// Route setup helpers
// ---------------------------------------------------------------------------

async function setupEventListRoutes(page: Page, events = mockEvents) {
    // Note: Registered in reverse order of specificity. 
    // Sub-resources first (so they match FIRST), then general detail, then list.
    
    // 1. Templates list
    await page.route('**/api/rfi/templates*', async (route) => {
        await route.fulfill({ json: mockActiveTemplates });
    });

    // 2. Suppliers list
    await page.route('**/api/suppliers*', async (route) => {
        await route.fulfill({ json: mockSuppliers });
    });

    // 3. Specific event sub-resources
    await page.route('**/api/rfi/events/*/invitations', async (route) => {
        await route.fulfill({ json: mockEventInvitations });
    });

    await page.route('**/api/rfi/events/*/publish', async (route) => {
        await route.fulfill({ json: { success: true } });
    });

    await page.route('**/api/rfi/events/*/close', async (route) => {
        await route.fulfill({ json: { ...mockEventDetail, status: 'CLOSED' } });
    });

    // 4. Detail (use regex to avoid matching sub-resources)
    await page.route(/\/api\/rfi\/events\/[^/]+$/, async (route) => {
        await route.fulfill({ json: mockEventDetail });
    });

    // 5. List/Create (Most general)
    await page.route('**/api/rfi/events', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({ json: { rfiId: 'evt-new-1', status: 'OPEN', title: 'New Event' } });
        } else {
            // Support both wrapped and unwrapped formats
            await route.fulfill({ json: { content: events, totalElements: events.length } });
        }
    });
}

async function setupEventDetailRoutes(page: Page, event = mockEventDetail, invitations = mockEventInvitations) {
    // Higher specificity FIRST
    await page.route('**/api/rfi/events/*/invitations', async (route) => {
        await route.fulfill({ json: invitations });
    });
    
    await page.route('**/api/rfi/events/*/close', async (route) => {
        await route.fulfill({ json: { ...event, status: 'CLOSED' } });
    });

    // Detail
    await page.route(/\/api\/rfi\/events\/[^/]+$/, async (route) => {
        await route.fulfill({ json: event });
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Buyer – RFI Event Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        await injectBuyerAuth(page);
    });

    test('E1: Buyer can navigate to RFI Events page and see event list', async ({ page }) => {
        await setupEventListRoutes(page);
        await page.goto('/buyer/rfi');
        await expect(page.getByTestId('rfi-events-heading')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('event-card-evt-draft-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('event-card-evt-open-1')).toBeVisible();
    });

    test('E2: Buyer can create RFI event via the 4-step wizard', async ({ page }) => {
        await setupEventListRoutes(page, []);
        await page.goto('/buyer/rfi');
        await expect(page.getByTestId('create-event-btn')).toBeVisible({ timeout: 15000 });
        await page.getByTestId('create-event-btn').click();

        // Step 1: Select template
        await expect(page.getByTestId('wizard-step-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('template-select-tpl-active-1')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('template-select-tpl-active-1').click();
        await page.getByTestId('wizard-next-btn').click();

        // Step 2: Event details
        await expect(page.getByTestId('wizard-step-2')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('event-title-input').fill('New Test RFI Event');
        await page.getByTestId('event-description-input').fill('Test event description');
        await page.getByTestId('event-deadline-input').fill('2027-06-30T12:00');
        await page.getByTestId('wizard-next-btn').click();

        // Step 3: Add suppliers
        await expect(page.getByTestId('wizard-step-3')).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('supplier-select-sup-1')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('supplier-select-sup-1').click();
        await page.getByTestId('wizard-next-btn').click();

        // Step 4: Review & Publish
        await expect(page.getByTestId('wizard-step-4')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('publish-event-btn').click();
        await expect(page.getByTestId('wizard-step-4')).not.toBeVisible({ timeout: 15000 });
    });

    test('E3: Event appears in dashboard with status DRAFT after creation', async ({ page }) => {
        const eventsWithDraft = [
            ...mockEvents,
            {
                rfiId: 'evt-new-draft',
                title: 'Draft Event',
                description: 'Draft',
                templateId: 'tpl-active-1',
                templateName: 'Standard Vendor Assessment',
                status: 'DRAFT',
                deadline: '2027-06-30T00:00:00Z',
                suppliersCount: 0,
                createdAt: '2027-03-23T00:00:00Z',
            },
        ];
        await setupEventListRoutes(page, eventsWithDraft);
        await page.goto('/buyer/rfi');
        await expect(page.getByTestId('event-card-evt-new-draft')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('event-status-evt-new-draft')).toContainText('DRAFT');
    });

    test('E4: Published event shows status OPEN', async ({ page }) => {
        await setupEventListRoutes(page);
        await page.goto('/buyer/rfi');
        await expect(page.getByTestId('event-card-evt-open-1')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('event-status-evt-open-1')).toContainText('OPEN');
    });

    test('E5: Event detail page shows Invitations tab with supplier statuses', async ({ page }) => {
        await setupEventDetailRoutes(page);
        await page.goto('/buyer/rfi/evt-open-1');
        await expect(page.getByTestId('event-title')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('event-status-badge')).toContainText('OPEN');

        await page.getByTestId('invitations-tab').click();
        await expect(page.getByTestId('supplier-invitation-row-inv-1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('supplier-invitation-status-inv-1')).toContainText('INVITED');
        await expect(page.getByTestId('supplier-invitation-row-inv-2')).toBeVisible();
        await expect(page.getByTestId('supplier-invitation-status-inv-2')).toContainText('SUBMITTED');
    });

    test('E6: Closing event changes status to CLOSED', async ({ page }) => {
        let currentStatus = 'OPEN';
        
        await setupEventDetailRoutes(page); 

        // Override with dynamic status tracking
        await page.route(/\/api\/rfi\/events\/evt-open-1(\/close)?$/, async (route) => {
            const method = route.request().method();
            const url = route.request().url();
            
            if (method === 'GET') {
                await route.fulfill({ json: { ...mockEventDetail, status: currentStatus } });
            } else if (method === 'POST' && url.endsWith('/close')) {
                currentStatus = 'CLOSED';
                await route.fulfill({ json: { success: true } });
            } else {
                await route.continue();
            }
        });
        
        await page.goto('/buyer/rfi/evt-open-1');
        await expect(page.getByTestId('event-status-badge')).toContainText('OPEN', { timeout: 15000 });

        await page.getByTestId('close-event-btn').click();
        await page.getByTestId('close-rfi-confirm-btn').click();
        
        await expect(page.getByTestId('event-status-badge')).toContainText('CLOSED', { timeout: 15000 });
    });

    test('E7: Convert to RFP button absent for OPEN, visible for CLOSED with shortlisted suppliers', async ({ page }) => {
        // Case 1: OPEN → no button
        await setupEventDetailRoutes(page, mockEventDetail, mockEventInvitations);
        await page.goto('/buyer/rfi/evt-open-1');
        await expect(page.getByTestId('event-status-badge')).toContainText('OPEN', { timeout: 15000 });
        await expect(page.getByTestId('convert-to-rfp-btn')).not.toBeVisible();

        // Case 2: CLOSED with SHORTLISTED → button visible
        await setupEventDetailRoutes(page, { ...mockEventDetail, status: 'CLOSED' }, mockInvitationsWithShortlisted);
        await page.reload();
        await expect(page.getByTestId('event-status-badge')).toContainText('CLOSED', { timeout: 15000 });
        // Invitations tab must be loaded to check shortlisted status
        await page.getByTestId('invitations-tab').click();
        await expect(page.getByTestId('convert-to-rfp-btn')).toBeVisible({ timeout: 15000 });
    });
});
