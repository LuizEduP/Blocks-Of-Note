/* ============================================
   notes.spec.js — E2E Tests for Notes Page
   Framework: Playwright
   Uso: npx playwright test e2e/notes.spec.js
   ============================================ */

// @ts-check
const { test, expect } = require('@playwright/test');

const NOTES_URL = 'paginanot.html';

test.describe('Notes Page — CRUD E2E', () => {

    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto(NOTES_URL);
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('deve carregar a página de notas', async ({ page }) => {
        await expect(page).toHaveTitle(/Minhas Notas/);
        await expect(page.locator('#cube-main-note')).toBeVisible();
        await expect(page.locator('#notes-orbit')).toBeVisible();
    });

    test('deve abrir o menu ao clicar no cubo principal', async ({ page }) => {
        await page.click('#cube-main-note');
        // Menu options should become visible
        await expect(page.locator('#btn-create')).toBeVisible();
        await expect(page.locator('#btn-remove')).toBeVisible();
    });

    test('deve criar uma nova nota', async ({ page }) => {
        // Open menu
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);

        // Click CREAT
        await page.click('#btn-create');
        await page.waitForTimeout(300);

        // A mini cube should appear in orbit
        const miniCubes = page.locator('.mini-note-scene');
        await expect(miniCubes).toHaveCount(1);

        // Toast should appear
        await expect(page.locator('.toast')).toBeVisible();
    });

    test('deve criar e abrir editor de nota', async ({ page }) => {
        // Create note via menu
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Click the mini cube to open editor
        await page.click('.mini-note-scene');
        await page.waitForTimeout(300);

        // Modal should be visible
        await expect(page.locator('#note-modal')).toBeVisible();
        await expect(page.locator('#note-title-input')).toBeVisible();
        await expect(page.locator('#note-text')).toBeVisible();
    });

    test('deve editar título e conteúdo de uma nota', async ({ page }) => {
        // Create note
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Open editor
        await page.click('.mini-note-scene');
        await page.waitForTimeout(300);

        // Edit title
        const titleInput = page.locator('#note-title-input');
        await titleInput.fill('Minha Nota E2E');

        // Edit content
        const contentTextarea = page.locator('#note-text');
        await contentTextarea.fill('Este é o conteúdo da minha nota criada via Playwright.');

        // Save
        await page.click('#btn-save');
        await page.waitForTimeout(300);

        // Modal should close
        await expect(page.locator('#note-modal')).not.toBeVisible();

        // Toast should show success
        await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('deve excluir uma nota', async ({ page }) => {
        // Create note first
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Close menu by clicking outside orbit
        await page.click('#notes-orbit', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(200);

        // Open menu again
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);

        // Click REMOVE to activate remove mode
        await page.click('#btn-remove');
        await page.waitForTimeout(200);

        // Click the mini cube to delete it
        await page.click('.mini-note-scene');
        await page.waitForTimeout(500);

        // Mini cube should be removed
        const miniCubes = page.locator('.mini-note-scene');
        await expect(miniCubes).toHaveCount(0);
    });

    test('deve buscar notas pelo título', async ({ page }) => {
        // Create a note with specific title
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Open editor and set title
        await page.click('.mini-note-scene');
        await page.waitForTimeout(300);
        await page.locator('#note-title-input').fill('Nota Buscável');
        await page.click('#btn-save');
        await page.waitForTimeout(300);

        // Search for it
        const searchInput = page.locator('#notes-search-input');
        await searchInput.fill('Buscável');
        await page.waitForTimeout(300);

        // The mini cube should still be visible
        await expect(page.locator('.mini-note-scene')).toHaveCount(1);

        // Search for non-matching text
        await searchInput.fill('Inexistente');
        await page.waitForTimeout(300);

        // Mini cube should be hidden (display: none)
        await expect(page.locator('.mini-note-scene')).not.toBeVisible();
    });

    test('deve exportar notas como JSON', async ({ page }) => {
        // Create a note
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);
        await page.click('#btn-create');
        await page.waitForTimeout(300);

        // Click EXPORT button
        await page.click('#btn-export');
        await page.waitForTimeout(500);

        // Toast should show export success
        await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('deve mostrar toast de erro ao exportar sem notas', async ({ page }) => {
        // Click EXPORT with no notes
        await page.click('#btn-export');
        await page.waitForTimeout(500);

        // Toast should show info
        await expect(page.locator('.toast-info')).toBeVisible();
    });

    test('deve respeitar maxlength do título', async ({ page }) => {
        await page.click('#cube-main-note');
        await page.waitForTimeout(300);
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Open editor
        await page.click('.mini-note-scene');
        await page.waitForTimeout(300);

        // Check maxlength attribute
        const maxlength = await page.locator('#note-title-input').getAttribute('maxlength');
        expect(maxlength).toBe('200');
    });
});
