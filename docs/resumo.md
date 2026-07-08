# Resumo — Commentarium

> **Data:** 03/07/2026
> **Propósito:** Documento síntese que explica como o sistema funciona, o que faz, como faz e quais ferramentas utiliza.
> **Documentos relacionados:** [`visão.md`](visão.md), [`specs.md`](specs.md), [`arquitetura.md`](arquitetura.md), [`roadmap.md`](roadmap.md)

---

## 1. O que é o Commentarium?

O **Commentarium** é uma aplicação web full-stack de **produtividade e colaboração** que combina:

- **Anotações** com editor de texto completo
- **Gerenciamento de tarefas** com níveis de urgência e quadro kanban
- **Workspace colaborativo em tempo real** com board modular (blocos de texto/imagem + desenho livre) e chat integrado
- **Mensagens diretas** entre usuários com notificações em tempo real
- **Autenticação via Google** (OAuth 2.0 com Supabase)
- **Sincronização em nuvem** persistindo dados no PostgreSQL via Supabase

A interface segue um **design brutalista moderno** com tipografia Space Grotesk + Inter, temas claro/escuro, e arquitetura **offline-first** com fallback para localStorage.

---

## 2. O que o sistema faz?

### 2.1 Páginas e funcionalidades

| Página | Rota | Funcionalidades |
|--------|------|----------------|
| **Homepage** | `/` | Hero section, grid de features, links para todas as páginas, login Google, alternador de tema |
| **Notas** | `/notes/` | CRUD completo de notas, grid de cards, modal editor, busca por título/conteúdo, exportação JSON, modo remoção |
| **Tarefas** | `/tasks/` | Formulário com título, data, hora, local, descrição, urgência (I a IV), indicador visual colorido, validação |
| **Task Board** | `/taskboard/` | Quadro kanban com cards coloridos por urgência, filtros, busca textual, exclusão com animação |
| **Workspace** | `/workspace/` | Sala colaborativa com WebSocket: board com blocos de texto/imagem arrastáveis, desenho livre com canvas, chat em tempo real, zoom/pan, grid snap, lightbox de imagens |
| **Chat** | `/chat/` | Chat local com histórico no localStorage |

### 2.2 Funcionalidades cross-cutting

| Funcionalidade | Descrição |
|---------------|-----------|
| **Autenticação Google** | Login/logout via Supabase OAuth com Google. Sessão persistente com refresh token automático |
| **Perfil + Amigos** | Painel lateral com avatar, adição de amigos por nome/email (busca no Supabase), aceitação/recusa de solicitações |
| **Chat Widget** | Botão flutuante de chat que abre conversa direta com qualquer amigo, mensagens em tempo real via Supabase Realtime |
| **Tema Claro/Escuro** | Alternância com persistência em localStorage, ícone sol/lua, variáveis CSS por tema |
| **Toast** | Notificações não-intrusivas (success, error, info, warning) com animação slide |
| **Offline-first** | Dados sempre disponíveis no localStorage. Sincronização bidirecional com Supabase quando online |
| **Responsividade** | Layout adaptável a desktop e mobile com breakpoints em 768px e 480px |
| **Acessibilidade** | `:focus-visible`, `prefers-reduced-motion`, roles ARIA, `aria-live`, `.sr-only`, navegação por teclado |

### 2.3 Fluxos principais

```
Criar nota:     Home → Notas → NOVA → editar título/conteúdo → SALVAR
Criar tarefa:   Home → Tarefas → preencher formulário → SALVAR → ver no Task Board
Workspace:      Home → Workspace → Criar Sala / Entrar com código → colaborar
Conversar:      Login → clicar avatar → Painel Perfil → 💬 no amigo → Chat Widget
Exportar:       Notas → EXPORTAR → download JSON
```

---

## 3. Como o sistema funciona?

