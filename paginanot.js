const mainContainer = document.getElementById('main-container');
const sceneCenter = document.getElementById('scene-center');
const btnCreate = document.getElementById('btn-create');
const orbitContainer = document.getElementById('notes-orbit');

// 1. Abrir/Fechar Menu ao clicar no cubo central
sceneCenter.addEventListener('click', (e) => {
    e.stopPropagation();
    mainContainer.classList.toggle('active');
});

// 2. Função para Criar o Mini Cubo
btnCreate.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const miniScene = document.createElement('div');
    miniScene.classList.add('mini-note-scene');

    const cube = document.createElement('div');
    cube.classList.add('mini-cube');

    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    faces.forEach(faceName => {
        const face = document.createElement('div');
        face.classList.add('face', faceName);
        if(faceName === 'front') face.innerText = "📄"; 
        cube.appendChild(face);
    });

    miniScene.appendChild(cube);
    miniScene.style.animationDelay = `${Math.random() * -20}s`;

    orbitContainer.appendChild(miniScene);
});

// Fechar menu ao clicar fora
document.addEventListener('click', () => {
    mainContainer.classList.remove('active');
});

// CONTROLE DE URGÊNCIA
const cubeMain = document.getElementById("cube");
const selectUrgency = document.getElementById("urgencySelect");

if (cubeMain && selectUrgency) {
    selectUrgency.addEventListener("change", () => {
        cubeMain.classList.remove("low", "medium", "high", "extra");

        if (selectUrgency.value == "1") {
            cubeMain.classList.add("low");
        } else if (selectUrgency.value == "2") {
            cubeMain.classList.add("medium");
        } else if (selectUrgency.value == "3") {
            cubeMain.classList.add("high");
        }
    });
}