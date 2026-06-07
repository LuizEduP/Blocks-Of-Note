# Plano de Melhorias — Blocks-Of-Note

> **Baseado em:** [`docs/specs.md`](../docs/specs.md), [`docs/roadmap.md`](../docs/roadmap.md)
> **Data:** 05/06/2026
> **Propósito:** Consolidar todos os pontos de melhoria identificados após a simplificação da interface.

---

## Sumário

1. [Visão Geral das Fases](#1-visão-geral-das-fases)
2. [Fase 0 — Simplificação da Interface (Concluída)](#fase-0--simplificação-da-interface-concluída)
3. [Fase 1 — Documentação (Concluída)](#fase-1--documentação-concluída)
4. [Fase 2 — Testes e Qualidade](#fase-2--testes-e-qualidade)
5. [Fase 3 — Refinamentos de UI](#fase-3--refinamentos-de-ui)
6. [Fase 4 — Acessibilidade](#fase-4--acessibilidade)
7. [Fase 5 — Refatoração](#fase-5--refatoração)
8. [Fase 6 — Visão de Futuro](#fase-6--visão-de-futuro)

---

## 1. Visão Geral das Fases

| Fase | Nome | Foco | Prioridade | Itens |
|------|------|------|------------|-------|
| **0** | Simplificação da Interface | Substituição 3D → flat cards | ✅ Concluída | 5 |
| **1** | Documentação | Criação e atualização de docs | ✅ Concluída | 2 |
| **2** | Testes e Qualidade | Atualização de E2E, testes unitários | 🔴 Atual | 2 |
| **3** | Refinamentos de UI | Loading states, animações, empty states | 🟡 Curto prazo | 3 |
| **4** | Acessibilidade | Focus trap, aria-live, contraste | 🟡 Curto prazo | 4 |
| **5** | Refatoração | Extração de Data Layer | 🟢 Médio prazo | 1 |
| **6** | Visão de Futuro | Ideias de longo prazo | 🔵 Longo prazo | — |

---

## Fase 0 — ✅ Simplificação da Interface (Concluída)

**Objetivo:** Substituir a interface 3D por cards flat, mantendo a estética brutalista.

### 0.1 — Homepage

| Campo | Detalhe |
|-------|---------|
| **Antes** | Cubo 3D central com overlay de intro, cubos laterais deslizantes |
| **Depois** | Cards de navegação com animação de entrada escalonada |
| **Arquivos** | [`index.html`](../index.html), [`style.css`](../style.css), [`homepage.js`](../homepage.js) |

### 0.2 — Página de Notas

| Campo | Detalhe |
|-------|---------|
| **Antes** | Cubo central com mini cubos em órbita 3D |
| **Depois** | Grid de cards com busca, exportação, modal editor |
| **Arquivos** | [`paginanot.html`](../paginanot.html), [`paginanot.css`](../paginanot.css), [`paginanot.js`](../paginanot.js) |

### 0.3 — Página de Tarefas

| Campo | Detalhe |
|-------|---------|
| **Antes** | Cubo 3D de urgência quebrado (nunca mudava de cor), botão salvar sem função |
| **Depois** | Indicador de urgência baseado em classes CSS, formulário funcional com validação |
| **Arquivos** | [`paginatask.html`](../paginatask.html), [`paginatask.css`](../paginatask.css), [`paginatask.js`](../paginatask.js) |

### 0.4 — Task Board

| Campo | Detalhe |
|-------|---------|
| **Antes** | Cards com seletores antigos |
| **Depois** | Design system classes, grid responsivo |
| **Arquivos** | [`taskboard/`](../taskboard/) |

### 0.5 — Design System

| Campo | Detalhe |
|-------|---------|
| **Criado** | [`shared/base.css`](../shared/base.css) com variáveis CSS e componentes reutilizáveis |
| **Atualizado** | [`shared/toast.css`](../shared/toast.css) para usar variáveis do design system |

---

## Fase 1 — ✅ Documentação (Concluída)

**Objetivo:** Documentar todo o projeto e atualizar specs.

### 1.1 — Criar docs/specs.md
- Documentação completa do estado atual, arquitetura, design system
- Modificações realizadas e pendentes
- 14 seções, 838 linhas

### 1.2 — Atualizar docs desatualizados
- [`docs/arquitetura.md`](../docs/arquitetura.md): Removidas referências a cubos 3D
- [`docs/roadmap.md`](../docs/roadmap.md): Atualizado com novas fases
- [`docs/visão.md`](../docs/visão.md): Substituída descrição 3D por flat
- [`plans/pontos-de-melhoria.md`](pontos-de-melhoria.md): Atualizado para nova interface

---

## Fase 2 — 🔴 Testes e Qualidade

**Objetivo:** Garantir que testes acompanhem a nova interface.

### 2.1 — Atualizar E2E Tests ✅

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`e2e/notes.spec.js`](../e2e/notes.spec.js), [`e2e/tasks.spec.js`](../e2e/tasks.spec.js) |
| **O que** | Substituídos seletores 3D por seletores da nova interface |
| **Status** | ✅ Concluído |

### 2.2 — Adicionar teste de unidade para `handleExport`

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`tests/notes.test.js`](../tests/notes.test.js) |
| **Tarefas** |
| — Mockar `Blob`, `URL.createObjectURL`, `document.createElement('a')` |
| — Testar que o JSON gerado contém as notas corretas |

---

## Fase 3 — 🟡 Refinamentos de UI

**Objetivo:** Melhorar feedback visual e experiência do usuário.

### 3.1 — Loading state no modal de notas

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`paginanot.css`](../paginanot.css), [`paginanot.js`](../paginanot.js) |
| **Tarefas** |
| — Adicionar classe `.loading` ao botão SALVAR durante salvamento |
| — Desabilitar botão durante operação para evitar duplo clique |

### 3.2 — Melhorar empty state do Task Board

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`taskboard/taskboard.css`](../taskboard/taskboard.css) |
| **Tarefas** |
| — Adicionar ícone maior no empty state |
| — Melhorar copy da mensagem |

### 3.3 — Adicionar animação de entrada nos cards do grid de notas

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`paginanot.css`](../paginanot.css) |
| **Tarefas** |
| — Adicionar `@keyframes cardIn` com opacity + translateY |
| — Aplicar com `animation-delay` escalonado via JS |

---

## Fase 4 — 🟡 Acessibilidade

**Objetivo:** Melhorar navegação por teclado e experiência para leitores de tela.

### 4.1 — Focus trap no modal

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`paginanot.js`](../paginanot.js) |
| **Problema** | Foco não é preso dentro do modal quando aberto |
| **Solução** | Implementar focus trap: ao abrir, focar no primeiro input; ao tab, ciclar entre elementos do modal |

### 4.2 — Fechar modal com Escape ✅

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`paginanot.js`](../paginanot.js) |
| **Status** | ✅ Já implementado (event listener `keydown` para `Escape`) |

### 4.3 — Anúncio de resultados de busca

| Campo | Detalhe |
|-------|---------|
| **Onde** | [`paginanot.js`](../paginanot.js) |
| **Tarefas** |
| — Adicionar elemento `aria-live` para anunciar quantos cards foram encontrados |

### 4.4 — Contraste de cores

| Campo | Detalhe |
|-------|---------|
| **Problema** | `--color-text-muted` (#888) pode ter contraste insuficiente em fundo branco |
| **Solução** | Verificar contraste e ajustar se necessário (mínimo 4.5:1 para texto pequeno) |

---

## Fase 5 — 🟢 Refatoração

**Objetivo:** Melhorar organização do código.

### 5.1 — Extrair Data Layer de notas para módulo separado

| Campo | Detalhe |
|-------|---------|
| **Onde** | **Novo:** `shared/notes-storage.js`, [`paginanot.js`](../paginanot.js) |
| **Tarefas** |
| — Criar `shared/notes-storage.js` com funções CRUD de notas |
| — Importar no `paginanot.js` |
| — Atualizar testes para importar do novo módulo |

---

## Fase 6 — 🔵 Visão de Futuro

Ideias para evolução do projeto a longo prazo, sem compromisso de implementação imediata.

| Ideia | Descrição | Valor |
|-------|-----------|-------|
| **Autenticação** | Login simples para múltiplos usuários no mesmo dispositivo | 🔸 Médio |
| **Sincronização em nuvem** | Backup via WebDAV, Google Drive ou API própria | 🔸 Alto |
| **Markdown no editor** | Suporte a formatação markdown com preview | 🔸 Alto |
| **Categorias/Tags** | Sistema de etiquetas para organizar notas e tarefas | 🔸 Alto |
| **Modo escuro** | Tema dark via `prefers-color-scheme` e alternância manual | 🔸 Médio |
| **Notificações** | Lembretes para tarefas via Notification API | 🔸 Alto |
| **PWA** | Service Worker + Manifest para instalação como app | 🔸 Alto |
| **Multi-idioma** | Suporte a i18n (português, inglês, espanhol) | 🔸 Médio |

---

> **Documento gerado em:** 05/06/2026
> **Baseado em:** [`docs/specs.md`](../docs/specs.md) e [`docs/roadmap.md`](../docs/roadmap.md)
> **Propósito:** Consolidar todos os pontos de melhoria identificados após a simplificação da interface.
