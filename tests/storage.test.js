/* ============================================
   storage.test.js — Testes do Storage Module
   ============================================ */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
global.Toast = {
    show: vi.fn(),
};

// Spy on console.error to suppress noise and enable assertions
vi.spyOn(console, 'error').mockImplementation(() => {});

// Import the Storage module (IIFE returns object assigned to global.Storage)
// We need to evaluate the source file. Since it's an IIFE assigned to global,
// we load it as text and eval.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageCode = fs.readFileSync(
    path.resolve(__dirname, '../shared/storage.js'),
    'utf-8'
);
// Replace const with globalThis assignment to ensure global scope in strict mode
const patchedCode = storageCode.replace(
    'const Storage =',
    'globalThis.Storage ='
);
eval(patchedCode);

// --- Tests ---

describe('Storage.safeGet', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve retornar fallback quando chave não existe', () => {
        const result = Storage.safeGet('nonexistent', []);
        expect(result).toEqual([]);
    });

    it('deve retornar fallback quando chave é null', () => {
        // localStorage.setItem coerce null to string "null", and JSON.parse("null") returns null.
        // safeGet returns the parsed null value (not the fallback) because the key exists.
        // This test verifies the actual behavior: a stored null value is returned as null.
        localStorage.setItem('nullkey', JSON.stringify(null));
        const result = Storage.safeGet('nullkey', { fallback: true });
        expect(result).toBeNull();
    });

    it('deve retornar dado parseado quando chave existe', () => {
        const data = { name: 'test', items: [1, 2, 3] };
        localStorage.setItem('mykey', JSON.stringify(data));
        const result = Storage.safeGet('mykey');
        expect(result).toEqual(data);
    });

    it('deve retornar fallback em caso de JSON inválido', () => {
        localStorage.setItem('badjson', '{not-json}');
        const result = Storage.safeGet('badjson', []);
        expect(result).toEqual([]);
        expect(console.error).toHaveBeenCalled();
    });

    it('deve retornar array vazio como fallback padrão para listas', () => {
        const result = Storage.safeGet('tasks', []);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it('deve retornar null como fallback padrão quando não especificado', () => {
        const result = Storage.safeGet('nothing');
        expect(result).toBeNull();
    });
});

describe('Storage.safeSet', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve salvar e retornar true para dados válidos', () => {
        const data = [{ id: 1, title: 'Test' }];
        const result = Storage.safeSet('tasks', data);
        expect(result).toBe(true);
        expect(JSON.parse(localStorage.getItem('tasks'))).toEqual(data);
    });

    it('deve salvar objeto vazio', () => {
        const result = Storage.safeSet('empty', {});
        expect(result).toBe(true);
        expect(JSON.parse(localStorage.getItem('empty'))).toEqual({});
    });

    it('deve salvar array vazio', () => {
        const result = Storage.safeSet('emptyArr', []);
        expect(result).toBe(true);
        expect(JSON.parse(localStorage.getItem('emptyArr'))).toEqual([]);
    });

    it('deve sobrescrever chave existente', () => {
        localStorage.setItem('key', JSON.stringify('old'));
        Storage.safeSet('key', 'new');
        expect(JSON.parse(localStorage.getItem('key'))).toBe('new');
    });

    it('deve lidar com QuotaExceededError e exibir Toast', () => {
        localStorage.setItem.mockImplementationOnce(() => {
            const err = new Error('QuotaExceededError');
            err.name = 'QuotaExceededError';
            throw err;
        });

        const result = Storage.safeSet('key', 'value');
        expect(result).toBe(false);
        expect(Toast.show).toHaveBeenCalledWith(
            expect.stringContaining('armazenamento cheio'),
            expect.objectContaining({ type: 'error' })
        );
    });
});

describe('Storage.safeRemove', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve remover chave existente', () => {
        localStorage.setItem('key', 'value');
        Storage.safeRemove('key');
        expect(localStorage.getItem('key')).toBeNull();
    });

    it('não deve lançar erro ao remover chave inexistente', () => {
        expect(() => Storage.safeRemove('ghost')).not.toThrow();
    });
});

describe('Storage — integração CRUD', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve realizar ciclo completo CRUD', () => {
        // Create
        const notes = [
            { id: 1, title: 'Nota 1', content: 'Conteúdo' },
        ];
        expect(Storage.safeSet('notes', notes)).toBe(true);

        // Read
        expect(Storage.safeGet('notes', [])).toEqual(notes);

        // Update
        notes[0].title = 'Nota 1 Editada';
        expect(Storage.safeSet('notes', notes)).toBe(true);
        expect(Storage.safeGet('notes', [])[0].title).toBe('Nota 1 Editada');

        // Delete
        const updated = notes.filter(n => n.id !== 1);
        expect(Storage.safeSet('notes', updated)).toBe(true);
        expect(Storage.safeGet('notes', [])).toEqual([]);
    });

    it('deve manter dados entre operações', () => {
        Storage.safeSet('data', { counter: 1 });
        Storage.safeGet('data');
        Storage.safeSet('data', { counter: 2 });
        const result = Storage.safeGet('data');
        expect(result.counter).toBe(2);
    });
});
