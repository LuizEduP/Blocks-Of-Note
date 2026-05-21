/* ============================================
   tasks.test.js — Testes da Lógica de Tarefas
   Testa as funções CRUD e validação de tarefas
   ============================================ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mocks ---

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = String(value); }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((i) => Object.keys(store)[i] ?? null),
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

global.Toast = { show: vi.fn() };
vi.spyOn(console, 'error').mockImplementation(() => {});

// Load Storage module
const storageCode = fs.readFileSync(
    path.resolve(__dirname, '../shared/storage.js'), 'utf-8'
);
eval(storageCode);

const STORAGE_KEY = 'my_3d_tasks';

// --- Helper functions extracted from TaskApp Data Layer ---

function getTasks() {
    return Storage.safeGet(STORAGE_KEY, []);
}

function saveTasks(tasks) {
    return Storage.safeSet(STORAGE_KEY, tasks);
}

function createTask(data) {
    const tasks = getTasks();
    const task = {
        id: Date.now(),
        title: data.title || '',
        date: data.date || '',
        time: data.time || '',
        location: data.location || '',
        description: data.description || '',
        urgency: data.urgency || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    tasks.push(task);
    saveTasks(tasks);
    return task;
}

function updateTask(id, data) {
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
    saveTasks(tasks);
    return true;
}

function deleteTaskById(id) {
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
}

function getTaskById(id) {
    return getTasks().find(t => t.id === id) || null;
}

// Validation function matching paginatask.js
function validateTask(title, description, location) {
    const LIMITS = { TITLE_MAX: 200, DESC_MAX: 1000, LOCATION_MAX: 200 };
    if (!title || title.length === 0) {
        return { valid: false, message: 'O título da tarefa é obrigatório.' };
    }
    if (title.length > LIMITS.TITLE_MAX) {
        return { valid: false, message: `O título deve ter no máximo ${LIMITS.TITLE_MAX} caracteres.` };
    }
    if (description.length > LIMITS.DESC_MAX) {
        return { valid: false, message: `A descrição deve ter no máximo ${LIMITS.DESC_MAX} caracteres.` };
    }
    if (location.length > LIMITS.LOCATION_MAX) {
        return { valid: false, message: `O local deve ter no máximo ${LIMITS.LOCATION_MAX} caracteres.` };
    }
    return { valid: true, message: '' };
}

// --- Tests ---

describe('Tasks Data Layer', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('getTasks / getTaskById', () => {
        it('deve retornar array vazio quando não há tarefas', () => {
            expect(getTasks()).toEqual([]);
        });

        it('deve retornar tarefas salvas', () => {
            const data = [{ id: 1, title: 'Tarefa 1', urgency: 'medium' }];
            saveTasks(data);
            expect(getTasks()).toEqual(data);
        });

        it('deve encontrar tarefa por ID', () => {
            const task = createTask({ title: 'Encontrável' });
            expect(getTaskById(task.id).title).toBe('Encontrável');
        });

        it('deve retornar null para ID inexistente', () => {
            expect(getTaskById(999)).toBeNull();
        });
    });

    describe('createTask', () => {
        it('deve criar tarefa com todos os campos', () => {
            const task = createTask({
                title: 'Comprar pão',
                date: '2026-05-25',
                time: '14:00',
                location: 'Padaria',
                description: 'Pão francês',
                urgency: 'high',
            });
            expect(task.title).toBe('Comprar pão');
            expect(task.date).toBe('2026-05-25');
            expect(task.time).toBe('14:00');
            expect(task.location).toBe('Padaria');
            expect(task.description).toBe('Pão francês');
            expect(task.urgency).toBe('high');
            expect(task.createdAt).toBeDefined();
            expect(task.updatedAt).toBeDefined();
        });

        it('deve usar valores padrão para campos opcionais', () => {
            const task = createTask({ title: 'Mínima' });
            expect(task.date).toBe('');
            expect(task.time).toBe('');
            expect(task.location).toBe('');
            expect(task.description).toBe('');
            expect(task.urgency).toBe('medium');
        });

        it('deve persistir no localStorage', () => {
            createTask({ title: 'Persistente' });
            expect(getTasks().length).toBe(1);
        });
    });

    describe('updateTask', () => {
        it('deve atualizar campos da tarefa', () => {
            const task = createTask({ title: 'Original', urgency: 'low' });
            const updated = updateTask(task.id, { title: 'Editada', urgency: 'high' });
            expect(updated).toBe(true);
            const found = getTaskById(task.id);
            expect(found.title).toBe('Editada');
            expect(found.urgency).toBe('high');
        });

        it('deve retornar false para ID inexistente', () => {
            expect(updateTask(999, { title: 'Ghost' })).toBe(false);
        });
    });

    describe('deleteTaskById', () => {
        it('deve remover tarefa existente', () => {
            const task = createTask({ title: 'Remover' });
            expect(getTasks().length).toBe(1);
            deleteTaskById(task.id);
            expect(getTasks().length).toBe(0);
        });

        it('deve preservar outras tarefas', () => {
            const t1 = createTask({ title: 'T1' });
            createTask({ title: 'T2' });
            deleteTaskById(t1.id);
            expect(getTasks().length).toBe(1);
        });
    });

    describe('validação de tarefas', () => {
        it('deve rejeitar título vazio', () => {
            const result = validateTask('', '', '');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('obrigatório');
        });

        it('deve rejeitar título muito longo', () => {
            const result = validateTask('A'.repeat(201), '', '');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('200');
        });

        it('deve rejeitar descrição muito longa', () => {
            const result = validateTask('Título', 'A'.repeat(1001), '');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('1000');
        });

        it('deve rejeitar local muito longo', () => {
            const result = validateTask('Título', '', 'A'.repeat(201));
            expect(result.valid).toBe(false);
            expect(result.message).toContain('200');
        });

        it('deve aceitar dados válidos', () => {
            const result = validateTask('Título válido', 'Descrição curta', 'Local');
            expect(result.valid).toBe(true);
        });

        it('deve aceitar título no limite máximo', () => {
            const result = validateTask('A'.repeat(200), '', '');
            expect(result.valid).toBe(true);
        });

        it('deve aceitar descrição no limite máximo', () => {
            const result = validateTask('Título', 'A'.repeat(1000), '');
            expect(result.valid).toBe(true);
        });
    });

    describe('Schema da tarefa', () => {
        it('deve ter todos os campos do schema definido na arquitetura', () => {
            const task = createTask({ title: 'Schema Test' });
            expect(task).toHaveProperty('id');
            expect(task).toHaveProperty('title');
            expect(task).toHaveProperty('date');
            expect(task).toHaveProperty('time');
            expect(task).toHaveProperty('location');
            expect(task).toHaveProperty('description');
            expect(task).toHaveProperty('urgency');
            expect(task).toHaveProperty('createdAt');
            expect(task).toHaveProperty('updatedAt');
        });

        it('deve ter urgência válida', () => {
            const validUrgencies = ['low', 'medium', 'high', 'extra'];
            const task = createTask({ title: 'Urgência' });
            expect(validUrgencies).toContain(task.urgency);
        });
    });
});
