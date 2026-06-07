/* ============================================
   tasks.spec.js — E2E Tests for Tasks Page
   Framework: Playwright
   Uso: npx playwright test e2e/tasks.spec.js
   ============================================ */

// @ts-check
const { test, expect } = require('@playwright/test');

const TASKS_URL = 'paginatask.html';
const TASKBOARD_URL = 'taskboard/taskboard.html';

test.describe('Tasks Page — CRUD E2E', () => {

    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto(TASKS_URL);
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('deve carregar a página de tarefas', async ({ page }) => {
        await expect(page).toHaveTitle(/Nova Tarefa/);
        await expect(page.locator('#task-title')).toBeVisible();
        await expect(page.locator('#urgency-indicator')).toBeVisible();
        await expect(page.locator('#urgencySelect')).toBeVisible();
    });

    test('deve mostrar erro ao salvar sem título', async ({ page }) => {
        // Click save without filling title
        await page.click('#btn-save-task');
        await page.waitForTimeout(300);

        // Toast error should appear
        await expect(page.locator('.toast-error')).toBeVisible();
        await expect(page.locator('.toast-error')).toContainText(/obrigatório/);
    });

    test('deve criar uma tarefa com dados completos', async ({ page }) => {
        // Fill all fields
        await page.locator('#task-title').fill('Tarefa E2E Completa');
        await page.locator('#task-date').fill('2026-06-15');
        await page.locator('#task-time').fill('10:30');
        await page.locator('#task-location').fill('Escritório');
        await page.locator('#task-desc').fill('Descrição detalhada da tarefa de teste.');
        await page.locator('#urgencySelect').selectOption('high');

        // Save
        await page.click('#btn-save-task');
        await page.waitForTimeout(300);

        // Toast success should appear
        await expect(page.locator('.toast-success')).toBeVisible();
        await expect(page.locator('.toast-success')).toContainText(/sucesso/);

        // Form should be cleared
        await expect(page.locator('#task-title')).toHaveValue('');
        await expect(page.locator('#task-date')).toHaveValue('');
        await expect(page.locator('#task-time')).toHaveValue('');
        await expect(page.locator('#task-location')).toHaveValue('');
        await expect(page.locator('#task-desc')).toHaveValue('');
    });

    test('deve criar tarefa com dados mínimos', async ({ page }) => {
        await page.locator('#task-title').fill('Tarefa Mínima');
        await page.click('#btn-save-task');
        await page.waitForTimeout(300);

        await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('deve alterar urgência e refletir no indicador', async ({ page }) => {
        // Select 'extra' urgency
        await page.locator('#urgencySelect').selectOption('extra');
        await page.waitForTimeout(200);

        // Indicator should have 'urgency-extra' class
        const indicatorClass = await page.locator('#urgency-indicator').getAttribute('class');
        expect(indicatorClass).toContain('urgency-extra');
    });

    test('deve criar múltiplas tarefas sequencialmente', async ({ page }) => {
        const titles = ['Primeira Tarefa', 'Segunda Tarefa', 'Terceira Tarefa'];

        for (const title of titles) {
            await page.locator('#task-title').fill(title);
            await page.click('#btn-save-task');
            await page.waitForTimeout(300);
            await expect(page.locator('.toast-success')).toBeVisible();
        }

        // Verify all 3 tasks in localStorage
        const count = await page.evaluate(() => {
            const tasks = JSON.parse(localStorage.getItem('my_3d_tasks') || '[]');
            return tasks.length;
        });
        expect(count).toBe(3);
    });

    test('deve ter maxlength nos campos de texto', async ({ page }) => {
        const titleMaxlength = await page.locator('#task-title').getAttribute('maxlength');
        expect(titleMaxlength).toBe('200');

        const locationMaxlength = await page.locator('#task-location').getAttribute('maxlength');
        expect(locationMaxlength).toBe('200');

        const descMaxlength = await page.locator('#task-desc').getAttribute('maxlength');
        expect(descMaxlength).toBe('1000');
    });

    test.describe('Task Board', () => {

        test('deve carregar o Task Board vazio', async ({ page }) => {
            await page.goto(TASKBOARD_URL);
            await page.waitForLoadState('networkidle');

            await expect(page).toHaveTitle(/Task Board/);
            await expect(page.locator('.empty-state')).toBeVisible();
            await expect(page.locator('#board-stats')).toContainText('0 tarefas');
        });

        test('deve exibir tarefas no Task Board', async ({ page }) => {
            // Create a task first
            await page.goto(TASKS_URL);
            await page.waitForLoadState('networkidle');
            await page.locator('#task-title').fill('Tarefa do Board');
            await page.locator('#urgencySelect').selectOption('high');
            await page.click('#btn-save-task');
            await page.waitForTimeout(300);

            // Navigate to Task Board
            await page.goto(TASKBOARD_URL);
            await page.waitForLoadState('networkidle');

            // Task card should be visible
            await expect(page.locator('.task-card')).toBeVisible();
            await expect(page.locator('.card-title')).toContainText('Tarefa do Board');
            await expect(page.locator('#board-stats')).toContainText('1 tarefa');
        });

        test('deve excluir tarefa do Task Board', async ({ page }) => {
            // Create a task
            await page.goto(TASKS_URL);
            await page.waitForLoadState('networkidle');
            await page.locator('#task-title').fill('Tarefa para Excluir');
            await page.click('#btn-save-task');
            await page.waitForTimeout(300);

            // Navigate to Task Board
            await page.goto(TASKBOARD_URL);
            await page.waitForLoadState('networkidle');

            // Click delete
            page.on('dialog', dialog => dialog.accept()); // handle confirm dialog
            await page.click('.btn-danger');
            await page.waitForTimeout(500);

            // Should show empty state
            await expect(page.locator('.empty-state')).toBeVisible();
            await expect(page.locator('#board-stats')).toContainText('0 tarefas');
        });

        test('deve filtrar tarefas por urgência no Task Board', async ({ page }) => {
            // Create tasks with different urgencies
            await page.goto(TASKS_URL);
            await page.waitForLoadState('networkidle');

            await page.locator('#task-title').fill('Urgência Baixa');
            await page.locator('#urgencySelect').selectOption('low');
            await page.click('#btn-save-task');
            await page.waitForTimeout(300);

            await page.locator('#task-title').fill('Urgência Alta');
            await page.locator('#urgencySelect').selectOption('high');
            await page.click('#btn-save-task');
            await page.waitForTimeout(300);

            // Navigate to Task Board
            await page.goto(TASKBOARD_URL);
            await page.waitForLoadState('networkidle');

            // Filter by 'high'
            await page.locator('#board-filter').selectOption('high');
            await page.waitForTimeout(300);

            // Only high urgency task should be visible
            await expect(page.locator('.task-card')).toHaveCount(1);
            await expect(page.locator('.card-title')).toContainText('Urgência Alta');
        });

        test('deve buscar tarefas por texto no Task Board', async ({ page }) => {
            // Create a task
            await page.goto(TASKS_URL);
            await page.waitForLoadState('networkidle');
            await page.locator('#task-title').fill('Reunião com cliente');
            await page.click('#btn-save-task');
            await page.waitForTimeout(300);

            // Navigate to Task Board
            await page.goto(TASKBOARD_URL);
            await page.waitForLoadState('networkidle');

            // Search
            await page.locator('#board-search').fill('Reunião');
            await page.waitForTimeout(300);

            await expect(page.locator('.task-card')).toHaveCount(1);
            await expect(page.locator('.card-title')).toContainText('Reunião');

            // Search for non-matching
            await page.locator('#board-search').fill('Inexistente');
            await page.waitForTimeout(300);

            await expect(page.locator('.empty-state')).toBeVisible();
        });
    });
});
