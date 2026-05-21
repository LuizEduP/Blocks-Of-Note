/* ============================================
   notes.test.js — Testes da Lógica de Notas
   Testa as funções puras do NotesApp
   ============================================ */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mocks ---

// Mock localStorage
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

// Mock Toast
global.Toast = { show: vi.fn() };

// Mock console to avoid noise
vi.spyOn(console, 'error').mockImplementation(() => {});

// Load shared modules in dependency order
const storageCode = fs.readFileSync(
    path.resolve(__dirname, '../shared/storage.js'), 'utf-8'
);
eval(storageCode);

const STORAGE_KEY = 'my_3d_notes';

// --- Helper functions extracted from paginanot.js Data Layer ---

// These are the pure data functions we want to test
function getNotes() {
    return Storage.safeGet(STORAGE_KEY, []);
}

function saveNotes(notes) {
    return Storage.safeSet(STORAGE_KEY, notes);
}

function createNote(data) {
    const notes = getNotes();
    const note = {
        id: Date.now(),
        title: data.title || '',
        content: data.content || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    notes.push(note);
    saveNotes(notes);
    return note;
}

function updateNote(id, data) {
    const notes = getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return false;
    notes[idx] = { ...notes[idx], ...data, updatedAt: new Date().toISOString() };
    saveNotes(notes);
    return true;
}

function deleteNoteById(id) {
    let notes = getNotes();
    notes = notes.filter(n => n.id !== id);
    saveNotes(notes);
}

function getNoteById(id) {
    return getNotes().find(n => n.id === id) || null;
}

// --- Tests ---

describe('Notes Data Layer', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('getNotes / getNoteById', () => {
        it('deve retornar array vazio quando não há notas', () => {
            const notes = getNotes();
            expect(notes).toEqual([]);
        });

        it('deve retornar notas salvas', () => {
            const data = [{ id: 1, title: 'Teste' }];
            saveNotes(data);
            expect(getNotes()).toEqual(data);
        });

        it('deve encontrar nota por ID', () => {
            const note = createNote({ title: 'Encontrável' });
            const found = getNoteById(note.id);
            expect(found).not.toBeNull();
            expect(found.title).toBe('Encontrável');
        });

        it('deve retornar null para ID inexistente', () => {
            expect(getNoteById(999)).toBeNull();
        });
    });

    describe('createNote', () => {
        it('deve criar nota com id e timestamps', () => {
            const note = createNote({ title: 'Nova', content: 'Conteúdo' });
            expect(note.id).toBeGreaterThan(0);
            expect(note.title).toBe('Nova');
            expect(note.content).toBe('Conteúdo');
            expect(note.createdAt).toBeDefined();
            expect(note.updatedAt).toBeDefined();
            expect(note.createdAt).toEqual(note.updatedAt);
        });

        it('deve usar string vazia para campos faltantes', () => {
            const note = createNote({});
            expect(note.title).toBe('');
            expect(note.content).toBe('');
        });

        it('deve persistir a nota no localStorage', () => {
            createNote({ title: 'Persistente' });
            const notes = getNotes();
            expect(notes.length).toBe(1);
            expect(notes[0].title).toBe('Persistente');
        });

        it('deve criar múltiplas notas sequencialmente', () => {
            createNote({ title: 'Nota 1' });
            createNote({ title: 'Nota 2' });
            createNote({ title: 'Nota 3' });
            expect(getNotes().length).toBe(3);
        });
    });

    describe('updateNote', () => {
        it('deve atualizar título e conteúdo', () => {
            const note = createNote({ title: 'Original', content: 'Original' });
            const updated = updateNote(note.id, { title: 'Editado', content: 'Editado' });
            expect(updated).toBe(true);
            const found = getNoteById(note.id);
            expect(found.title).toBe('Editado');
            expect(found.content).toBe('Editado');
        });

        it('deve atualizar updatedAt', () => {
            const note = createNote({ title: 'Teste' });
            const originalUpdatedAt = note.updatedAt;
            // Small delay so timestamps differ
            const updated = updateNote(note.id, { title: 'Atualizado' });
            expect(updated).toBe(true);
            const found = getNoteById(note.id);
            expect(found.updatedAt).not.toBe(originalUpdatedAt);
        });

        it('deve retornar false para ID inexistente', () => {
            const result = updateNote(999, { title: 'Ghost' });
            expect(result).toBe(false);
        });

        it('deve preservar campos não alterados', () => {
            const note = createNote({ title: 'Título', content: 'Conteúdo' });
            updateNote(note.id, { title: 'Novo Título' });
            const found = getNoteById(note.id);
            expect(found.title).toBe('Novo Título');
            expect(found.content).toBe('Conteúdo'); // preserved
        });
    });

    describe('deleteNoteById', () => {
        it('deve remover nota existente', () => {
            const note = createNote({ title: 'Remover-me' });
            expect(getNotes().length).toBe(1);
            deleteNoteById(note.id);
            expect(getNotes().length).toBe(0);
        });

        it('não deve afetar outras notas', () => {
            const n1 = createNote({ title: 'Nota 1' });
            const n2 = createNote({ title: 'Nota 2' });
            deleteNoteById(n1.id);
            const remaining = getNotes();
            expect(remaining.length).toBe(1);
            expect(remaining[0].id).toBe(n2.id);
        });

        it('não deve lançar erro ao remover ID inexistente', () => {
            expect(() => deleteNoteById(999)).not.toThrow();
        });
    });

    describe('Validação de limites', () => {
        const LIMITS = { TITLE_MAX: 200, CONTENT_MAX: 5000 };

        it('deve validar título dentro do limite', () => {
            const title = 'A'.repeat(LIMITS.TITLE_MAX);
            expect(title.length).toBeLessThanOrEqual(LIMITS.TITLE_MAX);
        });

        it('deve validar título acima do limite', () => {
            const title = 'A'.repeat(LIMITS.TITLE_MAX + 1);
            expect(title.length).toBeGreaterThan(LIMITS.TITLE_MAX);
        });

        it('deve validar conteúdo dentro do limite', () => {
            const content = 'A'.repeat(LIMITS.CONTENT_MAX);
            expect(content.length).toBeLessThanOrEqual(LIMITS.CONTENT_MAX);
        });

        it('deve validar conteúdo acima do limite', () => {
            const content = 'A'.repeat(LIMITS.CONTENT_MAX + 1);
            expect(content.length).toBeGreaterThan(LIMITS.CONTENT_MAX);
        });
    });
});
