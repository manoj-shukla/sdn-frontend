import { test, expect } from '@playwright/test';
import { injectBuyerAuth } from './rfi/rfi-helpers';

const mockUsers = [{ userId: 'user-1', username: 'Test Buyer', email: 'buyer@test.com' }];
const mockCircles = [{ circleId: 'circle-1', name: 'Procurement' }];
const mockRoles = [{ roleId: 'role-1', name: 'Admin' }];

test('debug users page', async ({ page }) => {
    await injectBuyerAuth(page);
    
    await page.route(/\/api\/users\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockUsers });
    });
    await page.route(/\/api\/circles\/buyer\/[^/]+/, async (route) => {
        await route.fulfill({ json: mockCircles });
    });
    await page.route(/\/api\/buyers\/[^/]+\/roles/, async (route) => {
        await route.fulfill({ json: mockRoles });
    });
    
    await page.goto('/buyer/users');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    console.log('Current URL:', url);
    
    const allButtons = await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        return Array.from(btns).map(b => b.textContent?.trim());
    });
    console.log('Buttons:', JSON.stringify(allButtons));
    
    const h1 = await page.evaluate(() => document.title);
    console.log('Title:', h1);
});
