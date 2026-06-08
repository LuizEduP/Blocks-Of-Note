/* ============================================
   tasks/app.js — Gerenciador de Tarefas
   Criação rápida, filtros, conclusão e exclusão
   Data Layer: shared/tasks-storage.js
   ============================================ */

const TaskApp = (() => {
    const URGENCY = {
        low:    { label: 'Baixa',  emoji: '🟢' },
        medium: { label: 'Média',  emoji: '🟡' },
        high:   { label: 'Alta',   emoji: '🔴' },
        extra:  { label: 'Extra',  emoji: '🔵' },
    };

    const URGENCY_ORDER = ['low', 'medium', 'high', 'extra'];

    const elements = {
        quickInput: document.getElementById('tk-quick-input'),
        quickBtn:   document.getElementById('tk-quick-btn'),
        urgencyBtns: document.querySelectorAll('.tk-urgency-btn'),
        expanded:   document.getElementById('tk-expanded'),
        date:       document.getElementById('tk-date'),
        time:       document.getElementById('tk-time'),
        location:   document.getElementById('tk-location'),
        desc:       document.getElementById('tk-desc'),
        detailsToggle: document.getElementById('tk-details-toggle'),
        list:       document.getElementById('tk-list'),
        stats:      document.getElementById('tk-stats'),
        filters:    document.querySelectorAll('.tk-filter'),
    };

    let currentFilter = 'all';
    let currentUrgency = 'medium';
    let showDetails = false;

    // =========================== FILTERS ===========================

    function getFilteredTasks() {
        let tasks = TasksStorage.getTasks() || [];

        if (currentFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            tasks = tasks.filter(t => t.date === today);
        } else if (currentFilter === 'upcoming') {
            const today = new Date().toISOString().split('T')[0];
            tasks = tasks.filter(t => t.date && t.date >= today && !t.done);
        } else if (currentFilter === 'done') {
            tasks = tasks.filter(t => t.done);
        } else {
            // 'all' — show undone first, then done
            tasks = tasks.filter(t => !t.done).concat(tasks.filter(t => t.done));
        }

        // Sort by urgency (low → extra) for undone, done at bottom
        const undone = tasks.filter(t => !t.done);
        const done = tasks.filter(t => t.done);

        undone.sort((a, b) => {
            const uDiff = URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
            if (uDiff !== 0) return uDiff;
            if (a.date && b.date) return a.date.localeCompare(b.date);
            if (a.date) return -1;
            if (b.date) return 1;
            // createdAt is ISO string; use Date comparison
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        return [...undone, ...done];
    }

    // =========================== RENDER ===========================

    function render() {
        const tasks = getFilteredTasks();
        const el = elements.list;
        if (!el) return;

        if (tasks.length === 0) {
            const msgs = {
                all:     ['📋', 'Nenhuma tarefa ainda', 'Adicione sua primeira tarefa acima'],
                today:   ['☀️', 'Nenhuma tarefa para hoje', 'Crie uma tarefa com data de hoje'],
                upcoming: ['📅', 'Nenhuma tarefa futura', 'Crie tarefas com datas futuras'],
                done:    ['🎉', 'Nenhuma tarefa concluída', 'Marque tarefas como concluídas para vê-las aqui'],
            };
            const [icon, title, hint] = msgs[currentFilter] || msgs.all;
            el.innerHTML = `
                <div class="tk-empty">
                    <div class="tk-empty-icon">${icon}</div>
                    <div class="tk-empty-title">${title}</div>
                    <div class="tk-empty-hint">${hint}</div>
                </div>
            `;
        } else {
            let html = '';
            for (let i = 0; i < tasks.length; i++) {
                html += renderCard(tasks[i]);
            }
            el.innerHTML = html;
        }

        // Stats
        const total = TasksStorage.getTasks().length;
        const doneCount = TasksStorage.getTasks().filter(t => t.done).length;
        if (elements.stats) {
            if (doneCount > 0) {
                elements.stats.textContent = `${total} tarefas · ${doneCount} concluída${doneCount !== 1 ? 's' : ''}`;
            } else {
                elements.stats.textContent = `${total} tarefa${total !== 1 ? 's' : ''}`;
            }
        }

        // Bind events
        bindCardEvents();
    }

    function renderCard(task) {
        const t = task.title || 'Sem título';
        const u = task.urgency || 'medium';
        const uInfo = URGENCY[u] || URGENCY.medium;
        const isDone = task.done;

        let metaHtml = '';
        if (task.date) {
            const d = new Date(task.date + (task.time ? 'T' + task.time : ''));
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            metaHtml += `<span class="tk-card-meta-item"><strong>📅</strong> ${label}</span>`;
        }
        if (task.time) {
            metaHtml += `<span class="tk-card-meta-item"><strong>⏰</strong> ${task.time.substring(0, 5)}</span>`;
        }
        if (task.location) {
            metaHtml += `<span class="tk-card-meta-item"><strong>📍</strong> ${escapeHtml(task.location)}</span>`;
        }

        let descHtml = '';
        if (task.description) {
            descHtml = `<div class="tk-card-desc">${escapeHtml(task.description)}</div>`;
        }

        const badgeHtml = `<span class="tk-card-badge ${u}">${uInfo.emoji} ${uInfo.label}</span>`;

        return `
            <div class="tk-card ${isDone ? 'done' : ''}" data-id="${task.id}">
                <div class="tk-card-urgency ${u}"></div>
                <button class="tk-check" data-id="${task.id}" aria-label="${isDone ? 'Reabrir' : 'Concluir'} tarefa">${isDone ? '✓' : ''}</button>
                <div class="tk-card-body">
                    <div class="tk-card-top">
                        <span class="tk-card-title">${escapeHtml(t)}</span>
                        ${badgeHtml}
                    </div>
                    <div class="tk-card-meta">${metaHtml}</div>
                    ${descHtml}
                </div>
                <button class="tk-card-delete" data-id="${task.id}" title="Excluir tarefa">✕</button>
            </div>
        `;
    }

    function bindCardEvents() {
        // Checkboxes
        document.querySelectorAll('.tk-check').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleDone(this.dataset.id);
            });
        });

        // Delete buttons
        document.querySelectorAll('.tk-card-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteTask(this.dataset.id);
            });
        });

        // Click on card to view details (future: open editor)
        document.querySelectorAll('.tk-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // If clicking on the checkbox or delete, ignore
                if (e.target.closest('.tk-check') || e.target.closest('.tk-card-delete')) return;
                toggleDone(this.dataset.id);
            });
        });
    }

    // =========================== ACTIONS ===========================

    function addQuickTask() {
        const title = elements.quickInput.value.trim();
        if (!title) {
            Toast.show('Digite um título para a tarefa', { type: 'error', duration: 2000 });
            return;
        }

        const taskData = {
            title: title,
            urgency: currentUrgency,
            date: elements.date.value || '',
            time: elements.time.value || '',
            location: elements.location.value || '',
            description: elements.desc.value || '',
            done: false,
        };

        TasksStorage.createTask(taskData);
        elements.quickInput.value = '';
        elements.quickInput.focus();

        // Reset expanded fields if they were shown
        if (showDetails) {
            elements.date.value = '';
            elements.time.value = '';
            elements.location.value = '';
            elements.desc.value = '';
        }

        render();
        Toast.show('Tarefa adicionada! ✅', { type: 'success', duration: 1500 });
    }

    function toggleDone(id) {
        const task = TasksStorage.getTaskById(id);
        if (!task) return;
        task.done = !task.done;
        TasksStorage.updateTask(id, task);
        render();
    }

    function deleteTask(id) {
        const task = TasksStorage.getTaskById(id);
        if (!task) return;
        const title = task.title || 'tarefa';
        if (!confirm(`Excluir "${title}"?`)) return;
        TasksStorage.deleteTaskById(id);
        render();
        Toast.show('Tarefa excluída', { type: 'info', duration: 1500 });
    }

    function setFilter(filter) {
        currentFilter = filter;
        elements.filters.forEach(f => {
            f.classList.toggle('active', f.dataset.filter === filter);
        });
        render();
    }

    function setUrgency(urgency) {
        currentUrgency = urgency;
        elements.urgencyBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.urgency === urgency);
        });
    }

    function toggleDetails() {
        showDetails = !showDetails;
        elements.expanded.style.display = showDetails ? 'block' : 'none';
        elements.detailsToggle.textContent = showDetails ? '☝️ Menos detalhes' : '👇 Mais detalhes';
    }

    // =========================== UTILS ===========================

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    // =========================== BIND EVENTS ===========================

    function bindEvents() {
        // Quick add on Enter
        elements.quickInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addQuickTask();
            }
        });

        // Quick add button
        elements.quickBtn.addEventListener('click', addQuickTask);

        // Urgency selectors
        elements.urgencyBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                setUrgency(this.dataset.urgency);
            });
        });

        // Filters
        elements.filters.forEach(btn => {
            btn.addEventListener('click', function() {
                setFilter(this.dataset.filter);
            });
        });

        // Toggle details
        elements.detailsToggle.addEventListener('click', toggleDetails);

        // Keyboard shortcut: Ctrl+K to focus quick input
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                elements.quickInput.focus();
            }
        });
    }

    // =========================== INIT ===========================

    function init() {
        // Set today's date as default for date picker
        const today = new Date().toISOString().split('T')[0];
        elements.date.value = today;

        bindEvents();
        render();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => TaskApp.init());
