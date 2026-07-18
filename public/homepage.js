/* ============================================
   homepage.js — Landing page / Homepage
   Animações suaves no scroll, interações e cubo 3D
   Dependências: shared/base.css, Three.js, GSAP
   ============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Changelog modal toggle ---
    const changelogBar = document.getElementById('changelog-bar');
    const overlay = document.getElementById('changelog-overlay');
    const modal = document.getElementById('changelog-modal');
    const closeBtn = document.getElementById('changelog-close');

    function openChangelog() {
        overlay.classList.add('open');
        modal.classList.add('open');
    }
    function closeChangelog() {
        overlay.classList.remove('open');
        modal.classList.remove('open');
    }

    if (changelogBar) changelogBar.addEventListener('click', openChangelog);
    if (closeBtn) closeBtn.addEventListener('click', closeChangelog);
    if (overlay) overlay.addEventListener('click', closeChangelog);

    // --- Navbar fade-in on load ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        setTimeout(() => navbar.classList.add('visible'), 100);
    }

    // --- Hero animation on load ---
    const hero = document.getElementById('hero');
    if (hero) {
        hero.classList.add('hero-animated');
    }

    // --- Feature cards reveal on scroll ---
    const cards = document.querySelectorAll('.feature-card');
    if (cards.length > 0 && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('feature-card-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        cards.forEach((card) => observer.observe(card));
    } else {
        // Fallback: mostra todos os cards
        cards.forEach((card) => card.classList.add('feature-card-visible'));
    }

    // --- Three.js Hero Cube ---
    initHeroCube();
});

/* ============================================
   Three.js Hero Cube — wireframe 3D interativo
   ============================================ */

function initHeroCube() {
    if (typeof THREE === 'undefined') return;

    const container = document.getElementById('hero-cube');
    if (!container) return;

    // Helper: lê CSS var e retorna THREE.Color
    function cssVarToColor(varName) {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        // Remove '#' e converte para hex int
        const hex = val.replace('#', '');
        return new THREE.Color(parseInt(hex, 16));
    }

    function getCubeBgColor() {
        return cssVarToColor('--color-bg');
    }

    function getCubeEdgeColor() {
        return cssVarToColor('--color-brand-secondary');
    }

    const bgColor = cssVarToColor('--color-bg');
    const edgeColor = cssVarToColor('--color-brand-secondary');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Three.js setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // 1. Cubo sem face com bordas
    const size = 5;
    const boxGeometry = new THREE.BoxGeometry(size, size, size);
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 });
    const wireframeCube = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    group.add(wireframeCube);

    // Reage à troca de tema: fundo e cor das bordas
    new MutationObserver(() => {
        scene.background = getCubeBgColor();
        edgesMaterial.color.set(getCubeEdgeColor());
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // 2. Grid de quadradinhos invisíveis (12x12x12)
    const cubes = [];
    const resolution = 12;
    const step = size / resolution;
    const miniCubeGeo = new THREE.BoxGeometry(step * 0.9, step * 0.9, step * 0.9);

    for (let x = 0; x < resolution; x++) {
        for (let y = 0; y < resolution; y++) {
            for (let z = 0; z < resolution; z++) {
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x555555,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    depthTest: false
                });
                const mesh = new THREE.Mesh(miniCubeGeo, mat);
                mesh.visible = false; // invisível até ser hoverado

                mesh.position.set(
                    x * step - size / 2 + step / 2,
                    y * step - size / 2 + step / 2,
                    z * step - size / 2 + step / 2
                );
                group.add(mesh);
                cubes.push(mesh);
            }
        }
    }

    // 3. Sistema de Interação (raycaster relativo ao canvas do container)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastHovered = null;

    function unhoverMesh(mesh) {
        gsap.to(mesh.material.color, { r: 0.8, g: 0.8, b: 0.8, duration: 0.2 });
        gsap.to(mesh.material, {
            opacity: 0,
            duration: 1.5,
            onComplete: () => { mesh.visible = false; }
        });
    }

    renderer.domElement.addEventListener('mousemove', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cubes);

        if (intersects.length > 0) {
            const currentHover = intersects[0].object;

            if (lastHovered && lastHovered !== currentHover) {
                unhoverMesh(lastHovered);
            }

            gsap.killTweensOf(currentHover.material);
            gsap.killTweensOf(currentHover.material.color);

            currentHover.visible = true;
            currentHover.material.color.setRGB(0.33, 0.33, 0.33);
            currentHover.material.opacity = 1;

            lastHovered = currentHover;
        } else if (lastHovered) {
            unhoverMesh(lastHovered);
            lastHovered = null;
        }
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        if (lastHovered) {
            unhoverMesh(lastHovered);
            lastHovered = null;
        }
    });

    // 3.5 Mensagem do cubo — aparece após 5s de hover
    const cubeMsg = document.getElementById('cube-message');
    let cubeHoverTimer = null;

    renderer.domElement.addEventListener('mouseenter', () => {
        cubeHoverTimer = setTimeout(() => {
            if (cubeMsg) cubeMsg.classList.add('visible');
        }, 5000);
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        clearTimeout(cubeHoverTimer);
        if (cubeMsg) cubeMsg.classList.remove('visible');
    });

    // 4. Loop de animação
    function animate() {
        requestAnimationFrame(animate);
        if (!prefersReducedMotion) {
            group.rotation.x += 0.002;
            group.rotation.y += 0.003;
        }
        renderer.render(scene, camera);
    }
    animate();

    // 5. Resize handler — redimensiona baseado no container
    window.addEventListener('resize', () => {
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        if (newW === 0 || newH === 0) return;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
    });
}
