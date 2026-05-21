// ============================================
// MODULE: Homepage
// Arquivo: homepage.js
// Dependências: shared/base.css, style.css
// ============================================

const HomepageApp = (() => {
    // --- DOM References ---
    const elements = {
        intro: document.getElementById('intro-overlay'),
        wrapper: document.getElementById('menuWrapper'),
        mainCube: document.getElementById('scene-main'),
    };

    // --- Intro Animation ---
    function initIntro() {
        if (!elements.intro || !elements.wrapper) return;

        // 1. Após 2.5s, o texto começa a sumir
        setTimeout(() => {
            elements.intro.classList.add('intro-hidden');
        }, 2500);

        // 2. Após 3.5s (quando a animação de fade da intro acaba)
        setTimeout(() => {
            elements.intro.remove();
            // LIBERA O CLIQUE NO CUBO
            elements.wrapper.classList.add('allow-clicks');
        }, 3500);
    }

    // --- Menu Toggle ---
    function handleMainCubeClick(e) {
        if (!elements.wrapper) return;
        e.stopPropagation();
        elements.wrapper.classList.toggle('active');
    }

    function handleOutsideClick() {
        if (!elements.wrapper) return;
        elements.wrapper.classList.remove('active');
    }

    // --- Events ---
    function bindEvents() {
        if (elements.mainCube) {
            elements.mainCube.addEventListener('click', handleMainCubeClick);
        }
        document.addEventListener('click', handleOutsideClick);
    }

    // --- Init ---
    function init() {
        initIntro();
        bindEvents();
    }

    // --- Public API ---
    return { init };
})();

document.addEventListener('DOMContentLoaded', () => HomepageApp.init());
