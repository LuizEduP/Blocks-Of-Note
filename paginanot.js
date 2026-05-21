// ============================================
// MODULE: Notes
// Arquivo: paginanot.js
// Dependências: shared/base.css, shared/toast.js, shared/storage.js, paginanot.css
// ============================================

const NotesApp = (() => {
    // --- Constants ---
    const STORAGE_KEY = 'my_3d_notes';

    // --- Validation Limits ---
    const LIMITS = {
        TITLE_MAX: 200,
        CONTENT_MAX: 5000,
    };

    // --- State ---
    const state = {
        currentNoteId: null,
        isRemovingMode: false,
    };

    // --- DOM References ---
    const elements = {
        mainContainer: document.getElementById('main-container'),
        sceneCenter: document.getElementById('scene-center'),
        btnCreate: document.getElementById('btn-create'),
        btnRemove: document.getElementById('btn-remove'),
        orbitContainer: document.getElementById('notes-orbit'),
        modal: document.getElementById('note-modal'),
        noteText: document.getElementById('note-text'),
        btnSave: document.getElementById('btn-save'),
        btnCancel: document.getElementById('btn-cancel'),
        titleInput: document.getElementById('note-title-input'),
        dateDisplay: document.getElementById('note-date-display'),
        searchInput: document.getElementById('notes-search-input'),
        btnExport: document.getElementById('btn-export'),
    };

    // ==========================================
    // DATA LAYER (CRUD localStorage)
    // ==========================================

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

    // ==========================================
    // UI LAYER (Renderização e DOM)
    // ==========================================

    function renderCube(id) {
        const miniScene = document.createElement('div');
        miniScene.className = 'mini-note-scene';
        miniScene.dataset.id = id;

        const cube = document.createElement('div');
        cube.className = 'mini-cube';

        const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
        faces.forEach(f => {
            const face = document.createElement('div');
            face.className = `face ${f}`;
            cube.appendChild(face);
        });

        miniScene.appendChild(cube);
        miniScene.style.animationDelay = `${Math.random() * -12}s`;

        miniScene.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.isRemovingMode) {
                deleteNote(id, miniScene);
            } else {
                openEditor(id);
            }
        });

        elements.orbitContainer.appendChild(miniScene);
    }

    function deleteNote(id, element) {
        // 1. Atualiza o localStorage
        deleteNoteById(id);

        // 2. Toast feedback
        Toast.show('Nota excluída', { type: 'info', duration: 2000 });

        // 3. Aplica a classe de animação de saída
        element.classList.add('removing-animation');

        // 4. Aguarda a animação do CSS (300ms) antes de remover do DOM
        setTimeout(() => {
            element.remove();
        }, 300);
    }

    function openEditor(id) {
        state.currentNoteId = id;
        const note = getNoteById(id);

        elements.titleInput.value = note?.title || '';
        elements.noteText.value = note?.content || '';

        const date = new Date(id);
        elements.dateDisplay.innerText = date.toLocaleDateString('pt-BR');

        elements.modal.classList.add('modal-open');
    }

    function closeEditor() {
        elements.modal.classList.remove('modal-open');
        state.currentNoteId = null;
    }

    function resetRemoveButton() {
        elements.btnRemove.classList.remove('btn-remove-active');
        elements.btnRemove.classList.add('btn-remove-normal');
        elements.btnRemove.innerText = "REMOVE";
    }

    function setRemoveButtonActive() {
        elements.btnRemove.classList.add('btn-remove-active');
        elements.btnRemove.classList.remove('btn-remove-normal');
        elements.btnRemove.innerText = "CANCEL";
    }

    function loadExistingNotes() {
        const notes = getNotes();
        notes.forEach(note => renderCube(note.id));
    }

    // ==========================================
    // CONTROLLER LAYER (Eventos e Orquestração)
    // ==========================================

    function handleSceneCenterClick(e) {
        e.stopPropagation();
        elements.mainContainer.classList.toggle('active');
        state.isRemovingMode = false;
        elements.orbitContainer.classList.remove('removing');
        resetRemoveButton();
    }

    function handleCreate(e) {
        e.stopPropagation();
        const note = createNote({ title: '', content: '' });
        renderCube(note.id);
        elements.mainContainer.classList.remove('active');
        Toast.show('Nova nota criada', { type: 'success', duration: 2000 });
    }

    function handleRemoveToggle(e) {
        e.stopPropagation();
        state.isRemovingMode = !state.isRemovingMode;

        elements.orbitContainer.classList.toggle('removing', state.isRemovingMode);

        if (state.isRemovingMode) {
            setRemoveButtonActive();
        } else {
            resetRemoveButton();
        }
    }

    function validateNote(title, content) {
        if (title.length > LIMITS.TITLE_MAX) {
            Toast.show(`O título deve ter no máximo ${LIMITS.TITLE_MAX} caracteres.`, {
                type: 'error', duration: 3000,
            });
            return false;
        }
        if (content.length > LIMITS.CONTENT_MAX) {
            Toast.show(`O conteúdo deve ter no máximo ${LIMITS.CONTENT_MAX} caracteres.`, {
                type: 'error', duration: 3000,
            });
            return false;
        }
        return true;
    }

    function handleSave() {
        const title = elements.titleInput.value;
        const content = elements.noteText.value;

        if (!validateNote(title, content)) return;

        const saved = updateNote(state.currentNoteId, { title, content });
        closeEditor();

        if (saved) {
            Toast.show('Nota salva', { type: 'success', duration: 2000 });
        } else {
            Toast.show('Erro ao salvar nota', { type: 'error', duration: 3000 });
        }
    }

    function handleCancel() {
        closeEditor();
    }

    function handleOutsideClick(e) {
        if (!elements.orbitContainer.contains(e.target)) {
            elements.mainContainer.classList.remove('active');
            state.isRemovingMode = false;
            elements.orbitContainer.classList.remove('removing');
            resetRemoveButton();
        }
    }

    // ==========================================
    // SEARCH (Fase 4.2)
    // ==========================================

    function handleSearch() {
        const query = (elements.searchInput.value || '').toLowerCase().trim();
        const scenes = elements.orbitContainer.querySelectorAll('.mini-note-scene');

        scenes.forEach(scene => {
            const id = parseInt(scene.dataset.id, 10);
            const note = getNoteById(id);
            if (!note) return;

            const matches = !query ||
                (note.title && note.title.toLowerCase().includes(query)) ||
                (note.content && note.content.toLowerCase().includes(query));

            scene.style.display = matches ? '' : 'none';
        });
    }

    // ==========================================
    // EXPORT (Fase 4.3)
    // ==========================================

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

    function bindEvents() {
        elements.sceneCenter.addEventListener('click', handleSceneCenterClick);
        elements.btnCreate.addEventListener('click', handleCreate);
        elements.btnRemove.addEventListener('click', handleRemoveToggle);
        elements.btnSave.addEventListener('click', handleSave);
        elements.btnCancel.addEventListener('click', handleCancel);
        document.addEventListener('click', handleOutsideClick);

        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', handleSearch);
        }
        if (elements.btnExport) {
            elements.btnExport.addEventListener('click', handleExport);
        }
    }

    // --- Init ---
    function init() {
        loadExistingNotes();
        bindEvents();
    }

    // --- Public API ---
    return { init };
})();

document.addEventListener('DOMContentLoaded', () => NotesApp.init());
