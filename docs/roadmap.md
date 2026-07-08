# Roadmap — Commentarium

> **Baseado em:** [`docs/specs.md`](specs.md)
> **Propósito:** Plano de evolução do projeto em fases incrementais, organizadas por prioridade e dependência técnica.

---

## Visão Geral das Fases

| Fase | Nome | Foco | Prioridade |
|------|------|------|------------|
| **0** | Simplificação da Interface | Substituição da interface 3D por cards flat | ✅ Concluída |
| **1** | Documentação | Criação de specs.md e atualização de docs | ✅ Concluída |
| **2** | Testes e Qualidade | Atualização de E2E, testes unitários | 🔴 Atual |
| **3** | Refinamentos de UI | Loading states, animações, empty states | 🟡 Curto prazo |
| **4** | Acessibilidade | Focus trap, Escape key, aria-live | 🟡 Curto prazo |
| **5** | Refatoração | Extração de Data Layer para módulo separado | 🟢 Médio prazo |
| **6** | Visão de Futuro | Ideias para evolução além do escopo atual | 🔵 Longo prazo |

---

## 📐 Especificações Técnicas (Specs)

> As especificações detalhadas estão em [`docs/specs.md`](specs.md). Este roadmap contém apenas o plano de evolução.

---

## Fase 0 — ✅ Simplificação da Interface (Concluída)

**Objetivo:** Substituir a interface 3D por cards flat, mantendo a estética brutalista.

### 0.1 — Homepage
- **Antes:** Cubo 3D central com overlay de intro, cubos laterais deslizantes
- **Depois:** Cards de navegação com animação de entrada escalonada
- **Arquivos:** [`index.html`](../index.html), [`style.css`](../style.css), [`homepage.js`](../homepage.js)

### 0.2 — Página de Notas
- **Antes:** Cubo central com mini cubos em órbita 3D
- **Depois:** Grid de cards com busca, exportação, modal editor
- **Arquivos:** [`paginanot.html`](../paginanot.html), [`paginanot.css`](../paginanot.css), [`paginanot.js`](../paginanot.js)

### 0.3 — Página de Tarefas
- **Antes:** Cubo 3D de urgência quebrado (nunca mudava de cor)
- **Depois:** Indicador de urgência baseado em classes CSS, formulário funcional
- **Arquivos:** [`paginatask.html`](../paginatask.html), [`paginatask.css`](../paginatask.css), [`paginatask.js`](../paginatask.js)

### 0.4 — Task Board
- **Antes:** Cards com seletores antigos
- **Depois:** Design system classes, grid responsivo
- **Arquivos:** [`taskboard/`](../taskboard/)

### 0.5 — Design System
- **Criado:** [`shared/base.css`](../shared/base.css) com variáveis CSS e componentes reutilizáveis
- **Atualizado:** [`shared/toast.css`](../shared/toast.css) para usar variáveis do design system

---

## Fase 1 — ✅ Documentação (Concluída)

**Objetivo:** Documentar todo o projeto e atualizar specs.

### 1.1 — Criar docs/specs.md
- Documentação completa do estado atual, arquitetura, design system
- Modificações realizadas e pendentes
- 14 seções, 838 linhas

### 1.2 — Atualizar docs desatualizados
- [`docs/arquitetura.md`](arquitetura.md): Removidas referências a cubos 3D
- [`docs/roadmap.md`](roadmap.md): Atualizado com novas fases
- [`docs/visão.md`](visão.md): Substituída descrição 3D por flat
- [`plans/pontos-de-melhoria.md`](../plans/pontos-de-melhoria.md): Atualizado para nova interface

---

## Fase 2 — 🔴 Testes e Qualidade

**Objetivo:** Garantir que testes acompanhem a nova interface.

### 2.1 — Atualizar E2E Tests ✅
- [`e2e/notes.spec.js`](../e2e/notes.spec.js): Substituídos seletores 3D por seletores da nova interface
- [`e2e/tasks.spec.js`](../e2e/tasks.spec.js): Substituídos seletores antigos (`#cube` → `#urgency-indicator`, `#taskboard-stats` → `#board-stats`, `.btn-delete` → `.btn-danger`)

### 2.2 — Adicionar teste de unidade para `handleExport`
- **Arquivo:** [`tests/notes.test.js`](../tests/notes.test.js)
- Mockar `Blob`, `URL.createObjectURL`, `document.createElement('a')`
- Testar que o JSON gerado contém as notas corretas

---

## Fase 3 — 🟡 Refinamentos de UI

**Objetivo:** Melhorar feedback visual e experiência do usuário.

### 3.1 — Loading state no modal de notas
- **Arquivos:** [`paginanot.css`](../paginanot.css), [`paginanot.js`](../paginanot.js)
- Adicionar classe `.loading` ao botão SALVAR durante salvamento
- Desabilitar botão durante operação para evitar duplo clique

### 3.2 — Melhorar empty state do Task Board
- **Arquivo:** [`taskboard/taskboard.css`](../taskboard/taskboard.css)
- Adicionar ícone maior no empty state
- Melhorar copy da mensagem

### 3.3 — Adicionar animação de entrada nos cards do grid de notas
- **Arquivo:** [`paginanot.css`](../paginanot.css)
- Adicionar `@keyframes cardIn` com opacity + translateY
- Aplicar com `animation-delay` escalonado

---

## Fase 4 — 🟡 Acessibilidade

**Objetivo:** Melhorar navegação por teclado e experiência para leitores de tela.

### 4.1 — Focus trap no modal
- **Arquivo:** [`paginanot.js`](../paginanot.js)
- Foco deve ser preso dentro do modal quando aberto

### 4.2 — Fechar modal com Escape ✅
- **Arquivo:** [`paginanot.js`](../paginanot.js)
- Já implementado (linhas 294-298)

### 4.3 — Anúncio de resultados de busca
- **Arquivo:** [`paginanot.js`](../paginanot.js)
- Adicionar `aria-live` para anunciar quantos cards foram encontrados

### 4.4 — Contraste de cores
- Verificar contraste do `--color-text-muted` (#888) em fundo branco

---

## Fase 5 — 🟢 Refatoração

**Objetivo:** Melhorar organização do código.

### 5.1 — Extrair Data Layer de notas para módulo separado
- **Arquivos:** **Novo:** `shared/notes-storage.js`, [`paginanot.js`](../paginanot.js)
- Mover funções CRUD de notas para módulo separado
- Atualizar testes para importar do novo módulo

---

## Fase 6 — 🔵 Visão de Futuro

**Objetivo:** Ideias para evolução do projeto a longo prazo.

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

## Resumo do Roadmap

| Fase | Itens | Status |
|------|-------|--------|
| 0 — Simplificação da Interface | 5 | ✅ Concluída |
| 1 — Documentação | 2 | ✅ Concluída |
| 2 — Testes e Qualidade | 2 | 🔴 Em andamento |
| 3 — Refinamentos de UI | 3 | 🟡 Pendente |
| 4 — Acessibilidade | 4 | 🟡 Pendente |
| 5 — Refatoração | 1 | 🟢 Pendente |
| 6 — Visão de Futuro | — | 🔵 Longo prazo |

---

> **Documento gerado em:** 05/06/2026
> **Baseado em:** [`docs/specs.md`](specs.md)
> **Propósito:** Roteiro de evolução do Commentarium após simplificação da interface.
