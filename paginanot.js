// ============================================
// MODULE: Notes
// Arquivo: paginanot.js
// Versão simplificada — grid de cards
// Data Layer extraída para shared/notes-storage.js
// ============================================

const NotesApp = (() => {
    const LIMITS = {
        TITLE_MAX: 200,
        CONTENT_MAX: 5000,
    };

    const state = {
        currentNoteId: null,
        isRemovingMode: false,
    };

    const elements = {
        grid: document.getElementById('notes-grid'),
        btnCreate: document.getElementById('btn-create'),
        btnRemove: document.getElementById('btn-remove'),
        btnExport: document.getElementById('btn-export'),
        searchInput: document.getElementById('notes-search-input'),
        stats: document.getElementById('notes-stats'),
        modal: document.getElementById('note-modal'),
        titleInput: document.getElementById('note-title-input'),
        noteText: document.getElementById('note-text'),
        dateDisplay: document.getElementById('note-date-display'),
        btnSave: document.getElementById('btn-save'),
        btnCancel: document.getElementById('btn-cancel'),
    };

    // Data Layer agora em NotesStorage (shared/notes-storage.js)
    const { getNotes, createNote, updateNote, deleteNoteById, getNoteById } = NotesStorage;

    // ==========================================
    // UI LAYER
    // ==========================================

    // Agora usa Utils.escapeHtml e Utils.formatDate de shared/utils.js

    function renderCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.id = note.id;

        const title = note.title || 'Sem título';
        const preview = note.content || 'Nota vazia';
        const date = Utils.formatDate(note.createdAt);

        card.innerHTML = `
            <div class="note-card-title">${Utils.escapeHtml(title)}</div>
            <div class="note-card-preview">${Utils.escapeHtml(preview.substring(0, 150))}${preview.length > 150 ? '...' : ''}</div>
            <div class="note-card-date">${date}</div>
        `;

        card.addEventListener('click', () => {
            if (state.isRemovingMode) {
                handleDelete(note.id, card);
            } else {
                openEditor(note.id);
            }
        });

        return card;
    }

    function render(notes) {
        elements.grid.innerHTML = '';

        if (notes.length === 0) {
            elements.grid.innerHTML = `
                <div class="empty-notes">
                    <p>📝 Nenhuma nota encontrada</p>
                    <button class="btn btn-primary" onclick="NotesApp.createAndRender()">CRIAR PRIMEIRA NOTA</button>
                </div>
            `;
            elements.stats.textContent = '0 notas';
            return;
        }

        notes.forEach(note => {
            elements.grid.appendChild(renderCard(note));
        });

        elements.stats.textContent = `${notes.length} nota${notes.length !== 1 ? 's' : ''}`;
    }

    function loadAndRender() {
        const notes = getNotes();
        render(notes);
    }

    // ==========================================
    // MODAL / EDITOR
    // ==========================================

    // Focus trap: elementos focáveis dentro do modal
    function getFocusableElements() {
        return elements.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
    }

    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    function openEditor(id) {
        state.currentNoteId = id;
        const note = getNoteById(id);

        elements.titleInput.value = note?.title || '';
        elements.noteText.value = note?.content || '';

        const date = new Date(note?.createdAt || id);
        elements.dateDisplay.innerText = date.toLocaleDateString('pt-BR');

        elements.modal.classList.add('modal-open');
        document.addEventListener('keydown', trapFocus);
        setTimeout(() => elements.titleInput.focus(), 100);
    }

    function closeEditor() {
        elements.modal.classList.remove('modal-open');
        document.removeEventListener('keydown', trapFocus);
        state.currentNoteId = null;
    }

    // ==========================================
    // CONTROLLER
    // ==========================================

    function handleCreate() {
        const note = createNote();
        loadAndRender();
        openEditor(note.id);
        Toast.show('Nova nota criada', { type: 'success', duration: 2000 });
    }

    // Exposta para o onclick no empty state
    function createAndRender() {
        handleCreate();
    }

    function handleRemoveToggle() {
        state.isRemovingMode = !state.isRemovingMode;
        elements.grid.classList.toggle('removing', state.isRemovingMode);
        elements.btnRemove.textContent = state.isRemovingMode ? 'CANCELAR' : 'REMOVER';
    }

    function handleDelete(id, cardElement) {
        deleteNoteById(id);
        cardElement.classList.add('removing-animation');
        setTimeout(() => {
            loadAndRender();
            Toast.show('Nota excluída', { type: 'info', duration: 2000 });
        }, 300);
    }

    function validateNote(title, content) {
        if (title.length > LIMITS.TITLE_MAX) {
            Toast.show(`O título deve ter no máximo ${LIMITS.TITLE_MAX} caracteres.`, { type: 'error', duration: 3000 });
            return false;
        }
        if (content.length > LIMITS.CONTENT_MAX) {
            Toast.show(`O conteúdo deve ter no máximo ${LIMITS.CONTENT_MAX} caracteres.`, { type: 'error', duration: 3000 });
            return false;
        }
        return true;
    }

    function handleSave() {
        const title = elements.titleInput.value;
        const content = elements.noteText.value;

        if (!validateNote(title, content)) return;

        // Loading state
        elements.btnSave.classList.add('btn-loading');
        elements.btnSave.disabled = true;

        // Simula um pequeno delay para feedback visual
        setTimeout(() => {
            const saved = updateNote(state.currentNoteId, { title, content });
            closeEditor();
            loadAndRender();

            elements.btnSave.classList.remove('btn-loading');
            elements.btnSave.disabled = false;

            if (saved) {
                Toast.show('Nota salva', { type: 'success', duration: 2000 });
            } else {
                Toast.show('Erro ao salvar nota', { type: 'error', duration: 3000 });
            }
        }, 300);
    }

    function handleCancel() {
        closeEditor();
    }

    function handleSearch() {
        const query = (elements.searchInput.value || '').toLowerCase().trim();

        let notes = getNotes();

        if (query) {
            notes = notes.filter(n =>
                (n.title && n.title.toLowerCase().includes(query)) ||
                (n.content && n.content.toLowerCase().includes(query))
            );
        }

        render(notes);

        // Anúncio para leitores de tela
        const announce = document.getElementById('search-announce');
        if (announce) {
            const msg = query
                ? `${notes.length} nota${notes.length !== 1 ? 's' : ''} encontrada${notes.length !== 1 ? 's' : ''} para "${query}"`
                : `Mostrando todas as ${notes.length} nota${notes.length !== 1 ? 's' : ''}`;
            announce.textContent = msg;
        }
    }

    function handleExport() {
        try {
            const notes = getNotes();
            if (notes.length === 0) {
                Toast.show('Nenhuma nota para exportar', { type: 'info', duration: 2500 });
                return;
            }

            const data = JSON.stringify(notes, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `blocks-of-note-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Toast.show(`${notes.length} nota(s) exportada(s)`, { type: 'success', duration: 2500 });
        } catch (e) {
            console.error('Erro ao exportar notas:', e);
            Toast.show('Erro ao exportar notas', { type: 'error', duration: 3000 });
        }
    }

    function handleOutsideClick(e) {
        if (state.isRemovingMode && !elements.grid.contains(e.target) && !elements.btnRemove.contains(e.target)) {
            state.isRemovingMode = false;
            elements.grid.classList.remove('removing');
            elements.btnRemove.textContent = 'REMOVER';
        }
    }

    function bindEvents() {
        elements.btnCreate.addEventListener('click', handleCreate);
        elements.btnRemove.addEventListener('click', handleRemoveToggle);
        elements.btnExport.addEventListener('click', handleExport);
        elements.btnSave.addEventListener('click', handleSave);
        elements.btnCancel.addEventListener('click', handleCancel);
        elements.searchInput.addEventListener('input', handleSearch);
        document.addEventListener('click', handleOutsideClick);

        // Fechar modal com Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.modal.classList.contains('modal-open')) {
                closeEditor();
            }
        });
    }

    function init() {
        loadAndRender();
        bindEvents();
    }

    return { init, createAndRender };
})();

document.addEventListener('DOMContentLoaded', () => NotesApp.init());
