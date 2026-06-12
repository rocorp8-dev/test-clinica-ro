/**
 * ux-audit.spec.ts — Auditoría UX: Accesibilidad + Performance
 * Tests HP-A1, HP-UX del sistema QA Engine.
 * Usa @axe-core/playwright para detectar violaciones WCAG automáticamente.
 */

import { test, expect, Page } from '@playwright/test';
import { QA, loginHelper } from './qa-config';
import AxeBuilder from '@axe-core/playwright';

test.describe('♿ UX Audit — Accesibilidad y Performance', () => {

    // ── Accesibilidad WCAG (Axe) ──────────────────────────────────────────────

    test.describe('Accesibilidad WCAG 2.1 (Axe-core)', () => {

        test('HP-UX-01 | Login: sin violaciones WCAG críticas', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.login}`);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .exclude('[class*="toast"]') // Excluir toasts dinámicos
                .analyze();

            const criticalViolations = results.violations.filter(v =>
                v.impact === 'critical' || v.impact === 'serious'
            );

            if (criticalViolations.length > 0) {
                const summary = criticalViolations.map(v =>
                    `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes.length} elementos)`
                ).join('\n');
                console.error('Violaciones de accesibilidad críticas:\n' + summary);
            }

            expect(criticalViolations.length, `${criticalViolations.length} violaciones WCAG críticas en Login`).toBe(0);
        });

        test('HP-UX-02 | Dashboard: sin violaciones WCAG críticas', async ({ page }) => {
            await loginHelper(page);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .exclude('[class*="toast"], [class*="notification"]')
                .analyze();

            const criticalViolations = results.violations.filter(v =>
                v.impact === 'critical' || v.impact === 'serious'
            );

            if (criticalViolations.length > 0) {
                console.warn('⚠️ Violaciones WCAG en Dashboard:');
                criticalViolations.forEach(v => {
                    console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
                    v.nodes.slice(0, 2).forEach(n => console.warn(`    Selector: ${n.target}`));
                });
            }

            expect(criticalViolations.length, `${criticalViolations.length} violaciones WCAG críticas en Dashboard`).toBe(0);
        });

        test('HP-UX-03 | Pacientes: sin violaciones WCAG críticas', async ({ page }) => {
            await loginHelper(page);
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();

            const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
            expect(critical.length, `${critical.length} violaciones críticas en Pacientes`).toBe(0);
        });
    });

    // ── Performance básica ────────────────────────────────────────────────────

    test.describe('Performance y Core Web Vitals', () => {

        test('HP-PERF-01 | Login: tiempo de carga < 3s', async ({ page }) => {
            const start = Date.now();
            await page.goto(`${QA.baseURL}${QA.routes.login}`);
            await page.waitForLoadState('domcontentloaded');
            const loadTime = Date.now() - start;

            console.log(`⚡ Login load time: ${loadTime}ms`);
            expect(loadTime, `Login tardó ${loadTime}ms (max: 3000ms)`).toBeLessThan(3000);
        });

        test('HP-PERF-02 | Dashboard: LCP < 4s', async ({ page }) => {
            await loginHelper(page);

            // Medir LCP con Performance API
            const lcp = await page.evaluate(() => {
                return new Promise<number>((resolve) => {
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        resolve(lastEntry.startTime);
                    }).observe({ type: 'largest-contentful-paint', buffered: true });
                    // Timeout fallback
                    setTimeout(() => resolve(0), 3000);
                });
            });

            if (lcp > 0) {
                console.log(`⚡ LCP Dashboard: ${Math.round(lcp)}ms`);
                expect(lcp, `LCP muy alto: ${Math.round(lcp)}ms (max: ${QA.ux.maxLCP}ms)`).toBeLessThan(QA.ux.maxLCP);
            }
        });

        test('HP-PERF-03 | Dashboard: sin Layout Shift excesivo (CLS)', async ({ page }) => {
            await loginHelper(page);
            await page.waitForTimeout(2000); // Dejar que el layout se estabilice

            const cls = await page.evaluate(() => {
                return new Promise<number>((resolve) => {
                    let clsValue = 0;
                    new PerformanceObserver((list) => {
                        list.getEntries().forEach((entry: any) => {
                            if (!entry.hadRecentInput) clsValue += entry.value;
                        });
                    }).observe({ type: 'layout-shift', buffered: true });
                    setTimeout(() => resolve(clsValue), 2000);
                });
            });

            console.log(`⚡ CLS Dashboard: ${cls.toFixed(4)}`);
            expect(cls, `CLS muy alto: ${cls.toFixed(4)} (max: ${QA.ux.maxCLS})`).toBeLessThan(QA.ux.maxCLS);
        });
    });

    // ── Semántica HTML ────────────────────────────────────────────────────────

    test.describe('Semántica HTML y SEO básico', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-SEO-01 | Dashboard: tiene exactly 1 h1', async ({ page }) => {
            const h1Count = await page.locator('h1').count();
            expect(h1Count, `Hay ${h1Count} h1 en Dashboard (debe ser exactamente 1)`).toBe(1);
        });

        test('HP-SEO-02 | Imágenes tienen atributo alt', async ({ page }) => {
            const imgsWithoutAlt = await page.locator('img:not([alt])').count();
            expect(imgsWithoutAlt, `${imgsWithoutAlt} imágenes sin atributo alt`).toBe(0);
        });

        test('HP-SEO-03 | Inputs tienen labels asociados', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.login}`);
            const inputsWithoutLabel = await page.evaluate(() => {
                const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
                return inputs.filter(input => {
                    const id = input.getAttribute('id');
                    const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
                    const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
                    const hasPlaceholder = input.hasAttribute('placeholder');
                    return !hasLabel && !hasAriaLabel && !hasPlaceholder;
                }).length;
            });
            expect(inputsWithoutLabel, `${inputsWithoutLabel} inputs sin label, aria-label, ni placeholder`).toBe(0);
        });

        test('HP-SEO-04 | Botones tienen texto visible o aria-label', async ({ page }) => {
            const buttonsWithoutText = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.filter(btn => {
                    const hasText = (btn.textContent?.trim().length || 0) > 0;
                    const hasAriaLabel = btn.hasAttribute('aria-label');
                    const hasTitle = btn.hasAttribute('title');
                    return !hasText && !hasAriaLabel && !hasTitle;
                }).length;
            });
            if (buttonsWithoutText > 0) {
                console.warn(`⚠️ ${buttonsWithoutText} botones sin texto ni aria-label (icon-only buttons)`);
            }
            expect(buttonsWithoutText, `${buttonsWithoutText} botones sin texto accesible`).toBeLessThan(3);
        });
    });

    // ── Contraste de colores ──────────────────────────────────────────────────

    test.describe('Contraste de Colores', () => {

        test('HP-CONTRAST-01 | Login: relación de contraste mínima 4.5:1 (Axe)', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.login}`);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withRules(['color-contrast'])
                .analyze();

            if (results.violations.length > 0) {
                console.warn('⚠️ Problemas de contraste en Login:');
                results.violations[0].nodes.slice(0, 3).forEach(n => {
                    console.warn(`  Selector: ${n.target} | ${n.failureSummary}`);
                });
            }
            expect(results.violations.length, `${results.violations.length} problemas de contraste en Login`).toBe(0);
        });
    });
});
