window.onload = function() {
    const intro = document.getElementById('intro-overlay');
    const wrapper = document.getElementById('menuWrapper'); // Certifique-se de que esse ID existe no seu HTML
    
    if (intro) {
        // 1. Após 2.5s, o texto começa a sumir
        setTimeout(() => {
            intro.classList.add('intro-hidden');
        }, 2500);

        // 2. Após 3.5s (quando a animação de fade da intro acaba)
        setTimeout(() => {
            intro.remove();
            
            // LIBERA O CLIQUE NO CUBO
            if (wrapper) {
                wrapper.classList.add('allow-clicks');
                console.log("Cliques liberados!");
            }
        }, 3500);
    }
};