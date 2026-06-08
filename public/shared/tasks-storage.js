// ============================================
// tasks-storage.js — Data Layer de Tarefas
// Módulo separado para CRUD de tarefas no localStorage
// ============================================

const TasksStorage = (() => {
    const STORAGE_KEY = 'my_3d_tasks';

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
            done: data.done || false,
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

    return {
        getTasks,
        saveTasks,
        createTask,
        updateTask,
        deleteTaskById,
        getTaskById,
    };
})();
