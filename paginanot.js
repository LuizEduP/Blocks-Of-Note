const mainContainer = document.getElementById('main-container');
const sceneCenter = document.getElementById('scene-center');
const btnCreate = document.getElementById('btn-create');
const btnRemove = document.getElementById('btn-remove');
const orbitContainer = document.getElementById('notes-orbit');

const modal = document.getElementById('note-modal');
const noteText = document.getElementById('note-text');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');

let currentNoteId = null;
let isRemovingMode = false;

// 1. Carregar notas existentes
window.addEventListener('DOMContentLoaded', () => {
    const saved = JSON.parse(localStorage.getItem('my_3d_notes') || "[]");
    saved.forEach(note => renderCube(note.id));
});

// 2. Abrir/Fechar Menu
sceneCenter.addEventListener('click', (e) => {
    e.stopPropagation();
    mainContainer.classList.toggle('active');
    isRemovingMode = false;
    orbitContainer.classList.remove('removing');
    resetRemoveButton(); // Volta o botão ao estado normal
});

// 3. Criar nova nota
btnCreate.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = Date.now();
    const notes = JSON.parse(localStorage.getItem('my_3d_notes') || "[]");
    notes.push({ id, title: "", content: "" });
    localStorage.setItem('my_3d_notes', JSON.stringify(notes));
    
    renderCube(id);
    mainContainer.classList.remove('active');
});

// 4. Ativar Modo Remoção
btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    isRemovingMode = !isRemovingMode;
    
    orbitContainer.classList.toggle('removing', isRemovingMode);
    
    if (isRemovingMode) {
        btnRemove.style.backgroundColor = "#ff0000";
        btnRemove.style.color = "#fff";
        btnRemove.innerText = "CANCELAR";
    } else {
        resetRemoveButton();
    }
});

function resetRemoveButton() {
    btnRemove.style.backgroundColor = "#000";
    btnRemove.style.color = "#fff";
    btnRemove.innerText = "REMOVE";
}

// 5. Função de Renderização
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
        if (isRemovingMode) {
            deleteNote(id, miniScene); // Agora a função existe abaixo!
        } else {
            openEditor(id);
        }
    });

    orbitContainer.appendChild(miniScene);
}

// 6. Funções de Dados (AQUI ESTAVA O ERRO)
function deleteNote(id, element) {
    let notes = JSON.parse(localStorage.getItem('my_3d_notes') || "[]");
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('my_3d_notes', JSON.stringify(notes));
    
    element.style.transition = "0.3s";
    element.style.transform = "scale(0)";
    setTimeout(() => element.remove(), 300);
}

function openEditor(id) {
    currentNoteId = id;
    const notes = JSON.parse(localStorage.getItem('my_3d_notes') || "[]");
    const note = notes.find(n => n.id === id);
    
    const titleInput = document.getElementById('note-title-input');
    const dateDisplay = document.getElementById('note-date-display');
    
    titleInput.value = note?.title || "";
    noteText.value = note?.content || "";
    
    const date = new Date(id);
    dateDisplay.innerText = date.toLocaleDateString('pt-BR');
    
    modal.style.display = 'flex';
}

btnSave.onclick = () => {
    const notes = JSON.parse(localStorage.getItem('my_3d_notes') || "[]");
    const idx = notes.findIndex(n => n.id === currentNoteId);
    
    if (idx !== -1) {
        notes[idx].title = document.getElementById('note-title-input').value;
        notes[idx].content = noteText.value;
        localStorage.setItem('my_3d_notes', JSON.stringify(notes));
    }
    modal.style.display = 'none';
};

// Fechar o modal
btnCancel.onclick = () => {
    modal.style.display = 'none';
};

// Fechar menu ao clicar fora (sem resetar o modo remoção se estiver clicando nos mini cubos)
document.addEventListener('click', (e) => {
    if (!orbitContainer.contains(e.target)) {
        mainContainer.classList.remove('active');
        isRemovingMode = false;
        orbitContainer.classList.remove('removing');
        resetRemoveButton();
    }
});