/* ============================================
   taskboard.js — Board de Tarefas
   Module Pattern IIFE
   Dependências: shared/toast.js, shared/storage.js
   ============================================ */

const TaskBoard = (() => {
    'use strict';

    const STORAGE_KEY = 'my_3d_tasks';

    const elements = {
        grid: document.getElementById('taskboard-grid'),
        searchInput: document.getElementById('taskboard-search'),
        filterSelect: document.getElementById('taskboard-filter'),
        stats: document.getElementById('taskboard-stats'),
    };

    // ==========================================
    // DATA LAYER
    // ==========================================

    function getTasks() {
        return Storage.safeGet(STORAGE_KEY, []);
    }

    function deleteTask(id) {
        let tasks = getTasks();
        tasks = tasks.filter(t => t.id !== id);
        return Storage.safeSet(STORAGE_KEY, tasks);
    }

    // ==========================================
    // UI LAYER
    // ==========================================

    const URGENCY_LABELS = {
        low: 'I (Baixa)',
        medium: 'II (Média)',
        high: 'III (Alta)',
        extra: 'IV (Extra)',
    };

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    function renderCard(task) {
        const card = document.createElement('div');
        card.className = `task-card urgency-${task.urgency || 'medium'}`;
        card.dataset.id = task.id;

        const desc = (task.description || '').substring(0, 120);

        card.innerHTML = `
            <div class="card-urgency" aria-hidden="true"></div>
            <div class="card-body">
                <h2 class="card-title">${escapeHtml(task.title)}</h2>
                <div class="card-meta">
                    ${task.date ? `<span>📅 ${formatDate(task.date)}</span>` : ''}
                    ${task.time ? `<span>⏰ ${escapeHtml(task.time)}</span>` : ''}
                    ${task.location ? `<span>📍 ${escapeHtml(task.location)}</span>` : ''}
                    <span>🏷 ${URGENCY_LABELS[task.urgency] || 'II (Média)'}</span>
                </div>
                ${desc ? `<p class="card-desc">${escapeHtml(desc)}${task.description.length > 120 ? '...' : ''}</p>` : ''}
                <div class="card-actions">
                    <button class="btn-card btn-delete" data-id="${task.id}" aria-label="Excluir tarefa ${escapeHtml(task.title)}">EXCLUIR</button>
                </div>
            </div>
        `;

        // Event delegation for delete button
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDelete(task.id, card);
        });

        return card;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function render(tasks) {
        elements.grid.innerHTML = '';

        if (tasks.length === 0) {
            elements.grid.innerHTML = `
                <div class="empty-state">
                    <p>📋 Nenhuma tarefa encontrada</p>
                    <a href="../paginatask.html" class="btn-header">CRIAR NOVA TAREFA</a>
                </div>
            `;
            elements.stats.textContent = '0 tarefas';
            return;
        }

        tasks.forEach(task => {
            elements.grid.appendChild(renderCard(task));
        });

        elements.stats.textContent = `${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}`;
    }

    // ==========================================
    // CONTROLLER LAYER
    // ==========================================

    function loadAndRender() {
        const tasks = getTasks();
        render(tasks);
    }

    function handleSearch() {
        const query = elements.searchInput.value.toLowerCase().trim();
        const filterUrgency = elements.filterSelect.value;

        let tasks = getTasks();

        // Filter by urgency
        if (filterUrgency !== 'all') {
            tasks = tasks.filter(t => t.urgency === filterUrgency);
        }

        // Filter by search query
        if (query) {
            tasks = tasks.filter(t => {
                return t.title.toLowerCase().includes(query) ||
                       (t.description || '').toLowerCase().includes(query) ||
                       (t.location || '').toLowerCase().includes(query);
            });
        }

        render(tasks);
    }

    function handleDelete(id, cardElement) {
        if (!confirm('Excluir esta tarefa permanentemente?')) return;

        if (deleteTask(id)) {
            cardElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            cardElement.style.transform = 'scale(0)';
            cardElement.style.opacity = '0';
            setTimeout(() => {
                loadAndRender();
                if (typeof Toast !== 'undefined') {
                    Toast.show('Tarefa excluída', { type: 'info', duration: 2000 });
                }
            }, 200);
        }
    }

    function bindEvents() {
        elements.searchInput.addEventListener('input', handleSearch);
        elements.filterSelect.addEventListener('change', handleSearch);
    }

    function init() {
        loadAndRender();
        bindEvents();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => TaskBoard.init());
