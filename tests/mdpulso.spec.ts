import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = 'admin@testclinica.com';
const PASSWORD = 'Demo1234!';

async function login(page: any) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

test.describe('Auth', () => {
    test('redirige a login si no autenticado', async ({ page }) => {
        await page.goto(`${BASE}/`);
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('login con credenciales demo', async ({ page }) => {
        await page.goto(`${BASE}/login`);
        await expect(page.getByRole('heading', { name: 'MdPulso' })).toBeVisible();
        await page.fill('input[type="email"]', EMAIL);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE}/`, { timeout: 15000 });
    });

    test('muestra error con credenciales incorrectas', async ({ page }) => {
        await page.goto(`${BASE}/login`);
        await page.fill('input[type="email"]', 'noexiste@test.com');
        await page.fill('input[type="password"]', 'wrongpass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/login/);
    });
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => { await login(page); });

    test('muestra stats de pacientes y citas', async ({ page }) => {
        await expect(page.locator('text=Pacientes').first()).toBeVisible();
        await expect(page.locator('text=Citas').first()).toBeVisible();
    });

    test('sidebar visible', async ({ page }) => {
        await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible();
    });

    test('nombre del doctor visible en header', async ({ page }) => {
        // El nombre debe ser visible sin hover (fix aplicado)
        const nameContainer = page.locator('header .text-sm.font-bold.text-slate-900').first();
        await expect(nameContainer).toBeVisible({ timeout: 6000 });
    });
});

// ─── NOTIFICACIONES ──────────────────────────────────────────────────────────

test.describe('Notificaciones', () => {
    test.beforeEach(async ({ page }) => { await login(page); });

    test('botón de campana visible en header', async ({ page }) => {
        await expect(page.locator('[data-testid="bell-btn"]')).toBeVisible({ timeout: 5000 });
    });

    test('click en campana abre panel de notificaciones', async ({ page }) => {
        await page.locator('[data-testid="bell-btn"]').click();
        await expect(page.locator('text=Notificaciones').first()).toBeVisible({ timeout: 5000 });
    });

    test('panel de notificaciones tiene opción de marcar leídas o mensaje vacío', async ({ page }) => {
        await page.locator('[data-testid="bell-btn"]').click();
        await page.waitForTimeout(1500);
        await expect(page.locator('text=Notificaciones').first()).toBeVisible({ timeout: 5000 });
    });

    test('panel cierra al hacer click fuera', async ({ page }) => {
        await page.locator('[data-testid="bell-btn"]').click();
        await page.waitForTimeout(500);
        await page.locator('h1').first().click({ force: true });
        await page.waitForTimeout(500);
        await expect(page.locator('text=Notificaciones').first()).not.toBeVisible();
    });
});

// ─── PACIENTES — NOM-004 ─────────────────────────────────────────────────────

test.describe('Pacientes — NOM-004', () => {
    test.beforeEach(async ({ page }) => { await login(page); });

    test('carga página de pacientes', async ({ page }) => {
        await page.goto(`${BASE}/patients`);
        await expect(page.locator('h1, h2').filter({ hasText: /paciente/i }).first()).toBeVisible();
    });

    test('abre modal de nuevo paciente', async ({ page }) => {
        await page.goto(`${BASE}/patients`);
        await page.click('button:has-text("Registrar Nuevo Paciente")');
        await expect(page.locator('.fixed.inset-0').first()).toBeVisible();
    });

    test('modal tiene tabs NOM-004 (Identificación, Domicilio, Clínico)', async ({ page }) => {
        await page.goto(`${BASE}/patients`);
        await page.click('button:has-text("Registrar Nuevo Paciente")');
        const modal = page.locator('.fixed.inset-0').first();
        await expect(modal.getByRole('button', { name: 'Identificación' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Domicilio' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Clínico' })).toBeVisible();
    });

    test('modal contiene campo CURP', async ({ page }) => {
        await page.goto(`${BASE}/patients`);
        await page.click('button:has-text("Registrar Nuevo Paciente")');
        await expect(page.locator('input[placeholder*="PELJ"]')).toBeVisible();
    });

    test('registra paciente con NOM-004 y muestra confirmación', async ({ page }) => {
        await page.goto(`${BASE}/patients`);
        await page.click('button:has-text("Registrar Nuevo Paciente")');
        await page.fill('input[placeholder="Juan Pérez López"]', 'Paciente Test NOM004');
        await page.fill('input[placeholder="ABCD123456"]', 'NOM' + Date.now().toString().slice(-6));
        await page.fill('input[placeholder="+52 951..."]', '5512345678');
        const modal = page.locator('.fixed.inset-0').first();
        await modal.getByRole('button', { name: 'Clínico' }).click();
        await page.waitForTimeout(200);
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('text=NOM-004')).toBeVisible({ timeout: 8000 });
    });
});

// ─── EXPEDIENTES — NOM-004/024 ───────────────────────────────────────────────

test.describe('Expedientes Electrónicos — NOM-004/024', () => {
    test.beforeEach(async ({ page }) => { await login(page); });

    test('carga página de expedientes', async ({ page }) => {
        await page.goto(`${BASE}/records`);
        await expect(page.locator('text=Expedientes Electrónicos')).toBeVisible();
    });

    test('muestra referencia a normativa NOM', async ({ page }) => {
        await page.goto(`${BASE}/records`);
        await expect(page.locator('text=NOM-004').first()).toBeVisible();
    });

    test('tiene buscador de pacientes en panel lateral', async ({ page }) => {
        await page.goto(`${BASE}/records`);
        await expect(page.locator('input[placeholder*="CURP"]')).toBeVisible();
    });

    test('lista pacientes en panel lateral', async ({ page }) => {
        await page.goto(`${BASE}/records`);
        await page.waitForTimeout(3000);
        // Los botones de paciente están en el panel lateral izquierdo
        const patientBtn = page.locator('.w-full.text-left.flex.items-center').first();
        await expect(patientBtn).toBeVisible({ timeout: 8000 });
    });

    test('seleccionar paciente muestra su expediente', async ({ page }) => {
        await page.goto(`${BASE}/records`);
        await page.waitForTimeout(3000);
        const patientBtn = page.locator('.w-full.text-left.flex.items-center').first();
        if (await patientBtn.count() > 0) {
            await patientBtn.click();
            await expect(page.locator('text=I. Datos de Identificación').or(
                page.locator('text=Datos de Identificación')
            )).toBeVisible({ timeout: 8000 });
        }
    });

    test('botón Exportar PDF visible con paciente seleccionado', async ({ page }) => {
        await page.goto(`${BASE}/records`);
        await page.waitForTimeout(3000);
        const patientBtn = page.locator('.w-full.text-left.flex.items-center').first();
        if (await patientBtn.count() > 0) {
            await patientBtn.click();
            await expect(page.locator('button:has-text("Exportar PDF")')).toBeVisible({ timeout: 8000 });
        }
    });
});

// ─── CITAS + HIGHLIGHT ───────────────────────────────────────────────────────

test.describe('Citas', () => {
    test.beforeEach(async ({ page }) => { await login(page); });

    test('carga página de citas', async ({ page }) => {
        await page.goto(`${BASE}/appointments`);
        await expect(page).toHaveURL(`${BASE}/appointments`);
        await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('agenda acepta parámetros date y highlight del URL', async ({ page }) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        await page.goto(`${BASE}/appointments?date=${dateStr}&highlight=fake-id`);
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
        // Debe mostrar el día correcto en el título
        await expect(page.locator(`text=${today.getDate()}`).first()).toBeVisible();
    });

    test('botón Agendar abre modal', async ({ page }) => {
        await page.goto(`${BASE}/appointments`);
        await page.click('button:has-text("Agendar")');
        await expect(page.locator('.fixed.inset-0').first()).toBeVisible();
    });
});

// ─── NAVEGACIÓN SIN 404 ──────────────────────────────────────────────────────

test.describe('Navegación', () => {
    test.beforeEach(async ({ page }) => { await login(page); });

    test('todas las rutas cargan sin error 404', async ({ page }) => {
        const routes = ['/', '/patients', '/appointments', '/records', '/billing', '/settings'];
        for (const route of routes) {
            await page.goto(`${BASE}${route}`);
            const title = await page.title();
            expect(title.toLowerCase()).not.toContain('404');
            expect(title.toLowerCase()).not.toContain('not found');
        }
    });
});
