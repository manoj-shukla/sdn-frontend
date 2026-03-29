import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 */
export default defineConfig({
    testDir: './e2e',
    /* Maximum time one test can run */
    timeout: 90 * 1000,
    /* Expect timeout */
    expect: {
        timeout: 10000,
    },
    /* Workers */
    workers: 1,
    /* Reporter */
    reporter: 'html',
    /* Global setup across all tests */
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        /* Viewport */
        viewport: { width: 1440, height: 900 },
    },

    /* Run your tests in this browser */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Dev server is already running externally */
    // webServer: { command: 'npm run dev', url: 'http://localhost:3000' },
});
