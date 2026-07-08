# Visão do Produto — Commentarium

> **Propósito:** Descrever o produto, seu público-alvo e funcionalidades — sem detalhes técnicos.
> **Documentos relacionados:** [`docs/specs.md`](specs.md), [`docs/arquitetura.md`](arquitetura.md), [`docs/roadmap.md`](roadmap.md)

---

## 🧠 O que o sistema faz

O **Commentarium** é uma aplicação web front-end de **anotações e cadastro de tarefas** com interface flat, design brutalista e foco em simplicidade. O conceito central é a **experiência direta e sem frescuras**: cards, grids e tipografia bold.

### Funcionalidades principais

| Funcionalidade | Descrição |
|---|---|
| **Navegação por cards** | Homepage com dois cards grandes para acessar Notas e Tarefas |
| **CRUD de Notas** | Criação, visualização, edição e exclusão de notas em grid de cards |
| **Editor de notas** | Modal de edição com título, data de criação, texto livre, e botões de salvar/descartar |
| **Cadastro de Tarefas** | Formulário com título, data, hora, local, descrição e grau de urgência |
| **Indicador visual de urgência** | Preview colorido que muda conforme o nível selecionado (I a IV) |
| **Task Board** | Visualização em cards de todas as tarefas cadastradas, com filtros por urgência e busca textual |
| **Persistência offline** | Dados salvos no navegador — funcionam mesmo sem internet |
| **Exportação de dados** | Download de notas em formato JSON para backup |
| **Busca de notas** | Campo de busca que filtra notas em tempo real por título e conteúdo |
| **Toast de feedback** | Notificações visuais não-intrusivas para confirmar ações do usuário |

---

## 👥 Público-alvo

- **Usuários individuais** que preferem ferramentas simples e diretas para organizar notas e tarefas
- **Entusiastas de design** que apreciam interfaces brutais com tipografia bold e estética monochrome
- **Profissionais** que precisam de um bloco de notas rápido e offline, sem cadastro ou configuração
- **Estudantes** que querem uma ferramenta simples para anotações e lembretes

---

## 🎨 Diferenciais

1. **Design brutalista** — Tipografia Bebas Neue, bordas grossas, preto e branco, sem frescuras
2. **Zero configuração** — Abre no navegador e funciona imediatamente, sem instalação ou cadastro
3. **Offline-first** — Todos os dados ficam salvos localmente, funcionando sem internet
4. **Design autoral** — Estilo único com identidade visual marcante
5. **Leve e rápido** — Sem dependências externas, carregamento instantâneo

---

## 📋 Funcionalidades por página

### Homepage (`index.html`)

- Título "BLOCKS OF NOTE" com subtítulo descritivo
- Dois cards de navegação: **NOTAS** (com ícone 📝) e **TAREFAS** (com ícone ✅)
- Animações de entrada escalonadas nos cards
- Design responsivo: cards empilham em coluna no mobile

### Página de Notas (`paginanot.html`)

- Header com título, contador de notas e botões de ação (NOVA, REMOVER, EXPORTAR)
- Campo de busca que filtra notas em tempo real por título e conteúdo
- Grid de cards com título (2 linhas), preview (3 linhas) e data
- Modo de remoção com bordas vermelhas e animação shake
- Modal de edição estilo Notion com título, textarea e data
- Toast de feedback para criar, salvar e excluir notas
- Exportação para JSON com verificação de notas vazias

### Página de Tarefas (`paginatask.html`)

- Formulário completo: título, data, hora, local, descrição
- Seletor de urgência com 4 níveis (I a IV) com labels descritivos
- Indicador visual de urgência com cor dinâmica
- Legenda lateral com todos os níveis de urgência
- Validação de campos obrigatórios
- Toast de feedback ao salvar

### Task Board (`taskboard/taskboard.html`)

- Lista todas as tarefas em formato de cards com barra de urgência colorida
- Filtro por nível de urgência
- Busca textual por título/local/descrição
- Exclusão de tarefas com confirmação
- Estatísticas: total de tarefas

---

## 📐 Fluxos do usuário

### Fluxo: Criar uma nota

```
Home → clicar NOTAS → clicar NOVA → editar título e conteúdo → SALVAR
```

### Fluxo: Gerenciar tarefas

```
Home → clicar TAREFAS → preencher formulário → SALVAR
→ VER TAREFAS (link no topo) → Task Board → visualizar/filtrar/excluir
```

### Fluxo: Backup de dados

```
Página de Notas → botão EXPORTAR → download JSON
```

---

## 🚫 Não-escopo (versão atual)

- ❌ Autenticação / múltiplos usuários
- ❌ Sincronização em nuvem
- ❌ Editor markdown / rich text
- ❌ Categorias ou tags
- ❌ Modo escuro
- ❌ Notificações push

---

> **Documento gerado em:** 05/06/2026
> **Propósito:** Definir a visão do produto Commentarium do ponto de vista do usuário e do negócio.
