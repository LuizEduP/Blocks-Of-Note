# Visão do Produto — Blocks-Of-Note

> **Propósito:** Descrever o produto, seu público-alvo e funcionalidades — sem detalhes técnicos.
> **Documentos relacionados:** [`docs/arquitetura.md`](arquitetura.md), [`docs/roadmap.md`](roadmap.md)

---

## 🧠 O que o sistema faz

O **Blocks-Of-Note** é uma aplicação web front-end de **anotações e cadastro de tarefas** com uma interface tridimensional interativa. O conceito central é a **metáfora do cubo 3D** como elemento de navegação e representação visual de dados.

### Funcionalidades principais

| Funcionalidade | Descrição |
|---|---|
| **Menu 3D interativo** | Cubo central que ao ser clicado revela dois cubos laterais com links para as páginas de Notas e Tarefas |
| **CRUD de Notas** | Criação, visualização, edição e exclusão de notas — cada nota é representada como um mini cubo em órbita |
| **Editor Notion-style** | Modal de edição com título, data de criação, texto livre, e botões de salvar/descartar |
| **Cadastro de Tarefas** | Formulário com título, data, hora, local, descrição e grau de urgência |
| **Indicador visual de urgência** | Cubo 3D que muda de cor conforme o nível de urgência selecionado (I a IV) |
| **Task Board** | Visualização em cards de todas as tarefas cadastradas, com filtros por urgência e busca textual |
| **Persistência offline** | Dados salvos no navegador — funcionam mesmo sem internet |
| **Animação de introdução** | Overlay de apresentação com fade in/out do texto "BLOCKS F NOTES" |
| **Exportação de dados** | Download de notas e tarefas em formato JSON para backup |
| **Busca de notas** | Campo de busca que filtra notas em tempo real pelo título |
| **Toast de feedback** | Notificações visuais não-intrusivas para confirmar ações do usuário |

---

## 👥 Público-alvo

- **Usuários individuais** que preferem ferramentas visuais e criativas para organizar notas e tarefas
- **Entusiastas de design** que apreciam interfaces diferenciadas com elementos 3D
- **Profissionais** que precisam de um bloco de notas rápido e offline, sem cadastro ou configuração
- **Estudantes** que querem uma ferramenta simples para anotações e lembretes

---

## 🎨 Diferenciais

1. **Interface 3D criativa** — A navegação por cubos 3D substitui menus tradicionais, tornando a experiência mais lúdica e marcante
2. **Zero configuração** — Abre no navegador e funciona imediatamente, sem instalação ou cadastro
3. **Offline-first** — Todos os dados ficam salvos localmente, funcionando sem internet
4. **Design autoral** — Estilo brutalista com tipografia bold e monocromática, identidade visual única
5. **Leve e rápido** — Sem dependências externas, carregamento instantâneo

---

## 📋 Funcionalidades por página

### Homepage (`index.html`)

- Tela inicial com overlay de introdução animado ("BLOCKS F NOTES")
- Cubo central 3D que gira continuamente
- Ao clicar no cubo, dois cubos laterais deslizam com os rótulos **"NOTAS"** e **"TAREFAS"**
- Clique fora do menu o fecha

### Página de Notas (`paginanot.html`)

- Cubo central que revela botões **CREATE** e **REMOVE** ao ser clicado
- CREATE: gera um mini cubo em órbita representando a nova nota
- Clique no mini cubo: abre modal de edição (título + conteúdo) estilo Notion
- REMOVE: ativa modo de exclusão com feedback visual (bordas vermelhas, shake nos mini cubos)
- Campo de busca que filtra notas em tempo real
- Botão de exportação para download JSON
- Toast de feedback para criar, salvar e excluir notas

### Página de Tarefas (`paginatask.html`)

- Formulário completo: título, data, hora, local, descrição
- Seletor de urgência com 4 níveis (I a IV)
- Cubo 3D que muda de cor conforme a urgência selecionada
- Validação de campos obrigatórios
- Toast de feedback ao salvar

### Task Board (`taskboard/taskboard.html`)

- Lista todas as tarefas em formato de cards
- Filtro por nível de urgência
- Busca textual por título/local/descrição
- Exclusão de tarefas com confirmação
- Estatísticas: total de tarefas, contagem por urgência

---

## 📐 Fluxos do usuário

### Fluxo: Criar uma nota

```
Home → clicar cubo → NOTAS → clicar cubo central → CREATE
→ mini cubo aparece em órbita → clicar mini cubo → editar → salvar
```

### Fluxo: Gerenciar tarefas

```
Home → clicar cubo → TAREFAS → preencher formulário → salvar
→ VER TAREFAS → Task Board → visualizar/filtrar/excluir
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
- ❌ Suporte a dispositivos móveis (em desenvolvimento)

---

> **Documento gerado em:** 21/05/2026  
> **Propósito:** Definir a visão do produto Blocks-Of-Note do ponto de vista do usuário e do negócio.
