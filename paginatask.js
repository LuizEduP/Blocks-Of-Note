// ============================================
// MODULE: Tasks — Controller
// Arquivo: paginatask.js
// Dependências: shared/toast.js, shared/storage.js
// ============================================

const TaskApp = (() => {
    // --- Constants ---
    const STORAGE_KEY = 'my_3d_tasks';

    // --- Validation Limits ---
    const LIMITS = {
        TITLE_MAX: 200,
        DESC_MAX: 1000,
        LOCATION_MAX: 200,
    };

    const state = {};

    // --- DOM References ---
    const elements = {
        cubeMain: document.getElementById("cube"),
        selectUrgency: document.getElementById("urgencySelect"),
        btnSave: document.getElementById("btn-save-task"),
        taskTitle: document.getElementById("task-title"),
        taskDate: document.getElementById("task-date"),
        taskTime: document.getElementById("task-time"),
        taskLocation: document.getElementById("task-location"),
        taskDesc: document.getElementById("task-desc"),
    };

    // --- Urgency Control ---
    function handleUrgencyChange() {
        const cube = elements.cubeMain;
        const select = elements.selectUrgency;
        if (!cube || !select) return;

        cube.classList.remove("low", "medium", "high", "extra");

        const value = select.value;
        if (value === "low") {
            cube.classList.add("low");
        } else if (value === "medium") {
            cube.classList.add("medium");
        } else if (value === "high") {
            cube.classList.add("high");
        } else if (value === "extra") {
            cube.classList.add("extra");
        }
    }

    function setInitialUrgency() {
        if (elements.cubeMain && elements.selectUrgency) {
            const initialValue = elements.selectUrgency.value;
            if (initialValue) {
                elements.cubeMain.classList.add(initialValue);
            }
        }
    }

    // --- Validation ---
    function validateTask(title, description, location) {
        if (!title || title.length === 0) {
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

    // --- Save Task ---
    function handleSaveTask(e) {
        e.preventDefault();

        const title = elements.taskTitle.value.trim();
        const description = elements.taskDesc.value || '';
        const location = elements.taskLocation.value || '';

        if (!validateTask(title, description, location)) {
            return;
        }

        const task = {
            id: Date.now(),
            title: title,
            date: elements.taskDate.value || "",
            time: elements.taskTime.value || "",
            location: location,
            description: description,
            urgency: elements.selectUrgency.value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const tasks = Storage.safeGet(STORAGE_KEY, []);
        tasks.push(task);
        const saved = Storage.safeSet(STORAGE_KEY, tasks);
        if (!saved) return;

        // Clear form
        elements.taskTitle.value = "";
        elements.taskDate.value = "";
        elements.taskTime.value = "";
        elements.taskLocation.value = "";
        elements.taskDesc.value = "";
        elements.selectUrgency.value = "medium";
        setInitialUrgency();

        Toast.show('Tarefa salva com sucesso!', { type: 'success', duration: 2500 });
    }

    // --- Init ---
    function init() {
        setInitialUrgency();
        bindEvents();
    }

    function bindEvents() {
        if (elements.selectUrgency) {
            elements.selectUrgency.addEventListener("change", handleUrgencyChange);
        }
        if (elements.btnSave) {
            elements.btnSave.addEventListener("click", handleSaveTask);
        }
    }

    // --- Public API ---
    return { init };
})();

document.addEventListener("DOMContentLoaded", () => TaskApp.init());