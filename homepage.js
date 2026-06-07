// ============================================
// MODULE: Homepage
// Arquivo: homepage.js
// Notion-inspired homepage with recent activity
// Agora usa Utils e TasksStorage de shared/
// ============================================

const HomepageApp = (() => {
    'use strict';

    function loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        // Load notes via NotesStorage (shared/notes-storage.js)
        const notes = (typeof NotesStorage !== 'undefined')
            ? NotesStorage.getNotes()
            : Storage.safeGet('my_3d_notes', []);

        // Load tasks via TasksStorage (shared/tasks-storage.js)
        const tasks = (typeof TasksStorage !== 'undefined')
            ? TasksStorage.getTasks()
            : Storage.safeGet('my_3d_tasks', []);

        // Combine and sort by updatedAt
        const recent = [];

        notes.forEach(n => {
            recent.push({
                type: 'note',
                id: n.id,
                title: n.title || 'Sem título',
                date: n.updatedAt || n.createdAt,
                icon: '📝',
            });
        });

        tasks.forEach(t => {
            recent.push({
                type: 'task',
                id: t.id,
                title: t.title || 'Sem título',
                date: t.updatedAt || t.createdAt,
                icon: '✅',
            });
        });

        // Sort by date descending
        recent.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Take top 8
        const items = recent.slice(0, 8);

        if (items.length === 0) {
            container.innerHTML = `
                <div class="recent-empty">
                    Nenhuma atividade recente. Crie uma nota ou tarefa para começar.
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const href = item.type === 'note'
                ? 'paginanot.html'
                : 'taskboard/taskboard.html';
            return `
                <a href="${href}" class="recent-item">
                    <div class="recent-item-icon">${item.icon}</div>
                    <div class="recent-item-body">
                        <div class="recent-item-title">${Utils.escapeHtml(item.title)}</div>
                        <div class="recent-item-meta">${Utils.formatRelativeDate(item.date)}</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    function init() {
        loadRecentActivity();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => HomepageApp.init());
