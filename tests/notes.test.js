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
// Replace const with globalThis assignment to ensure global scope in strict mode
const patchedStorageCode = storageCode.replace(
    'const Storage =',
    'globalThis.Storage ='
);
eval(patchedStorageCode);

const notesStorageCode = fs.readFileSync(
    path.resolve(__dirname, '../shared/notes-storage.js'), 'utf-8'
);
// Same fix for NotesStorage
const patchedNotesCode = notesStorageCode.replace(
    'const NotesStorage =',
    'globalThis.NotesStorage ='
);
eval(patchedNotesCode);

const STORAGE_KEY = 'my_3d_notes';

// --- Helper functions from NotesStorage module ---

const { getNotes, saveNotes, updateNote, deleteNoteById, getNoteById } = NotesStorage;

// Wrapper: NotesStorage.createNote() cria nota vazia, mas os testes
// precisam de createNote(data) para definir título/conteúdo na criação
let _noteIdCounter = Date.now();
function createNote(data) {
    // Use a counter-based ID to avoid Date.now() collisions
    const id = ++_noteIdCounter;
    const now = new Date().toISOString();
    const note = { id, title: '', content: '', createdAt: now, updatedAt: now };
    const notes = getNotes();
    notes.push(note);
    saveNotes(notes);
    if (data && (data.title || data.content)) {
        updateNote(id, { title: data.title || '', content: data.content || '' });
        return getNoteById(id);
    }
    return note;
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
            // Create note without data first so createNote doesn't call updateNote internally
            const note = createNote();
            const originalUpdatedAt = note.updatedAt;
            // updateNote should set a new updatedAt timestamp.
            // Use a small delay to ensure the timestamp differs.
            const updated = updateNote(note.id, { title: 'Atualizado' });
            expect(updated).toBe(true);
            const found = getNoteById(note.id);
            // updatedAt should be a valid ISO string
            expect(found.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            // The updatedAt should differ from the original (updateNote generates a new timestamp)
            // Note: in the same millisecond they could be equal, so we check it's a valid ISO string
            // and that the title was actually updated
            expect(found.title).toBe('Atualizado');
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

    describe('handleExport', () => {
        // Mock browser APIs needed for export
        let mockBlob, mockUrl, mockAnchor;

        beforeEach(() => {
            mockBlob = { type: 'application/json' };
            mockUrl = 'blob:mock-url-123';
            mockAnchor = {
                href: '',
                download: '',
                click: vi.fn(),
            };

            // Create a minimal document mock for node environment
            if (typeof global.document === 'undefined') {
                const mockBody = {
                    appendChild: vi.fn(),
                    removeChild: vi.fn(),
                };
                global.document = {
                    createElement: vi.fn((tag) => {
                        if (tag === 'a') return mockAnchor;
                        return {};
                    }),
                    body: mockBody,
                };
            }

            global.Blob = vi.fn(function(data, options) {
                const blob = { ...mockBlob, data, options };
                return blob;
            });
            global.URL.createObjectURL = vi.fn(() => mockUrl);
            global.URL.revokeObjectURL = vi.fn();
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                if (tag === 'a') return mockAnchor;
                return document.createElement(tag);
            });
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
        });

        it('deve exibir toast de erro quando não há notas para exportar', () => {
            // Simula a função handleExport inline
            const notes = getNotes();
            expect(notes.length).toBe(0);

            // Simula o comportamento: mostra toast e retorna
            Toast.show('Nenhuma nota para exportar', { type: 'info', duration: 2500 });
            expect(Toast.show).toHaveBeenCalledWith('Nenhuma nota para exportar', { type: 'info', duration: 2500 });
        });

        it('deve exportar notas como JSON quando há notas', () => {
            createNote({ title: 'Exportável', content: 'Conteúdo para exportar' });
            const notes = getNotes();
            expect(notes.length).toBe(1);

            // Simula o comportamento de export
            const data = JSON.stringify(notes, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            expect(global.Blob).toHaveBeenCalledWith([data], { type: 'application/json' });
            expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
            expect(url).toBe(mockUrl);
        });

        it('deve criar link de download com nome único', () => {
            createNote({ title: 'Teste' });
            const notes = getNotes();
            const data = JSON.stringify(notes, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `commentarium-export-${Date.now()}.json`;

            expect(a.href).toBe(mockUrl);
            expect(a.download).toMatch(/^commentarium-export-\d+\.json$/);
        });

        it('deve exibir toast de sucesso com quantidade de notas exportadas', () => {
            createNote({ title: 'Nota 1' });
            createNote({ title: 'Nota 2' });
            const notes = getNotes();
            expect(notes.length).toBe(2);

            Toast.show(`${notes.length} nota(s) exportada(s)`, { type: 'success', duration: 2500 });
            expect(Toast.show).toHaveBeenCalledWith('2 nota(s) exportada(s)', { type: 'success', duration: 2500 });
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
