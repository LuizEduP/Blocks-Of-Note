// ============================================
// notes-storage.js — Data Layer de Notas
// Módulo separado para CRUD de notas no localStorage
// ============================================

const NotesStorage = (() => {
    const STORAGE_KEY = 'my_3d_notes';

    function getNotes() {
        return Storage.safeGet(STORAGE_KEY, []);
    }

    function saveNotes(notes) {
        return Storage.safeSet(STORAGE_KEY, notes);
    }

    function createNote() {
        const notes = getNotes();
        const note = {
            id: Date.now(),
            title: '',
            content: '',
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

    return {
        getNotes,
        saveNotes,
        createNote,
        updateNote,
        deleteNoteById,
        getNoteById,
    };
})();
