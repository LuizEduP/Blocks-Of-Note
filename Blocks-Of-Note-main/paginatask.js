const urgencySelect = document.getElementById('urgencySelect');
const cube = document.getElementById('cube');
const btnSaveTask = document.getElementById('btn-save-task');
const tasksList = document.getElementById('tasks-list');
const viewModal = document.getElementById('view-task-modal');
const btnCloseView = document.getElementById('btn-close-view');

const colors = {
    low: "#22c55e", medium: "#eab308", high: "#ef4444", extra: "#3b82f6"
};

let taskToDeleteId = null;

// Sincronizar cor do cubo no formulário
urgencySelect.addEventListener('change', (e) => {
    cube.className = `cube ${e.target.value}`;
});

// Salvar Tarefa
function salvarTarefa() {
    const title = document.getElementById('task-title').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const location = document.getElementById('task-location').value;
    const desc = document.getElementById('task-desc').value;
    const urgency = urgencySelect.value;

    if (!title) {
        alert("Dê um título à tarefa!");
        return;
    }

    const novaTarefa = {
        id: Date.now(),
        title, date, time, location, desc, urgency,
        color: colors[urgency]
    };

    const tarefas = JSON.parse(localStorage.getItem('my_3d_tasks') || "[]");
    tarefas.push(novaTarefa);
    localStorage.setItem('my_3d_tasks', JSON.stringify(tarefas));

    limparFormulario();
    renderTasks();
}

function limparFormulario() {
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    urgencySelect.value = 'medium';
    cube.className = 'cube medium';
}

// Renderizar Lista (Desenho 1)
function renderTasks() {
    const tarefas = JSON.parse(localStorage.getItem('my_3d_tasks') || "[]");
    tasksList.innerHTML = '';

    tarefas.forEach(task => {
        const row = document.createElement('div');
        row.className = 'task-item-row';
        row.innerHTML = `
            <div class="mini-cube-btn" style="background-color: ${task.color};" title="Clique para detalhes"></div>
            <div class="task-row-content">
                <span class="t-title">${task.title}</span>
                <span class="t-meta">${task.date || '---'} — ${task.time || '---'}</span>
            </div>
        `;
        row.querySelector('.mini-cube-btn').onclick = () => openViewModal(task);
        tasksList.appendChild(row);
    });
}

// Abrir Detalhes (Desenho 2)
function openViewModal(task) {
    document.getElementById('modal-task-title').innerText = task.title;
    document.getElementById('modal-task-date').innerText = task.date || '---';
    document.getElementById('modal-task-time').innerText = task.time || '---';
    document.getElementById('modal-task-location').innerText = task.location || '---';
    document.getElementById('modal-task-desc').innerText = task.desc || 'Sem detalhes.';
    
    taskToDeleteId = task.id;
    viewModal.style.display = 'flex';
}

btnSaveTask.onclick = salvarTarefa;
btnCloseView.onclick = () => viewModal.style.display = 'none';

document.getElementById('btn-delete-task').onclick = () => {
    let tarefas = JSON.parse(localStorage.getItem('my_3d_tasks') || "[]");
    tarefas = tarefas.filter(t => t.id !== taskToDeleteId);
    localStorage.setItem('my_3d_tasks', JSON.stringify(tarefas));
    viewModal.style.display = 'none';
    renderTasks();
};

window.onload = renderTasks;

