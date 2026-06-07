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
        await expect(page).toHaveTitle(/Notas/);
        await expect(page.locator('#notes-grid')).toBeVisible();
        await expect(page.locator('.notes-header')).toBeVisible();
        await expect(page.locator('#btn-create')).toBeVisible();
    });

    test('deve criar uma nova nota e abrir o editor', async ({ page }) => {
        // Click NOVA button
        await page.click('#btn-create');
        await page.waitForTimeout(300);

        // Modal should be visible
        await expect(page.locator('#note-modal')).toBeVisible();
        await expect(page.locator('#note-title-input')).toBeVisible();
        await expect(page.locator('#note-text')).toBeVisible();

        // Toast should appear
        await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('deve editar título e conteúdo de uma nota', async ({ page }) => {
        // Create note
        await page.click('#btn-create');
        await page.waitForTimeout(500);

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

        // Card should be visible in grid
        const cards = page.locator('.note-card');
        await expect(cards).toHaveCount(1);
        await expect(cards.first()).toContainText('Minha Nota E2E');
    });

    test('deve excluir uma nota', async ({ page }) => {
        // Create note first
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Close modal
        await page.click('#btn-cancel');
        await page.waitForTimeout(300);

        // Click REMOVE to activate remove mode
        await page.click('#btn-remove');
        await page.waitForTimeout(200);

        // The button text should now be CANCELAR
        await expect(page.locator('#btn-remove')).toHaveText('CANCELAR');

        // Click the note card to delete it
        await page.click('.note-card');
        await page.waitForTimeout(500);

        // Note card should be removed
        const cards = page.locator('.note-card');
        await expect(cards).toHaveCount(0);

        // Should show empty state
        await expect(page.locator('.empty-notes')).toBeVisible();
    });

    test('deve buscar notas pelo título', async ({ page }) => {
        // Create a note with specific title
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        await page.locator('#note-title-input').fill('Nota Buscável');
        await page.click('#btn-save');
        await page.waitForTimeout(300);

        // Search for it
        const searchInput = page.locator('#notes-search-input');
        await searchInput.fill('Buscável');
        await page.waitForTimeout(300);

        // The note card should still be visible
        await expect(page.locator('.note-card')).toHaveCount(1);

        // Search for non-matching text
        await searchInput.fill('Inexistente');
        await page.waitForTimeout(300);

        // Should show empty state
        await expect(page.locator('.empty-notes')).toBeVisible();
    });

    test('deve buscar notas pelo conteúdo', async ({ page }) => {
        // Create a note with specific content
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        await page.locator('#note-title-input').fill('Título Qualquer');
        await page.locator('#note-text').fill('Conteúdo específico para busca');
        await page.click('#btn-save');
        await page.waitForTimeout(300);

        // Search by content
        const searchInput = page.locator('#notes-search-input');
        await searchInput.fill('específico');
        await page.waitForTimeout(300);

        // The note card should be visible
        await expect(page.locator('.note-card')).toHaveCount(1);
    });

    test('deve exportar notas como JSON', async ({ page }) => {
        // Create a note
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        await page.locator('#note-title-input').fill('Nota para Exportar');
        await page.click('#btn-save');
        await page.waitForTimeout(300);

        // Click EXPORT button
        await page.click('#btn-export');
        await page.waitForTimeout(500);

        // Toast should show export success
        await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('deve mostrar toast de info ao exportar sem notas', async ({ page }) => {
        // Click EXPORT with no notes
        await page.click('#btn-export');
        await page.waitForTimeout(500);

        // Toast should show info
        await expect(page.locator('.toast-info')).toBeVisible();
    });

    test('deve respeitar maxlength do título', async ({ page }) => {
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Check maxlength attribute
        const maxlength = await page.locator('#note-title-input').getAttribute('maxlength');
        expect(maxlength).toBe('200');
    });

    test('deve fechar modal com tecla Escape', async ({ page }) => {
        // Create note
        await page.click('#btn-create');
        await page.waitForTimeout(500);

        // Modal should be visible
        await expect(page.locator('#note-modal')).toBeVisible();

        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Modal should close
        await expect(page.locator('#note-modal')).not.toBeVisible();
    });
});