### 3.1 Arquitetura geral

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Notas   │  │ Tarefas  │  │TaskBoard │  │  Workspace  │  │
│  │  (IIFE)  │  │  (IIFE)  │  │  (IIFE)  │  │  (Class)    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       │              │              │               │        │
│  ┌────┴──────────────┴──────────────┴───────────────┴────┐   │
│  │                   SHARED LAYER                         │   │
│  │  Storage │ Toast │ Utils │ Auth │ Theme │ Friends     │   │
│  │  Supabase Client │ ChatWidget │ ProfilesSync         │   │
│  │  NotesStorage │ TasksStorage │ ChatStorage (Supabase)│   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│              ┌────────────┴────────────┐                     │
│              │    localStorage          │                     │
│              │    (offline-first)       │                     │
│              └─────────────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
         │                           │
         │ WebSocket (ws://)         │ HTTPS (REST)
         ▼                           ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  Node.js Server  │    │       Supabase Cloud          │
│  (server.js)     │    │                               │
│                  │    │  ┌──────────┐ ┌────────────┐  │
│  • HTTP static   │    │  │   Auth   │ │ PostgreSQL  │  │
│  • REST API      │    │  │ (Google) │ │  (dados)   │  │
│    /api/workspaces│   │  └──────────┘ └────────────┘  │
│  • WebSocket     │    │  ┌──────────────────────────┐ │
│    Server        │    │  │    Realtime (mensagens)  │ │
│    (colaboração) │    │  └──────────────────────────┘ │
└──────────────────┘    └──────────────────────────────┘
```

### 3.2 Camadas do frontend (Module Pattern)

Cada módulo JavaScript segue o padrão **IIFE** (Immediately Invoked Function Expression) com três camadas internas:

| Camada | Responsabilidade | Exemplo |
|--------|-----------------|---------|
| **Data Layer** | CRUD no localStorage/Supabase, validação | `NotesStorage.getNotes()`, `ChatStorage.sendMessage()` |
| **UI Layer** | Renderização DOM, animações CSS, componentes | `renderCard()`, `renderMessages()` |
| **Controller** | Orquestrar eventos, conectar Data ↔ UI | `handleSave()`, `bindEvents()`, `init()` |

### 3.3 Persistência — Estratégia offline-first

O sistema adota uma arquitetura de **dupla camada de persistência**:

1. **localStorage** (sempre disponível, imediato):
   - `my_3d_notes` — Notas do usuário
   - `my_3d_tasks` — Tarefas do usuário
   - `commentarium_user_profile` — Perfil do usuário logado
   - `commentarium_friends` — Lista de amigos
   - `blocks_chat_messages` — Histórico do chat local
   - `commentarium-theme` — Preferência de tema
   - `blocks-chat-username` — Nome do usuário no workspace

2. **Supabase PostgreSQL** (nuvem, sincronizado):
   - Tabela `notes` — Notas (RLS: usuário vê apenas suas)
   - Tabela `tasks` — Tarefas (RLS: usuário vê apenas suas)
   - Tabela `workspaces` — Metadados de workspaces salvos
   - Tabela `workspace_messages` — Histórico de chat do workspace
   - Tabela `direct_messages` — Mensagens diretas entre usuários
   - Tabela `profiles` — Perfis públicos (busca de amigos)

**Sincronização**: Ao iniciar, o sistema carrega dados do Supabase. Cada alteração local dispara um `syncToServer()`. Um `setInterval` de 30s mantém os dados sincronizados.

### 3.4 Workspace Colaborativo (WebSocket)

O workspace é o módulo mais complexo do sistema:

1. **Servidor** (`server.js`): Servidor HTTP + WebSocket Server (`ws` library)
   - Mantém salas em memória (`Map<roomCode, { clients, doc, blocks, strokes, messages }>`)
   - Cada sala tem: título, blocos (até 500), traços de desenho (até 500), mensagens (até 200)
   - Salas são removidas quando o último cliente sai

2. **Cliente** (`workspace/app.js`): Classe `Workspace` com ~1632 linhas
   - **Board**: Canvas HTML5 para desenho livre + overlay de blocos DOM
   - **Ferramentas**: Desenho (D), Texto (T), Imagem (I)
   - **Blocos**: Arrastáveis com snap para grid, redimensionáveis, contentEditable para texto
   - **Desenho**: Strokes com cor e espessura, undo, clear
   - **Chat**: Integrado na sala via WebSocket
   - **Zoom/Pan**: Ctrl+scroll para zoom (0.1x–10x), Ctrl+arraste para mover
   - **Grid**: Grade de pontos ajustável (10–80px)
   - **Lightbox**: Visualização de imagens com zoom via scroll
   - **Reconexão**: Exponential backoff (até 5 tentativas)

3. **Protocolo WebSocket**: Mensagens JSON com campo `type`:
   - `create-room`, `join-room`, `room-created`, `room-joined`
   - `block-create`, `block-update`, `block-move`, `block-delete`, `blocks-sync`
   - `draw-stroke`, `draw-clear`, `draw-undo`, `draw-sync`
   - `send-message`, `new-message`, `doc-title`
   - `user-joined`, `error`

### 3.5 Autenticação (Supabase OAuth)

1. **Cliente Supabase** (`shared/supabase.js`): Singleton que cria o cliente com `persistSession: true` e `autoRefreshToken: true`
2. **Auth** (`shared/auth-supabase.js`): API compatível (`init`, `login`, `logout`, `isLoggedIn`, `getUser`, `onChange`, `renderButton`)
3. **Fluxo OAuth**:
   - Usuário clica "Entrar com Google"
   - Redireciona para Google OAuth → callback para Supabase → retorna ao app com hash `#access_token=...`
   - O módulo `auth-supabase.js` decodifica o JWT do hash, extrai perfil (nome, email, avatar), salva em localStorage
   - Corrige automaticamente URLs malformadas do Supabase
   - Reconecta sessão ao recarregar a página via `getSession()` + fallback manual

### 3.6 Mensagens em tempo real (Supabase Realtime)

1. **ChatStorage** (`shared/chat-storage-supabase.js`):
   - `sendMessage(recipientId, recipientName, content)` — Insere na tabela `direct_messages`
   - `getMessages(friendId, limit)` — Busca histórico entre dois usuários
   - `subscribe(friendId, callback)` — Inscreve em mudanças PostgreSQL (INSERT) filtradas

2. **ChatWidget** (`shared/chat-widget.js`):
   - Botão flutuante (canto inferior direito) + popup de chat
   - Mensagens otimistas (aparecem antes da confirmação do servidor)
   - Integração com Friends: ao clicar 💬 em um amigo, abre conversa direta

### 3.7 Sistema de amigos

1. **Friends** (`shared/friends.js`): Gerencia lista local de amigos + solicitações pendentes
2. **ProfilesSync** (`shared/profiles-sync.js`):
   - `syncMyProfile()` — Upsert do perfil na tabela `profiles` ao fazer login
   - `searchUsers(query)` — Busca usuários por nome/email para adicionar (exclui a si mesmo)
3. **Fluxo**: Adicionar → busca no Supabase → se encontrado, salva com UUID real → se não, salva como solicitação local

### 3.8 Tema (Light/Dark)

- `Theme` em `shared/theme.js`: alterna atributo `data-theme` no `<html>`
- Variáveis CSS respondem ao seletor `[data-theme="dark"]`
- Persistência da preferência em localStorage
- Botão com ícone sol/lua na navbar

---

## 4. Quais ferramentas e tecnologias utiliza?

### 4.1 Stack principal

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| **Linguagem** | HTML5 + CSS3 + JavaScript (Vanilla) | — | Zero frameworks de runtime |
| **Runtime** | Node.js | — | Servidor HTTP + WebSocket |
| **Servidor HTTP** | `node:http` (nativo) | — | Servir arquivos estáticos + API REST |
| **WebSocket** | `ws` | ^8.21.0 | Comunicação em tempo real no workspace |
| **Banco de dados** | PostgreSQL (via Supabase) | — | Persistência em nuvem |
| **Autenticação** | Supabase Auth + Google OAuth 2.0 | — | Login/logout com Google |
| **Realtime** | Supabase Realtime (PostgreSQL LISTEN/NOTIFY) | — | Mensagens diretas em tempo real |
| **Fontes** | Space Grotesk + Inter (Google Fonts) | — | Tipografia do design system |

### 4.2 Dependências npm

| Pacote | Versão | Uso |
|--------|--------|-----|
| `ws` | ^8.21.0 | WebSocket server |
| `@supabase/supabase-js` | ^2.107.0 | Cliente Supabase (carregado via CDN no front) |
| `vitest` | ^4.1.8 | Testes unitários |
| `@playwright/test` | ^1.60.0 | Testes end-to-end |

### 4.3 CDN (carregado no frontend)

| Recurso | URL |
|---------|-----|
| Supabase JS SDK v2 | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` |
| Google Fonts (Space Grotesk + Inter) | `https://fonts.googleapis.com/css2?...` |

### 4.4 Estrutura de diretórios

```
Commentarium/
├── server.js                     # Servidor HTTP + WebSocket (425 linhas)
├── package.json                  # Dependências e scripts
├── .env                          # Configuração Supabase
├── public/                       # Frontend estático
│   ├── index.html                # Homepage (219 linhas)
│   ├── homepage.js               # Inicialização dos módulos
│   ├── style.css                 # Estilos da homepage
│   ├── notes/                    # Página de notas
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   ├── tasks/                    # Página de tarefas
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   ├── taskboard/                # Quadro kanban
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   ├── workspace/                # Workspace colaborativo
│   │   ├── index.html            # (219 linhas)
│   │   ├── app.js                # Classe Workspace (1632 linhas)
│   │   └── style.css
│   ├── chat/                     # Chat local standalone
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   └── shared/                   # Módulos compartilhados
│       ├── base.css              # Design system (variáveis, componentes, reset)
│       ├── storage.js            # localStorage seguro (safeGet/safeSet/safeRemove)
│       ├── toast.js / toast.css  # Componente de notificação
│       ├── utils.js              # escapeHtml, formatDate, formatRelativeDate
│       ├── theme.js              # Alternância light/dark
│       ├── supabase.js           # Cliente Supabase singleton
│       ├── auth-supabase.js      # Autenticação via Supabase (461 linhas)
│       ├── auth.js               # Autenticação Google (Identity Services, legado)
│       ├── auth.css              # Estilos dos componentes de auth
│       ├── friends.js            # Gerenciamento de amigos (523 linhas)
│       ├── profiles-sync.js      # Sincronização de perfil no Supabase
│       ├── chat-widget.js        # Widget de chat flutuante (353 linhas)
│       ├── chat-storage-supabase.js  # Mensagens diretas (257 linhas)
│       ├── notes-storage-supabase.js # Notas com sync Supabase (162 linhas)
│       ├── notes-storage.js      # Notas apenas localStorage (legado)
│       ├── tasks-storage-supabase.js # Tarefas com sync Supabase (171 linhas)
│       └── tasks-storage.js      # Tarefas apenas localStorage (legado)
├── supabase/
│   └── migration.sql             # Schema do banco (183 linhas, 6 tabelas)
├── data/
│   └── workspaces.json           # Workspaces salvos (persistência do servidor)
├── tests/                        # Testes unitários (Vitest)
│   ├── storage.test.js           # (189 linhas)
│   ├── notes.test.js             # (231 linhas)
│   └── tasks.test.js             # (261 linhas)
├── e2e/                          # Testes end-to-end (Playwright)
│   ├── notes.spec.js
│   └── tasks.spec.js
├── docs/                         # Documentação
│   ├── visão.md                  # Visão do produto
│   ├── specs.md                  # Especificações técnicas (838 linhas)
│   ├── arquitetura.md            # Decisões arquiteturais
│   ├── roadmap.md                # Plano de evolução
│   └── resumo.md                 # Este documento
├── plans/
│   └── pontos-de-melhoria.md     # Plano de melhorias pendentes
└── RAILWAY_SETUP.md              # Guia de deploy no Railway
```

### 4.5 Banco de dados (Supabase PostgreSQL)

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `notes` | Notas dos usuários (title, content) | Usuário vê apenas suas |
| `tasks` | Tarefas (title, urgency, date, time, location, description, done) | Usuário vê apenas suas |
| `workspaces` | Salas colaborativas salvas (id, title, created_by) | Leitura pública; criação autenticada; update/delete só criador |
| `workspace_messages` | Histórico de chat do workspace | Leitura e inserção públicas |
| `direct_messages` | Mensagens diretas (sender_id, recipient_id, content) | Usuário vê mensagens onde é sender ou recipient |
| `profiles` | Perfis públicos (name, email, picture) | Leitura para qualquer autenticado; inserção/update só próprio |

---

## 5. Princípios de design

1. **KISS (Keep It Simple, Stupid)**: Vanilla JavaScript, sem frameworks, sem bundlers, sem build step
2. **Separação por camadas**: Data Layer, UI Layer e Controller Layer em cada módulo
3. **Offline-first**: localStorage como fonte primária, sincronização com nuvem em background
4. **Module Pattern (IIFE)**: Encapsulamento sem ES Modules, funciona direto do filesystem
5. **CSS modular**: Design system em `shared/base.css` + CSS específico por página
6. **Acessibilidade**: ARIA, focus-visible, reduced-motion, screen reader only
7. **Design brutalista**: Bordas grossas, tipografia bold, sombras sólidas, monocromático com acentos coloridos

---

> **Documento gerado em:** 03/07/2026
> **Propósito:** Fornecer uma visão completa e integrada do sistema Commentarium para referência rápida.
