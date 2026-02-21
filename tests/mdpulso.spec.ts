import { test, expect } from '@playwright/test';

test.describe('MdPulso E2E Validation', () => {
    test('unauthorized user should be redirected to login', async ({ page }) => {
        await page.goto('http://localhost:3002/');
        await expect(page).toHaveURL(/.*login/);
    });

    test('doctor should be able to login with demo credentials', async ({ page }) => {
        await page.goto('http://localhost:3002/login');

        // Check if MdPulso brand is visible
        await expect(page.locator('text=MdPulso')).toBeVisible();

        // Fill form
        await page.fill('input[type="email"]', 'doctor@mdpulso.com');
        await page.fill('input[type="password"]', 'Demo1234!');

        // Click login
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL('http://localhost:3002/');

        // Should see stats
        await expect(page.locator('text=Pacientes Totales')).toBeVisible();
        await expect(page.locator('text=Bienvenido a MdPulso')).toBeVisible();
    });
});
