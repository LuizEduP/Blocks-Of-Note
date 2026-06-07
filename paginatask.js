// ============================================
// MODULE: Tasks
// Arquivo: paginatask.js
// Data Layer extraída para shared/tasks-storage.js
// ============================================

const TaskApp = (() => {
    const LIMITS = {
        TITLE_MAX: 200,
        DESC_MAX: 1000,
        LOCATION_MAX: 200,
    };

    const URGENCY_LABELS = {
        low: 'I — Baixa',
        medium: 'II — Média',
        high: 'III — Alta',
        extra: 'IV — Extra',
    };

    const elements = {
        btnSave: document.getElementById('btn-save-task'),
        taskTitle: document.getElementById('task-title'),
        taskDate: document.getElementById('task-date'),
        taskTime: document.getElementById('task-time'),
        taskLocation: document.getElementById('task-location'),
        taskDesc: document.getElementById('task-desc'),
        selectUrgency: document.getElementById('urgencySelect'),
        urgencyIndicator: document.getElementById('urgency-indicator'),
        urgencyDot: document.getElementById('urgency-dot'),
        urgencyText: document.getElementById('urgency-text'),
        charCount: document.getElementById('task-char-count'),
    };

    // Data Layer agora em TasksStorage (shared/tasks-storage.js)
    const { getTasks, createTask } = TasksStorage;

    // --- Urgency Preview ---
    function updateUrgencyPreview() {
        const value = elements.selectUrgency.value;
        elements.urgencyIndicator.className = 'urgency-indicator';
        elements.urgencyIndicator.classList.add(`urgency-${value}`);
        elements.urgencyText.textContent = URGENCY_LABELS[value] || 'II — Média';
    }

    // --- Validation ---
    function validateTask(title, description, location) {
        if (!title || title.trim().length === 0) {
            Toast.show('O título da tarefa é obrigatório.', { type: 'error', duration: 3000 });
            return false;
        }
        if (title.length > LIMITS.TITLE_MAX) {
            Toast.show(`O título deve ter no máximo ${LIMITS.TITLE_MAX} caracteres.`, { type: 'error', duration: 3000 });
            return false;
        }
        if (description.length > LIMITS.DESC_MAX) {
            Toast.show(`A descrição deve ter no máximo ${LIMITS.DESC_MAX} caracteres.`, { type: 'error', duration: 3000 });
            return false;
        }
        if (location.length > LIMITS.LOCATION_MAX) {
            Toast.show(`O local deve ter no máximo ${LIMITS.LOCATION_MAX} caracteres.`, { type: 'error', duration: 3000 });
            return false;
        }
        return true;
    }

    // --- Character Counter ---
    function updateCharCount() {
        if (elements.charCount) {
            const len = elements.taskDesc.value.length;
            elements.charCount.textContent = `${len}/${LIMITS.DESC_MAX}`;
        }
    }

    // --- Save Task ---
    function handleSaveTask(e) {
        e.preventDefault();

        const title = elements.taskTitle.value.trim();
        const description = elements.taskDesc.value || '';
        const location = elements.taskLocation.value || '';

        if (!validateTask(title, description, location)) {
            return;
        }

        const task = createTask({
            title: title,
            date: elements.taskDate.value || '',
            time: elements.taskTime.value || '',
            location: location,
            description: description,
            urgency: elements.selectUrgency.value,
        });

        // Clear form
        elements.taskTitle.value = '';
        elements.taskDate.value = '';
        elements.taskTime.value = '';
        elements.taskLocation.value = '';
        elements.taskDesc.value = '';
        elements.selectUrgency.value = 'medium';
        updateUrgencyPreview();
        updateCharCount();

        Toast.show('Tarefa salva com sucesso!', { type: 'success', duration: 2500 });
        elements.taskTitle.focus();
    }

    // --- Init ---
    function init() {
        updateUrgencyPreview();
        updateCharCount();
        bindEvents();
    }

    function bindEvents() {
        elements.selectUrgency.addEventListener('change', updateUrgencyPreview);
        elements.btnSave.addEventListener('click', handleSaveTask);
        elements.taskDesc.addEventListener('input', updateCharCount);

        // Enter no título vai para descrição
        elements.taskTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                elements.taskDesc.focus();
            }
        });
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => TaskApp.init());
