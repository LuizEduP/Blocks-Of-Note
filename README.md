<p align="center">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
</p>

# Commentarium

> **Anotações inteligentes, tarefas organizadas e colaboração em tempo real — tudo em um só lugar.**

**Commentarium** é uma aplicação web full-stack de produtividade pessoal e colaboração. Combina notas, gerenciador de tarefas, workspace colaborativo com desenho livre e chat em tempo real — com autenticação Google, sincronização na nuvem via Supabase e design moderno com tema claro/escuro.

---

## ✨ Funcionalidades

### 📝 Notas
- CRUD completo com editor modal
- Grid de cards responsivo com busca por título e conteúdo
- Exportação de notas em JSON
- Sincronização automática com Supabase PostgreSQL

### ✅ Tarefas
- Quick-add com Enter, seletor de urgência inline (I–IV)
- Formulário expandido: data, hora, local, descrição
- Filtros: Todas / Hoje / Próximas / Concluídas
- Busca textual por título, descrição e local
- Filtro por nível de urgência
- Estatísticas em tempo real
- Sincronização automática com Supabase

### 🎨 Workspace Colaborativo
- Board infinito com zoom/pan (Ctrl+scroll, Ctrl+arraste)
- Blocos de texto arrastáveis com snap, redimensionáveis
- Blocos de imagem com lightbox e zoom
- Desenho livre (pincel com cor e espessura ajustáveis)
- Chat integrado na sala
- Código de 6 caracteres para compartilhar
- Salas efêmeras (WebSocket, sem persistir no banco)
- Workspaces salvos para reentrar depois
- Suporte a touch (mobile/tablet)

### 💬 Chat em Tempo Real
- Conversas diretas entre usuários logados
- Envio de imagens (até 2MB, inline)
- Notificações visuais no widget flutuante
- Sidebar de amigos na página dedicada
- Tempo real via Supabase Realtime (PostgreSQL LISTEN/NOTIFY)

### 👤 Perfil e Amigos
- Login com Google (OAuth 2.0 via Supabase)
- Avatar, nome e email no painel lateral
- Busca de usuários no Supabase para adicionar como amigo
- Solicitações pendentes (aceitar/recusar)
- Acesso rápido ao chat por amigo

### 🎨 Interface
- Tema claro/escuro com alternância e persistência
- Design brutalista moderno (Space Grotesk + Inter)
- Totalmente responsivo (desktop e mobile)
- Acessibilidade: `focus-visible`, `prefers-reduced-motion`, roles ARIA
- Notificações toast não-intrusivas

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | HTML5 + CSS3 + JavaScript (Vanilla, zero frameworks) |
| **Servidor** | Node.js (`node:http` nativo + `ws` para WebSocket) |
| **Banco de dados** | PostgreSQL via [Supabase](https://supabase.com) |
| **Autenticação** | Supabase Auth (Google OAuth 2.0) |
| **Tempo real** | Supabase Realtime + WebSocket (workspace) |
| **Fontes** | Space Grotesk + Inter (Google Fonts) |
| **Testes** | Vitest (unitários) + Playwright (E2E) |

---

## 🚀 Como rodar localmente

### Pré-requisitos
- [Node.js](https://nodejs.org) v18+
- Conta gratuita no [Supabase](https://supabase.com)

### 1. Clone o repositório

```bash
git clone https://github.com/LuizEduP/Commentarium.git
cd Commentarium
```

### 2. Configure o Supabase

1. Crie um projeto no Supabase
2. Vá no **SQL Editor** e execute o conteúdo de `supabase/migration.sql`
3. Vá em **Authentication** → **Providers** → habilite **Google** e configure seu Client ID/Secret
4. Copie a `URL` e a `anon key` do seu projeto (em Settings → API)

### 3. Configure as variáveis

Edite `public/shared/supabase.js`:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua_anon_key';
```

### 4. Habilite o Realtime

No **SQL Editor** do Supabase, execute:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
```

### 5. Instale e rode

```bash
npm install
npm start
```

Acesse **http://localhost:3000** 🚀

---

## 📁 Estrutura do Projeto

```
Commentarium/
├── server.js                         # Servidor HTTP + WebSocket
├── package.json
├── public/                           # Frontend estático
│   ├── index.html                    # Homepage
│   ├── shared/                       # Módulos compartilhados
│   │   ├── base.css                  # Design system (variáveis, componentes)
│   │   ├── storage.js                # localStorage seguro (safeGet/Set/Remove)
│   │   ├── supabase.js               # Cliente Supabase singleton
│   │   ├── auth-supabase.js          # Autenticação Google via Supabase
│   │   ├── auth.css                  # Estilos do login/dropdown
│   │   ├── toast.js / toast.css      # Sistema de notificações
│   │   ├── utils.js                  # escapeHtml, formatDate, etc.
│   │   ├── theme.js                  # Alternância claro/escuro
│   │   ├── friends.js                # Gerenciamento de amigos
│   │   ├── profiles-sync.js          # Sync de perfil com Supabase
│   │   ├── chat-widget.js            # Widget de chat flutuante
│   │   ├── chat-storage-supabase.js  # Mensagens + imagens via Supabase
│   │   ├── notes-storage-supabase.js # Notas com sync Supabase
│   │   └── tasks-storage-supabase.js # Tarefas com sync Supabase
│   ├── notes/                        # Página de notas
│   ├── tasks/                        # Página de tarefas (unificada com taskboard)
│   ├── workspace/                    # Workspace colaborativo (board + desenho + chat)
│   └── chat/                         # Página de chat com sidebar de amigos
├── supabase/
│   └── migration.sql                 # Schema do banco (6 tabelas + RLS)
├── tests/                            # Testes unitários (Vitest)
├── e2e/                              # Testes end-to-end (Playwright)
└── docs/                             # Documentação
    ├── visão.md                      # Visão do produto
    ├── specs.md                      # Especificações técnicas
    ├── arquitetura.md                # Decisões arquiteturais
    ├── roadmap.md                    # Plano de evolução
    └── resumo.md                     # Resumo completo do sistema
```

---

## 🧠 Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **KISS** | Vanilla JS, zero frameworks, sem build step |
| **Module Pattern** | Cada módulo em IIFE com Data/UI/Controller layers |
| **Offline-first** | localStorage como fonte primária, Supabase como sync |
| **Acessibilidade** | ARIA, keyboard nav, `prefers-reduced-motion` |
| **CSS modular** | Design system em `base.css` + estilos por página |
| **Brutalista** | Bordas grossas, tipografia bold, monocromático com acentos |

---

## 🚢 Deploy no Railway

1. Conecte o repositório no [Railway](https://railway.app)
2. Adicione a variável `PORT=3000`
3. O Railway detecta `npm start` automaticamente
4. Veja [RAILWAY_SETUP.md](RAILWAY_SETUP.md) para detalhes sobre OAuth redirect

---

## 📄 Licença

MIT — sinta-se livre para usar, modificar e contribuir.

---

<p align="center">
  <sub>Feito por <a href="https://github.com/LuizEduP">Luiz Eduardo</a></sub>
</p>
