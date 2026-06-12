import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    timeout: 45000,

    reporter: [
        ['list'],
        ['json', { outputFile: 'qa-reports/results.json' }],
        ['html', { outputFolder: 'qa-reports/html', open: 'never' }],
    ],

    use: {
        baseURL: process.env.QA_BASE_URL || 'http://localhost:3009',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },

    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'iPhone 14',
            use: { ...devices['iPhone 14'] },
            testMatch: ['**/mobile.spec.ts'],
        },
    ],
});
