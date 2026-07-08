/* ============================================
   playwright.config.js — Playwright E2E Config
   Commentarium
   Uso: npx playwright test
   ============================================ */

// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['html', { outputFolder: 'e2e-report' }]],

    use: {
        baseURL: 'http://localhost:5500',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
