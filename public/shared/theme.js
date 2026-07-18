/* ============================================
   theme.js — Seletor de temas com 17 paletas
   Persiste a preferência no localStorage
   Aplica CSS variables dinamicamente no :root
   ============================================ */

window.Theme = (() => {
  const STORAGE_KEY = 'commentarium-theme';
  const DEFAULT_ID = 'verde-esmeralda-dourado';

  /* ============================================
     Helpers de cor
     ============================================ */

  /** Calcula luminância relativa (0-255) */
  function luminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /** Clareia um hex em direção ao branco */
  function lighten(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /** Escurece um hex (subtrai) */
  function darken(hex, amount) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /** Mix entre duas cores. factor 0 = cor1, factor 1 = cor2 */
  function mix(hex1, hex2, factor) {
    const r1 = parseInt(hex1.slice(1, 3), 16);
    const g1 = parseInt(hex1.slice(3, 5), 16);
    const b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /** Converte hex para rgb string (sem alpha) */
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  /* ============================================
     Deriva todas as CSS variables de um tema
     ============================================ */

  function deriveVars(t) {
    const isLight = luminance(t.bg) > 128;
    const adjust = isLight ? (v) => darken(v, 22) : (v) => lighten(v, 24);
    const adjustMore = isLight ? (v) => darken(v, 38) : (v) => lighten(v, 44);

    const bgSecondary = mix(t.bg, t.stroke, isLight ? 0.06 : 0.12);
    const bgTertiary = mix(t.bg, t.stroke, isLight ? 0.12 : 0.22);
    const surfaceHover = isLight ? darken(t.surface, 8) : lighten(t.surface, 14);
    const textMuted = mix(t.textSecondary, t.bg, 0.45);

    const accentRGB = hexToRgb(t.accent);
    const strokeRGB = hexToRgb(t.stroke);

    // accent-hover: clareia/escurece dependendo do fundo do botão
    const accentHover = luminance(t.accent) > 128
      ? darken(t.accent, 18)
      : lighten(t.accent, 22);

    // brand-dark: tom mais escuro derivado do text ou bg
    const brandDark = isLight ? darken(t.bg, 30) : mix(t.bg, '#000000', 0.3);

    // Cores de estado
    const success = t.tertiary;
    const warning = t.accent;
    const error = t.secondary;
    const info = t.accent;

    return {
      '--color-brand-primary': t.accent,
      '--color-brand-secondary': t.secondary,
      '--color-brand-dark': brandDark,

      '--color-bg': t.bg,
      '--color-bg-secondary': bgSecondary,
      '--color-bg-tertiary': bgTertiary,

      '--color-text': t.text,
      '--color-text-secondary': t.textSecondary,
      '--color-text-muted': textMuted,

      '--color-border': `rgba(${strokeRGB}, 0.12)`,
      '--color-border-strong': `rgba(${strokeRGB}, 0.25)`,

      '--color-surface': t.surface,
      '--color-surface-hover': surfaceHover,
      '--color-divider': `rgba(${strokeRGB}, 0.10)`,

      '--color-success': success,
      '--color-success-bg': `rgba(${hexToRgb(success)}, 0.12)`,
      '--color-warning': warning,
      '--color-warning-bg': `rgba(${hexToRgb(warning)}, 0.12)`,
      '--color-error': error,
      '--color-error-bg': `rgba(${hexToRgb(error)}, 0.12)`,
      '--color-error-hover': isLight ? darken(error, 20) : lighten(error, 18),
      '--color-info': info,
      '--color-info-bg': `rgba(${hexToRgb(info)}, 0.12)`,

      '--color-canvas-bg': t.bg,

      '--color-accent': t.accent,
      '--color-accent-bg': `rgba(${accentRGB}, 0.12)`,
      '--color-accent-hover': accentHover,
      '--color-accent-text': t.accentText,
    };
  }

  /* ============================================
     Gerenciamento de temas
     ============================================ */

  const themes = window._CommentariumThemes || [];

  function getThemeById(id) {
    return themes.find(t => t.id === id) || themes[0] || null;
  }

  function getStored() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ID;
  }

  function getCurrent() {
    return getStored();
  }

  /** Aplica um tema setando CSS variables no :root */
  function applyTheme(themeId) {
    const theme = getThemeById(themeId);
    if (!theme) return;

    const vars = deriveVars(theme);
    const root = document.documentElement;

    // Aplica todas as variáveis
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Mantém data-theme para compatibilidade (light/dark para componentes)
    const isLight = luminance(theme.bg) > 128;
    root.setAttribute('data-theme', isLight ? 'light' : 'dark');

    localStorage.setItem(STORAGE_KEY, themeId);
  }

  /* ============================================
     UI: Seletor de temas
     ============================================ */

  let popoverEl = null;
  let activeThemeId = null;

  function buildPopoverHTML(themes, currentId) {
    return `
      <div class="theme-popover" id="theme-popover">
        <div class="theme-popover-header">Escolha um tema</div>
        <div class="theme-popover-grid">
          ${themes.map(t => `
            <button class="theme-option ${t.id === currentId ? 'active' : ''}"
                    data-theme-id="${t.id}"
                    title="${t.name}"
                    aria-label="Tema: ${t.name}">
              <span class="theme-swatch">
                <span class="theme-swatch-bg" style="background:${t.bg}"></span>
                <span class="theme-swatch-accent" style="background:${t.accent}"></span>
                <span class="theme-swatch-text" style="background:${t.text}"></span>
              </span>
              <span class="theme-option-name">${t.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function openPopover() {
    if (popoverEl) {
      popoverEl.classList.add('open');
      return;
    }

    activeThemeId = getStored();
    const html = buildPopoverHTML(themes, activeThemeId);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    popoverEl = wrapper.firstElementChild;
    document.body.appendChild(popoverEl);

    // Fecha ao clicar fora
    requestAnimationFrame(() => {
      popoverEl.classList.add('open');

      const onClickOutside = (e) => {
        if (!popoverEl.contains(e.target) && !e.target.closest('.theme-selector-btn')) {
          closePopover();
          document.removeEventListener('click', onClickOutside);
        }
      };

      const onEsc = (e) => {
        if (e.key === 'Escape') {
          closePopover();
          document.removeEventListener('keydown', onEsc);
        }
      };

      document.addEventListener('click', onClickOutside);
      document.addEventListener('keydown', onEsc);

      // Seleciona um tema
      popoverEl.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-theme-id');
          setTheme(id);
          closePopover();
        });
      });
    });
  }

  function closePopover() {
    if (popoverEl) {
      popoverEl.classList.remove('open');
    }
  }

  function setTheme(themeId) {
    applyTheme(themeId);
    activeThemeId = themeId;
    updateButtonPreview();
    updatePopoverActive();
  }

  function updateButtonPreview() {
    const preview = document.querySelector('.theme-selector-preview');
    if (!preview) return;
    const theme = getThemeById(activeThemeId || getStored());
    if (!theme) return;
    const bgEl = preview.querySelector('.theme-preview-bg');
    const accentEl = preview.querySelector('.theme-preview-accent');
    if (bgEl) bgEl.style.background = theme.bg;
    if (accentEl) accentEl.style.background = theme.accent;
  }

  function updatePopoverActive() {
    if (!popoverEl) return;
    popoverEl.querySelectorAll('.theme-option').forEach(btn => {
      const id = btn.getAttribute('data-theme-id');
      btn.classList.toggle('active', id === activeThemeId);
    });
  }

  function renderButton() {
    const container = document.getElementById('theme-toggle-container');
    if (!container) return;

    const currentId = getStored();
    const theme = getThemeById(currentId);

    const btn = document.createElement('button');
    btn.className = 'theme-selector-btn';
    btn.setAttribute('aria-label', 'Escolher tema');
    btn.setAttribute('title', 'Escolher tema de cores');
    btn.innerHTML = `
      <span class="theme-selector-preview">
        <span class="theme-preview-bg" style="background:${theme ? theme.bg : '#004643'}"></span>
        <span class="theme-preview-accent" style="background:${theme ? theme.accent : '#f9bc60'}"></span>
      </span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="theme-selector-chevron">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popoverEl && popoverEl.classList.contains('open')) {
        closePopover();
      } else {
        openPopover();
      }
    });

    container.innerHTML = '';
    container.appendChild(btn);
  }

  /* ============================================
     API pública (compatível com código existente)
     ============================================ */

  return {
    STORAGE_KEY,

    /** Retorna o ID do tema atual */
    getCurrent() {
      return getStored();
    },

    /** Aplica um tema pelo ID e atualiza UI */
    setTheme(themeId) {
      applyTheme(themeId);
      activeThemeId = themeId;
      updateButtonPreview();
      updatePopoverActive();
    },

    /** Retorna o objeto do tema atual */
    getCurrentTheme() {
      return getThemeById(getStored());
    },

    /** Retorna todos os temas disponíveis */
    getThemes() {
      return themes;
    },

    /** Inicializa: aplica tema salvo e renderiza o seletor */
    init() {
      const saved = getStored();
      applyTheme(saved);
      activeThemeId = saved;
      renderButton();
    }
  };
})();
