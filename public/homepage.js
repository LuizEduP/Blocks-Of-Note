/* ============================================
   homepage.js — Landing page / Homepage
   Animações suaves no scroll e interações
   Dependências: shared/base.css
   ============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
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
});
