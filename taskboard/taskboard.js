// ============================================
// taskboard.js — Board de Tarefas
// Data Layer extraída para shared/tasks-storage.js
// ============================================

const TaskBoard = (() => {
    'use strict';

    const elements = {
        grid: document.getElementById('board-grid'),
        searchInput: document.getElementById('board-search'),
        filterSelect: document.getElementById('board-filter'),
        stats: document.getElementById('board-stats'),
    };

    // Data Layer agora em TasksStorage (shared/tasks-storage.js)
    const { getTasks, deleteTaskById } = TasksStorage;

    // ==========================================
    // UI LAYER
    // ==========================================

    const URGENCY_LABELS = {
        low: 'I — Baixa',
        medium: 'II — Média',
        high: 'III — Alta',
        extra: 'IV — Extra',
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
                <h2 class="card-title">${Utils.escapeHtml(task.title)}</h2>
                <div class="card-meta">
                    ${task.date ? `<span>📅 ${formatDate(task.date)}</span>` : ''}
                    ${task.time ? `<span>⏰ ${Utils.escapeHtml(task.time)}</span>` : ''}
                    ${task.location ? `<span>📍 ${Utils.escapeHtml(task.location)}</span>` : ''}
                    <span>🏷 ${URGENCY_LABELS[task.urgency] || 'II — Média'}</span>
                </div>
                ${desc ? `<p class="card-desc">${Utils.escapeHtml(desc)}${task.description.length > 120 ? '...' : ''}</p>` : ''}
                <div class="card-actions">
                    <button class="btn btn-danger btn-sm" data-id="${task.id}" aria-label="Excluir tarefa ${Utils.escapeHtml(task.title)}">EXCLUIR</button>
                </div>
            </div>
        `;

        card.querySelector('.btn-danger').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDelete(task.id, card);
        });

        return card;
    }

    function render(tasks) {
        elements.grid.innerHTML = '';

        if (tasks.length === 0) {
            elements.grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" aria-hidden="true">📋</div>
                    <h2 class="empty-title">Nenhuma Tarefa</h2>
                    <p class="empty-subtitle">Você ainda não criou nenhuma tarefa. Vá para a página de tarefas e comece agora.</p>
                    <a href="../paginatask.html" class="btn btn-primary">CRIAR NOVA TAREFA</a>
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
    // CONTROLLER
    // ==========================================

    function loadAndRender() {
        const tasks = getTasks();
        render(tasks);
    }

    function handleSearch() {
        const query = elements.searchInput.value.toLowerCase().trim();
        const filterUrgency = elements.filterSelect.value;

        let tasks = getTasks();

        if (filterUrgency !== 'all') {
            tasks = tasks.filter(t => t.urgency === filterUrgency);
        }

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

        deleteTaskById(id);

        cardElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        cardElement.style.transform = 'scale(0)';
        cardElement.style.opacity = '0';
        setTimeout(() => {
            loadAndRender();
            Toast.show('Tarefa excluída', { type: 'info', duration: 2000 });
        }, 200);
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
