# Especificações Técnicas — Commentarium

> **Versão:** 3.0  
> **Data:** 05/06/2026  
> **Propósito:** Documentação completa do estado atual do projeto, arquitetura, design system, modificações realizadas e pendentes.  
> **Documentos relacionados:** [`docs/arquitetura.md`](arquitetura.md), [`docs/roadmap.md`](roadmap.md), [`docs/visão.md`](visão.md)

---

## Sumário

1. [Stack Tecnológica](#1-stack-tecnológica)
2. [Estrutura de Diretórios](#2-estrutura-de-diretórios)
3. [Design System — `shared/base.css`](#3-design-system--sharedbasecss)
4. [Módulos JavaScript](#4-módulos-javascript)
5. [Camada de Dados](#5-camada-de-dados)
6. [Componentes de UI](#6-componentes-de-ui)
7. [Schema dos Dados](#7-schema-dos-dados)
8. [Estado Atual — Análise Completa](#8-estado-atual--análise-completa)
9. [Modificações Realizadas](#9-modificações-realizadas)
10. [Modificações Pendentes](#10-modificações-pendentes)
11. [Testes](#11-testes)
12. [Acessibilidade](#12-acessibilidade)
13. [Responsividade](#13-responsividade)
14. [Glossário](#14-glossário)

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Detalhes |
|--------|-----------|----------|
| **Linguagem** | HTML5 + CSS3 + JavaScript (Vanilla) | Zero frameworks ou bibliotecas de runtime |
| **Persistência** | `localStorage` (Web Storage API) | Dados salvos no navegador do usuário |
| **Tipografia** | Bebas Neue (Google Fonts) + Courier New | Display bold + monoespaçado para corpo |
| **Design System** | Brutalist monochrome | Preto/branco com acentos coloridos para estados |
| **Backend** | ❌ Nenhum | 100% client-side |
| **Build tools** | ❌ Nenhum | Arquivos estáticos puros |
| **Testes unitários** | Vitest v3.1 | `tests/` |
| **Testes E2E** | Playwright v1.60 | `e2e/` |

### Dependências externas

**Zero dependências de runtime.** Apenas devDependencies:

| Pacote | Versão | Uso |
|--------|--------|-----|
| `vitest` | ^3.1.0 | Testes unitários |
| `@playwright/test` | ^1.60.0 | Testes end-to-end |

---

## 2. Estrutura de Diretórios

```
Commentarium/
│
├── index.html                 # Homepage — cards de navegação
├── homepage.js                # Animação de entrada dos cards
├── style.css                  # Estilos da homepage
│
├── paginanot.html             # Página de notas (grid + modal editor)
├── paginanot.js               # Controller de notas (IIFE)
├── paginanot.css              # Estilos de notas (grid, cards, modal)
│
├── paginatask.html            # Página de tarefas (formulário)
├── paginatask.js              # Controller de tarefas (IIFE)
├── paginatask.css             # Estilos de tarefas (form, preview)
│
├── taskboard/
│   ├── taskboard.html         # Board de visualização de tarefas
│   ├── taskboard.js           # Controller do board (IIFE)
│   └── taskboard.css          # Estilos do board
│
├── shared/
│   ├── base.css               # Design system (variáveis, componentes, reset)
│   ├── storage.js             # Data Layer genérico (safeGet/safeSet/safeRemove)
│   ├── toast.js               # Componente Toast (IIFE)
│   └── toast.css              # Estilos do Toast
│
├── docs/
│   ├── specs.md               # Este documento
│   ├── arquitetura.md         # Arquitetura do projeto (desatualizado — ainda referencia cubos 3D)
│   ├── roadmap.md             # Roadmap de evolução (desatualizado)
│   └── visão.md               # Visão do produto (desatualizado — ainda descreve interface 3D)
│
├── plans/
│   └── pontos-de-melhoria.md  # Plano de melhorias (desatualizado)
│
├── tests/
│   ├── storage.test.js        # Testes do Storage (189 linhas)
│   ├── notes.test.js          # Testes de Notas (231 linhas)
│   └── tasks.test.js          # Testes de Tarefas (261 linhas)
│
├── e2e/
│   ├── notes.spec.js          # E2E de Notas (197 linhas — DESATUALIZADO)
│   └── tasks.spec.js          # E2E de Tarefas (221 linhas — DESATUALIZADO)
│
├── README.md
├── package.json
├── vitest.config.js
└── playwright.config.js
```

---

## 3. Design System — `shared/base.css`

### 3.1 Variáveis CSS (`:root`)

```css
:root {
    /* Cores base */
    --color-bg: #ffffff;
    --color-text: #000000;
    --color-text-muted: #888888;
    --color-border: #000000;
    --color-surface: #f5f5f5;
    --color-divider: #eaeaea;

    /* Cores de estado */
    --color-success: #22c55e;
    --color-success-bg: #dcfce7;
    --color-warning: #eab308;
    --color-warning-bg: #fef9c3;
    --color-error: #ef4444;
    --color-error-bg: #fee2e2;
    --color-info: #3b82f6;
    --color-info-bg: #dbeafe;

    /* Tipografia */
    --font-display: 'Bebas Neue', sans-serif;
    --font-mono: 'Courier New', Courier, monospace;

    /* Transições */
    --transition-fast: 0.2s ease;
    --transition-normal: 0.3s ease;

    /* Bordas */
    --border-thick: 3px solid var(--color-border);
    --border-thin: 2px solid var(--color-border);

    /* Sombras */
    --shadow-sm: 2px 2px 0px rgba(0,0,0,0.1);
    --shadow-md: 4px 4px 0px rgba(0,0,0,0.1);
    --shadow-lg: 6px 6px 0px rgba(0,0,0,0.08);
}
```

### 3.2 Componentes Reutilizáveis

| Componente | Classe | Descrição |
|-----------|--------|-----------|
| **Botão padrão** | `.btn` | `inline-flex`, gap 8px, padding 10px 20px, uppercase, letter-spacing 1px, border thick, shadow-sm, hover inverte bg/text e translate(-2px, -2px) |
| **Botão primary** | `.btn-primary` | bg preto, texto branco (inverso do padrão) |
| **Botão danger** | `.btn-danger` | borda e texto vermelhos (`--color-error`), hover bg vermelho |
| **Botão small** | `.btn-sm` | padding 6px 14px, font-size 0.75rem |
| **Botão voltar** | `.btn-back` | `position: fixed`, top/left 20px, z-index 100, gap 6px |
| **Input** | `.input` | `width: 100%`, padding 10px 14px, border thick, focus background surface |
| **Select** | `.select` | padding 10px 14px, font-weight bold, border thick, cursor pointer |
| **Card** | `.card` | border thick, padding 20px, shadow-md, hover translate(-2px, -2px) + shadow-lg |
| **Divisor** | `.divider` | height 1px, background divider, margin 20px 0 |
| **Screen reader only** | `.sr-only` | `position: absolute`, 1x1px, overflow hidden, clip rect |

### 3.3 Acessibilidade Global

```css
:focus-visible {
    outline: 3px solid var(--color-border);
    outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

### 3.4 Responsivo

```css
@media (max-width: 768px) {
    .btn-back {
        top: 12px;
        left: 12px;
        padding: 6px 12px;
        font-size: 0.75rem;
    }
}
```

---

## 4. Módulos JavaScript

Todos os módulos seguem o **Module Pattern com IIFE** (Immediately Invoked Function Expression):

```javascript
const AppName = (() => {
    'use strict';

    // Constantes
    const STORAGE_KEY = 'my_3d_notes';
    const LIMITS = { ... };

    // Estado
    const state = { ... };

    // Referências DOM
    const elements = { ... };

    // Data Layer
    function getData() { ... }
    function saveData(data) { ... }

    // UI Layer
    function render() { ... }

    // Controller
    function handleEvent() { ... }
    function bindEvents() { ... }
    function init() { ... }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => AppName.init());
```

### 4.1 Homepage — [`homepage.js`](../homepage.js) (26 linhas)

| Função | Descrição |
|--------|-----------|
| `init()` | Seleciona `.home-card`, aplica staggered opacity/transform animation com `200 + i * 150` ms delay |

**Estrutura:** `const HomepageApp = (() => { ... return { init }; })();`

### 4.2 Notas — [`paginanot.js`](../paginanot.js) (310 linhas)

| Função | Descrição |
|--------|-----------|
| `getNotes()` | `Storage.safeGet('my_3d_notes', [])` |
| `saveNotes(notes)` | `Storage.safeSet('my_3d_notes', notes)` |
| `createNote()` | Cria `{ id, title, content, createdAt, updatedAt }`, salva, retorna |
| `updateNote(id, data)` | Encontra por id, faz merge, atualiza `updatedAt` |
| `deleteNoteById(id)` | Filtra por id, salva |
| `getNoteById(id)` | `find()` no array |
| `escapeHtml(str)` | Sanitização via `textContent` + `innerHTML` |
| `formatDate(isoString)` | Formata ISO para `DD/MM/AAAA HH:MM` |
| `renderCard(note)` | Cria `.note-card` com título (2-line clamp), preview (3-line clamp), data |
| `render(notes)` | Renderiza grid de cards ou empty state |
| `loadAndRender()` | `getNotes()` → `render()` |
| `openEditor(id)` | Preenche modal com dados da nota, exibe |
| `closeEditor()` | Esconde modal, limpa campos |
| `handleCreate()` | Cria nota, renderiza, toast |
| `createAndRender()` | `handleCreate()` (exposta para onclick) |
| `handleRemoveToggle()` | Alterna modo remoção (classe `.removing` no container) |
| `handleDelete(id, cardElement)` | Animação scale(0), remove após 300ms, toast |
| `validateNote(title, content)` | Valida limites (TITLE_MAX: 200, CONTENT_MAX: 5000) |
| `handleSave()` | Valida, atualiza, renderiza, fecha modal, toast |
| `handleCancel()` | Fecha modal sem salvar |
| `handleSearch()` | Filtro por título (case-insensitive) |
| `handleExport()` | Gera JSON com `Blob` + `URL.createObjectURL` + `<a download>` |
| `handleOutsideClick(e)` | Fecha modal se clicar fora |
| `bindEvents()` | Registra todos os event listeners |
| `init()` | `loadAndRender()`, `bindEvents()` |

**Expõe:** `createAndRender` para uso em `onclick` no HTML.

### 4.3 Tarefas — [`paginatask.js`](../paginatask.js) (130 linhas)

| Função | Descrição |
|--------|-----------|
| `getTasks()` | `Storage.safeGet('my_3d_tasks', [])` |
| `saveTasks(tasks)` | `Storage.safeSet('my_3d_tasks', tasks)` |
| `updateUrgencyPreview()` | Remove classes `urgency-*` do indicador, adiciona classe baseada no select |
| `validateTask(title, description, location)` | Valida obrigatoriedade e limites (TITLE_MAX: 200, DESC_MAX: 1000, LOCATION_MAX: 200) |
| `handleSaveTask(e)` | Valida, cria task `{ id, title, date, time, location, description, urgency, createdAt, updatedAt }`, salva, limpa form, toast |
| `bindEvents()` | Registra eventos do form e urgency select |
| `init()` | `bindEvents()`, preview inicial |

**URGENCY_LABELS:** `{ low: 'I — Baixa', medium: 'II — Média', high: 'III — Alta', extra: 'IV — Extra' }`

### 4.4 Task Board — [`taskboard/taskboard.js`](../taskboard/taskboard.js) (166 linhas)

| Função | Descrição |
|--------|-----------|
| `getTasks()` | `Storage.safeGet('my_3d_tasks', [])` |
| `deleteTask(id)` | Filtra por id, salva |
| `formatDate(dateStr)` | `YYYY-MM-DD` → `DD/MM/YYYY` |
| `escapeHtml(str)` | Sanitização |
| `renderCard(task)` | Cria `.task-card.urgency-*` com barra lateral colorida, título, meta, descrição (120 chars max), botão EXCLUIR |
| `render(tasks)` | Renderiza grid ou empty state, atualiza stats |
| `loadAndRender()` | `getTasks()` → `render()` |
| `handleSearch()` | Filtro combinado: busca textual (título/descrição/local) + filtro por urgência |
| `handleDelete(id, cardElement)` | Confirma, anima scale(0), remove, toast |
| `bindEvents()` | Input search + select filter |
| `init()` | `loadAndRender()`, `bindEvents()` |

---

## 5. Camada de Dados

### 5.1 [`shared/storage.js`](../shared/storage.js) (73 linhas)

Módulo genérico de persistência com tratamento de erros:

```javascript
const Storage = (() => {
    function safeGet(key, fallback = null) { ... }   // try/catch JSON.parse
    function safeSet(key, value) { ... }              // try/catch, QuotaExceededError → Toast
    function safeRemove(key) { ... }                  // try/catch removeItem
    return { safeGet, safeSet, safeRemove };
})();
```

**Tratamento de erros:**
- `QuotaExceededError`: Toast "Espaço de armazenamento cheio. Libere espaço ou exporte seus dados."
- Outros erros: Toast "Erro ao salvar dados." + `console.error`

### 5.2 Chaves do localStorage

| Chave | Tipo | Descrição |
|-------|------|-----------|
| `my_3d_notes` | `Array<Note>` | Notas do usuário |
| `my_3d_tasks` | `Array<Task>` | Tarefas do usuário |

---

## 6. Componentes de UI

### 6.1 Toast — [`shared/toast.js`](../shared/toast.js) + [`shared/toast.css`](../shared/toast.css)

```javascript
Toast.show('Mensagem', { duration: 3000, type: 'success' });
// type: 'success' | 'error' | 'info'
```

- Container fixo no canto inferior direito (`z-index: 9999`)
- Animações: `toastIn` (slide da direita), `toastOut` (slide para direita)
- Cores por tipo: success (verde), error (vermelho), info (azul)
- Click-to-dismiss
- Auto-remove após duração
- Responsivo: mobile ocupa largura total com texto centralizado

### 6.2 Modal (Notas)

- Overlay com `backdrop-filter: blur(8px)`
- Animação `modalIn` (scale + opacity)
- Header com título "EDITAR NOTA" + data de criação
- Input title (maxlength 200) + textarea (maxlength 5000)
- Footer com botões SALVAR e CANCELAR
- Fecha ao clicar fora (`handleOutsideClick`)

### 6.3 Urgency Preview (Tarefas)

- Indicador visual com dot colorido + label textual
- Classes dinâmicas: `.urgency-low` (verde), `.urgency-medium` (amarelo), `.urgency-high` (vermelho), `.urgency-extra` (azul)
- Legenda lateral com os 4 níveis

### 6.4 Task Card (Board)

- Barra lateral de 6px colorida por urgência
- Título, meta (data, hora, local, badge), descrição (120 chars)
- Botão EXCLUIR com confirmação via `confirm()`

---

## 7. Schema dos Dados

### 7.1 Note (`my_3d_notes`)

```json
{
    "id": 1712345678901,
    "title": "Minha Nota",
    "content": "Conteúdo da nota...",
    "createdAt": "2026-05-21T20:00:00.000Z",
    "updatedAt": "2026-05-21T21:30:00.000Z"
}
```

| Campo | Tipo | Limite | Obrigatório |
|-------|------|--------|-------------|
| `id` | `number` (Date.now) | — | Sim |
| `title` | `string` | 200 chars | Sim (validado) |
| `content` | `string` | 5000 chars | Não |
| `createdAt` | `string` (ISO 8601) | — | Sim |
| `updatedAt` | `string` (ISO 8601) | — | Sim |

### 7.2 Task (`my_3d_tasks`)

```json
{
    "id": 1712345678902,
    "title": "Comprar mantimentos",
    "date": "2026-05-25",
    "time": "14:00",
    "location": "Supermercado Central",
    "description": "Levar lista de compras",
    "urgency": "medium",
    "createdAt": "2026-05-21T20:00:00.000Z",
    "updatedAt": "2026-05-21T20:00:00.000Z"
}
```

| Campo | Tipo | Limite | Obrigatório |
|-------|------|--------|-------------|
| `id` | `number` (Date.now) | — | Sim |
| `title` | `string` | 200 chars | Sim (validado) |
| `date` | `string` (YYYY-MM-DD) | — | Não |
| `time` | `string` (HH:MM) | — | Não |
| `location` | `string` | 200 chars | Não |
| `description` | `string` | 1000 chars | Não |
| `urgency` | `string` (enum) | — | Sim (default: `medium`) |
| `createdAt` | `string` (ISO 8601) | — | Sim |
| `updatedAt` | `string` (ISO 8601) | — | Sim |

### 7.3 Valores de Urgência

| Valor | Label | Classe CSS | Cor |
|-------|-------|-----------|-----|
| `low` | I — Baixa | `.urgency-low` | Verde (`#22c55e`) |
| `medium` | II — Média | `.urgency-medium` | Amarelo (`#eab308`) |
| `high` | III — Alta | `.urgency-high` | Vermelho (`#ef4444`) |
| `extra` | IV — Extra | `.urgency-extra` | Azul (`#3b82f6`) |

---

## 8. Estado Atual — Análise Completa

### 8.1 Homepage

**Arquivos:** [`index.html`](../index.html) (44 linhas), [`style.css`](../style.css) (195 linhas), [`homepage.js`](../homepage.js) (26 linhas)

**Funcionamento atual:**
- Tela inicial com título "BLOCKS OF NOTE" em Bebas Neue, subtítulo "Anotações e tarefas, do seu jeito."
- Dois cards de navegação: NOTAS (com ícone 📝) e TAREFAS (com ícone ✅), cada um com descrição
- Cards têm hover effect com barra animada via `::before` pseudo-elemento
- Animação de entrada: staggered opacity + transform com `200 + i * 150` ms delay
- Links diretos para `paginanot.html` e `paginatask.html`

**O que foi removido:**
- ❌ Overlay de introdução com cubo 3D e texto "BLOCKS F NOTES"
- ❌ Cubo central 3D com animação `spin`
- ❌ Menu com cubos laterais deslizantes
- ❌ Script inline no HTML (lógica de clique do menu)
- ❌ CSS morto (`.wrapper.active-intro`, `@keyframes cubeFocus`)
- ❌ Fonte Geometra.ttf (inexistente)

### 8.2 Página de Notas

**Arquivos:** [`paginanot.html`](../paginanot.html) (61 linhas), [`paginanot.css`](../paginanot.css) (299 linhas), [`paginanot.js`](../paginanot.js) (310 linhas)

**Funcionamento atual:**
- Header com título "📝 NOTAS" e ações: NOVA, REMOVER, EXPORTAR
- Campo de busca com filtro em tempo real por título
- Grid de cards (`repeat(auto-fill, minmax(280px, 1fr))`) com gap 20px
- Cada card: título (2-line clamp), preview do conteúdo (3-line clamp), data formatada
- Modo remoção: classe `.removing` no container, cards com borda vermelha e animação `shake`
- Modal editor com `backdrop-filter: blur(8px)`, animação `modalIn`, campos com maxlength
- Exportação para JSON via `Blob` + download
- Empty state com botão "CRIAR PRIMEIRA NOTA"

**O que foi removido:**
- ❌ Cubo central 3D com menu CREATE/REMOVE
- ❌ Mini cubos 3D em órbita (cada nota era um cubo 3D com 6 faces)
- ❌ Animação `orbit2D` com `rotate()` + `translateX(260px)`
- ❌ Delay aleatório nas órbitas (`Math.random() * -12`)
- ❌ Scrollbar customizada no textarea

### 8.3 Página de Tarefas

**Arquivos:** [`paginatask.html`](../paginatask.html) (81 linhas), [`paginatask.css`](../paginatask.css) (222 linhas), [`paginatask.js`](../paginatask.js) (130 linhas)

**Funcionamento atual:**
- Formulário com layout de duas colunas (form + preview sidebar)
- Campos: título (maxlength 200), data, hora, local (maxlength 200), textarea descrição (maxlength 1000)
- Select de urgência com 4 opções (low/medium/high/extra)
- Preview de urgência: indicador com dot colorido + label + legenda lateral
- Validação: título obrigatório, limites de caracteres
- Toast de feedback ao salvar
- Formulário limpo após salvar

**O que foi removido:**
- ❌ Cubo 3D de urgência com 6 faces coloridas
- ❌ Animação `spin` no cubo
- ❌ Inline styles para link do board

**Bugs corrigidos:**
- ✅ Seletor de urgência: JS comparava `"1"`, `"2"`, `"3"` mas HTML usava `"low"`, `"medium"`, `"high"` — corrigido para class-based approach
- ✅ Nível "extra" (IV) não tinha mapeamento — adicionado
- ✅ Botão "SALVAR_TAREFA" sem event listener — implementado CRUD completo

### 8.4 Task Board

**Arquivos:** [`taskboard/taskboard.html`](../taskboard/taskboard.html) (42 linhas), [`taskboard/taskboard.css`](../taskboard/taskboard.css) (157 linhas), [`taskboard/taskboard.js`](../taskboard/taskboard.js) (166 linhas)

**Funcionamento atual:**
- Header com título "📋 TASK BOARD" e ações (+ NOVA, ← VOLTAR)
- Controles: busca textual + filtro por urgência + stats
- Grid de cards (`repeat(auto-fill, minmax(320px, 1fr))`)
- Cada card: barra lateral de 6px colorida, título, meta (data/hora/local/badge), descrição, botão EXCLUIR
- Exclusão com animação scale(0) + confirmação
- Empty state com link para criar tarefa
- Usa classes do design system: `.btn`, `.btn-primary`, `.btn-danger`, `.btn-sm`, `.input`, `.select`

### 8.5 Shared

**Arquivos:** [`shared/base.css`](../shared/base.css) (232 linhas), [`shared/toast.css`](../shared/toast.css) (85 linhas), [`shared/toast.js`](../shared/toast.js) (66 linhas), [`shared/storage.js`](../shared/storage.js) (73 linhas)

**Estado:** Todos funcionais e integrados.

### 8.6 Documentação Desatualizada

Os seguintes documentos ainda referenciam a arquitetura antiga com cubos 3D:

| Documento | Problema |
|-----------|----------|
| [`docs/arquitetura.md`](../docs/arquitetura.md) | Menciona cubos 3D, `notes/` e `tasks/` pastas que não existem, variáveis CSS de cubo, `@keyframes spin` |
| [`docs/roadmap.md`](../docs/roadmap.md) | Roadmap inteiro baseado em fases de migração de cubos 3D, hotfixes já resolvidos |
| [`docs/visão.md`](../docs/visão.md) | Descreve "menu 3D interativo", "mini cubo em órbita", "cubo 3D que muda de cor" |
| [`plans/pontos-de-melhoria.md`](../plans/pontos-de-melhoria.md) | Plano completo de migração de cubos 3D, hotfixes já aplicados |

### 8.7 Testes Desatualizados (E2E)

| Arquivo | Problema |
|---------|----------|
| [`e2e/notes.spec.js`](../e2e/notes.spec.js) | Referencia `#cube-main-note`, `#notes-orbit`, `.mini-note-scene` (não existem mais). Título esperado `/Minhas Notas/` mas atual é "Notas - Commentarium" |
| [`e2e/tasks.spec.js`](../e2e/tasks.spec.js) | Referencia `#cube` (não existe mais), `#taskboard-stats` (deveria ser `#board-stats`), `.btn-delete` (deveria ser `.btn-danger`), `#taskboard-filter` (deveria ser `#board-filter`), `#taskboard-search` (deveria ser `#board-search`) |

---

## 9. Modificações Realizadas

### 9.1 Homepage

| Antes | Depois |
|-------|--------|
| Overlay de introdução com cubo 3D animado e "BLOCKS F NOTES" | Título direto "BLOCKS OF NOTE" com subtítulo |
| Cubo central 3D que girava e revelava cubos laterais ao clicar | Dois cards de navegação fixos com ícones e descrições |
| Menu com cubos laterais "NOTAS" e "TAREFAS" deslizantes | Links diretos `<a>` estilizados como cards |
| Script inline no HTML para lógica do menu | Todo JS em `homepage.js` (IIFE) |
| Fonte Geometra.ttf (arquivo inexistente) | Google Fonts Bebas Neue via `@import` |
| CSS morto (`.wrapper.active-intro`, `@keyframes cubeFocus`) | Removido |

### 9.2 Página de Notas

| Antes | Depois |
|-------|--------|
| Cubo central 3D com menu CREATE/REMOVE ao clicar | Header fixo com botões NOVA, REMOVER, EXPORTAR |
| Mini cubos 3D em órbita (cada nota = cubo com 6 faces) | Grid de cards com título, preview, data |
| Órbita 2D via CSS (`rotate()` + `translateX(260px)`) | Grid CSS (`repeat(auto-fill, minmax(280px, 1fr))`) |
| Delay aleatório nas órbitas | Layout determinístico |
| Modal com `style.display = 'flex'/'none'` | Modal com classes CSS (`.modal-overlay`) |
| Botão REMOVE com manipulação direta de `style` | Classe `.removing` no container |

### 9.3 Página de Tarefas

| Antes | Depois |
|-------|--------|
| Cubo 3D de urgência com 6 faces coloridas | Indicador de urgência com dot + label + legenda |
| Seletor de urgência quebrado (JS vs HTML mismatch) | Class-based urgency preview funcionando |
| Nível "extra" (IV) ignorado no JS | Mapeamento completo: low/medium/high/extra |
| Botão "SALVAR_TAREFA" sem event listener | CRUD completo implementado |
| Animação `spin` sobrescrevendo `rotateY` inicial | Preview estático com classes CSS |

### 9.4 Task Board

| Antes | Depois |
|-------|--------|
| IDs: `taskboard-search`, `taskboard-filter`, `taskboard-stats`, `taskboard-grid` | IDs: `board-search`, `board-filter`, `board-stats`, `board-grid` |
| Classe `.btn-delete` personalizada | Classe `.btn-danger` do design system |
| CSS com valores fixos | CSS com variáveis do design system |

### 9.5 Design System

| Antes | Depois |
|-------|--------|
| CSS de cubo 3D duplicado em 3 arquivos | `shared/base.css` com design system completo |
| Sem componentes reutilizáveis | `.btn`, `.btn-primary`, `.btn-danger`, `.btn-sm`, `.input`, `.select`, `.card`, `.btn-back`, `.divider`, `.sr-only` |
| Cores soltas em cada arquivo | Variáveis CSS centralizadas em `:root` |
| Sem `:focus-visible` | `:focus-visible` com outline 3px |
| Sem `prefers-reduced-motion` | Media query de redução de movimento |

---

## 10. Modificações Pendentes

### 🔴 Prioridade Alta

#### 10.1 — Atualizar testes E2E para nova interface

**Arquivos:** [`e2e/notes.spec.js`](../e2e/notes.spec.js), [`e2e/tasks.spec.js`](../e2e/tasks.spec.js)

**Problema:** Testes E2E referenciam seletores que não existem mais (cubos 3D, órbitas, IDs antigos).

**Tarefas:**
- [ ] [`e2e/notes.spec.js`](../e2e/notes.spec.js):
  - Substituir `#cube-main-note` por `.notes-grid` ou `#notes-grid`
  - Substituir `#notes-orbit` por `#notes-grid`
  - Substituir `.mini-note-scene` por `.note-card`
  - Atualizar title check de `/Minhas Notas/` para `/Notas/`
  - Atualizar fluxo de criação (agora é botão NOVA, não cubo central)
  - Atualizar fluxo de remoção (agora é toggle REMOVER + clique no card)
- [ ] [`e2e/tasks.spec.js`](../e2e/tasks.spec.js):
  - Substituir `#cube` por `#urgency-indicator`
  - Substituir `#taskboard-stats` por `#board-stats`
  - Substituir `.btn-delete` por `.btn-danger`
  - Substituir `#taskboard-filter` por `#board-filter`
  - Substituir `#taskboard-search` por `#board-search`
  - Atualizar teste de classe do cubo para classe do indicador

#### 10.2 — Atualizar documentação desatualizada

**Arquivos:** [`docs/arquitetura.md`](../docs/arquitetura.md), [`docs/roadmap.md`](../docs/roadmap.md), [`docs/visão.md`](../docs/visão.md), [`plans/pontos-de-melhoria.md`](../plans/pontos-de-melhoria.md)

**Problema:** Todos os documentos ainda descrevem a arquitetura antiga com cubos 3D.

**Tarefas:**
- [ ] [`docs/arquitetura.md`](../docs/arquitetura.md): Remover referências a cubos 3D, `notes/` e `tasks/` pastas, variáveis de cubo, `@keyframes spin`. Atualizar para refletir design system atual.
- [ ] [`docs/roadmap.md`](../docs/roadmap.md): Remover fases de hotfixes já resolvidos, atualizar para nova interface.
- [ ] [`docs/visão.md`](../docs/visão.md): Substituir "menu 3D interativo" por "cards de navegação", "mini cubo em órbita" por "grid de cards".
- [ ] [`plans/pontos-de-melhoria.md`](../plans/pontos-de-melhoria.md): Remover referências a cubos 3D, hotfixes já aplicados, atualizar para nova interface flat.

#### 10.3 — Adicionar busca por conteúdo nas notas

**Arquivos:** [`paginanot.js`](../paginanot.js)

**Problema:** A busca atual filtra apenas por título (`handleSearch` usa `note.title.toLowerCase().includes(query)`). Conteúdo não é pesquisado.

**Tarefas:**
- [ ] Expandir `handleSearch()` para buscar também em `note.content`
- [ ] Manter case-insensitive

#### 10.4 — Adicionar confirmação antes de exportar notas vazias

**Arquivos:** [`paginanot.js`](../paginanot.js)

**Problema:** O botão EXPORTAR gera um JSON vazio se não houver notas, sem feedback claro.

**Tarefas:**
- [ ] Verificar se há notas antes de exportar
- [ ] Se vazio, exibir Toast do tipo `info` informando "Nenhuma nota para exportar."
- [ ] Se houver notas, exportar normalmente com Toast de sucesso

### 🟡 Prioridade Média

#### 10.5 — Adicionar loading state no modal de notas

**Arquivos:** [`paginanot.css`](../paginanot.css), [`paginanot.js`](../paginanot.js)

**Problema:** Não há feedback visual durante operações assíncronas (salvar, exportar).

**Tarefas:**
- [ ] Adicionar classe `.loading` ao botão SALVAR durante o salvamento
- [ ] Desabilitar botão durante operação para evitar duplo clique

#### 10.6 — Melhorar empty state do Task Board

**Arquivos:** [`taskboard/taskboard.css`](../taskboard/taskboard.css)

**Problema:** Empty state atual é funcional mas poderia ter melhor apelo visual.

**Tarefas:**
- [ ] Adicionar ícone maior no empty state
- [ ] Melhorar copy da mensagem

#### 10.7 — Adicionar teste de unidade para `handleExport`

**Arquivos:** [`tests/notes.test.js`](../tests/notes.test.js)

**Problema:** Função de exportação não tem cobertura de testes.

**Tarefas:**
- [ ] Mockar `Blob`, `URL.createObjectURL`, `document.createElement('a')`
- [ ] Testar que o JSON gerado contém as notas corretas

### 🟢 Prioridade Baixa

#### 10.8 — Refatorar `paginanot.js` para extrair Data Layer em módulo separado

**Arquivos:** [`paginanot.js`](../paginanot.js), **novo:** `shared/notes-storage.js`

**Problema:** As funções de Data Layer (`getNotes`, `saveNotes`, `createNote`, etc.) estão misturadas com UI e Controller no mesmo arquivo.

**Tarefas:**
- [ ] Criar `shared/notes-storage.js` com as funções de CRUD de notas
- [ ] Importar no `paginanot.js`
- [ ] Atualizar testes para importar do novo módulo

#### 10.9 — Adicionar animação de entrada nos cards do grid de notas

**Arquivos:** [`paginanot.css`](../paginanot.css)

**Problema:** Cards aparecem instantaneamente sem transição.

**Tarefas:**
- [ ] Adicionar `@keyframes cardIn` com opacity + translateY
- [ ] Aplicar com `animation-delay` escalonado via JS ou nth-child

---

## 11. Testes

### 11.1 Testes Unitários (Vitest)

**Configuração:** [`vitest.config.js`](../vitest.config.js)
- Environment: `node`
- Include: `tests/**/*.test.js`
- Coverage: `shared/storage.js` (provider v8)

#### [`tests/storage.test.js`](../tests/storage.test.js) (189 linhas)

| Describe | Testes | Cobertura |
|----------|--------|-----------|
| `Storage.safeGet` | 6 testes | Fallback, null, JSON parse, JSON inválido, array vazio, fallback padrão |
| `Storage.safeSet` | 5 testes | Salvar dados, objeto vazio, array vazio, sobrescrever, QuotaExceededError |
| `Storage.safeRemove` | 2 testes | Remover existente, remover inexistente |
| `Storage — integração CRUD` | 2 testes | Ciclo completo CRUD, manter dados entre operações |

#### [`tests/notes.test.js`](../tests/notes.test.js) (231 linhas)

| Describe | Testes | Cobertura |
|----------|--------|-----------|
| `getNotes / getNoteById` | 4 testes | Array vazio, retornar salvas, encontrar por ID, ID inexistente |
| `createNote` | 4 testes | Criar com campos, campos faltantes, persistência, múltiplas notas |
| `updateNote` | 4 testes | Atualizar campos, atualizar updatedAt, ID inexistente, preservar campos |
| `deleteNoteById` | 3 testes | Remover existente, não afetar outras, não lançar erro |
| `Validação de limites` | 4 testes | Título dentro/fora do limite, conteúdo dentro/fora do limite |

#### [`tests/tasks.test.js`](../tests/tasks.test.js) (261 linhas)

| Describe | Testes | Cobertura |
|----------|--------|-----------|
| `getTasks / getTaskById` | 4 testes | Array vazio, retornar salvas, encontrar por ID, ID inexistente |
| `createTask` | 3 testes | Criar com todos campos, valores padrão, persistência |
| `updateTask` | 2 testes | Atualizar campos, ID inexistente |
| `deleteTaskById` | 2 testes | Remover existente, preservar outras |
| `validação de tarefas` | 7 testes | Título vazio, título longo, descrição longa, local longo, dados válidos, título no limite, descrição no limite |
| `Schema da tarefa` | 2 testes | Todos os campos do schema, urgência válida |

### 11.2 Testes E2E (Playwright) — DESATUALIZADOS

**Configuração:** [`playwright.config.js`](../playwright.config.js)
- Test dir: `./e2e`
- Browser: Chromium (Desktop Chrome)
- Base URL: `http://localhost:5500`
- Reporter: HTML (`e2e-report/`)

**Status:** ❌ Ambos os arquivos [`e2e/notes.spec.js`](../e2e/notes.spec.js) e [`e2e/tasks.spec.js`](../e2e/tasks.spec.js) estão desatualizados e falharão ao executar porque referenciam seletores da interface 3D antiga.

---

## 12. Acessibilidade

### 12.1 Implementado

| Item | Onde | Detalhes |
|------|------|----------|
| `:focus-visible` | [`shared/base.css:197-200`](../shared/base.css:197) | `outline: 3px solid var(--color-border); outline-offset: 3px` |
| `prefers-reduced-motion` | [`shared/base.css:215-221`](../shared/base.css:215) | Desabilita animações e transições |
| `role="main"` | [`index.html:12`](../index.html:12), [`paginanot.html:15`](../paginanot.html:15), [`paginatask.html:15`](../paginatask.html:15) | Landmark principal |
| `role="dialog"` + `aria-modal` | [`paginanot.html:38`](../paginanot.html:38) | Modal de edição de notas |
| `role="search"` | [`taskboard/taskboard.html:21`](../taskboard/taskboard.html:21) | Região de busca |
| `role="list"` | [`taskboard/taskboard.html:33`](../taskboard/taskboard.html:33) | Lista de tarefas |
| `aria-label` | Botões, inputs, selects em todas as páginas | Descrições para leitores de tela |
| `aria-live="polite"` | [`taskboard/taskboard.html:30`](../taskboard/taskboard.html:30) | Atualizações de stats |
| `aria-hidden="true"` | Barra de urgência nos cards do board | Elemento decorativo |
| `.sr-only` | [`shared/base.css:202-212`](../shared/base.css:202) | Conteúdo visível apenas para leitores de tela |

### 12.2 Pendente

| Item | Prioridade | Detalhes |
|------|-----------|----------|
| Navegação por teclado no modal | Média | Foco deve ser preso dentro do modal quando aberto (focus trap) |
| Fechar modal com Escape | Média | Atualmente só fecha clicando fora ou no botão CANCELAR |
| Anúncio de resultados de busca | Baixa | `aria-live` para anunciar quantos cards foram encontrados |
| Contraste de cores | Baixa | Verificar contraste do `--color-text-muted` (#888) em fundo branco |

---

## 13. Responsividade

### 13.1 Breakpoints Implementados

| Breakpoint | Onde | Ajustes |
|-----------|------|---------|
| `max-width: 768px` | [`style.css`](../style.css) | Homepage: cards empilham em coluna, font-size reduzido, padding ajustado |
| `max-width: 768px` | [`paginanot.css`](../paginanot.css) | Grid: 1 coluna, modal: padding reduzido, header: empilha |
| `max-width: 768px` | [`paginatask.css`](../paginatask.css) | Form: coluna única, sidebar vira bottom, preview inline |
| `max-width: 768px` | [`taskboard/taskboard.css`](../taskboard/taskboard.css) | Header: coluna, grid: 1 coluna, padding reduzido |
| `max-width: 768px` | [`shared/base.css`](../shared/base.css) | `.btn-back`: padding e font-size reduzidos |
| `max-width: 480px` | [`shared/toast.css`](../shared/toast.css) | Toast: largura total, texto centralizado |
| `max-width: 480px` | [`paginatask.css`](../paginatask.css) | Meta rows: cada campo em linha própria |

### 13.2 Unidades Fluidas

| Propriedade | Onde | Valor |
|-------------|------|-------|
| `font-size` do título do board | [`taskboard/taskboard.css:24`](../taskboard/taskboard.css:24) | `clamp(1.5rem, 3vw, 2rem)` |
| Grid columns (notas) | [`paginanot.css:102`](../paginanot.css:102) | `repeat(auto-fill, minmax(280px, 1fr))` |
| Grid columns (board) | [`taskboard/taskboard.css:55`](../taskboard/taskboard.css:55) | `repeat(auto-fill, minmax(320px, 1fr))` |

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| **IIFE** | Immediately Invoked Function Expression — padrão de encapsulamento JS usado em todos os módulos |
| **Module Pattern** | Padrão de design que encapsula código em escopo privado, expondo apenas uma API pública |
| **Data Layer** | Camada responsável por CRUD no `localStorage`, validação e transformação de dados |
| **UI Layer** | Camada responsável por renderização DOM, manipulação de elementos e animações CSS |
| **Controller Layer** | Camada que orquestra eventos, conecta Data Layer e UI Layer |
| **Design System** | Conjunto de variáveis CSS, componentes reutilizáveis e convenções visuais |
| **CSS Custom Properties** | Variáveis CSS definidas em `:root` e usadas em todo o projeto |
| **`clamp()`** | Função CSS que define um valor mínimo, preferido e máximo (`min, preferred, max`) |
| **`prefers-reduced-motion`** | Media query CSS que detecta preferência do usuário por reduzir animações |
| **Toast** | Componente de notificação não-intrusiva que aparece e desaparece automaticamente |
| **Empty State** | Estado visual exibido quando não há dados (lista vazia) |
| **Staggered Animation** | Animação escalonada onde elementos aparecem um após o outro com pequeno delay |
| **Brutalist Design** | Estilo visual caracterizado por tipografia bold, bordas grossas, monocromático, sem frescuras |
| **Bebas Neue** | Fonte Google Fonts display, sans-serif, bold, usada para títulos |
| **QuotaExceededError** | Erro do `localStorage` quando o espaço de armazenamento está cheio |
| **`safeGet`/`safeSet`** | Funções do `Storage` module que envolvem operações de `localStorage` em `try/catch` |
| **CRUD** | Create, Read, Update, Delete — operações básicas de persistência |
| **ISO 8601** | Formato de data/hora internacional: `YYYY-MM-DDTHH:MM:SS.sssZ` |

---

> **Documento gerado em:** 05/06/2026
> **Versão:** 3.0
> **Propósito:** Documentação completa e atualizada do Commentarium após simplificação da interface.
