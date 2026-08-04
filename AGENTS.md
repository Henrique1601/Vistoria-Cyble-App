# AGENTS.md - Vistoria Cyble App

## Visão Geral

PWA para celular que registra fotos da troca de Cyble em apartamentos, organizados por bloco. Funciona offline e sincroniza automaticamente.

## Stack

- **Framework:** Next.js 14.2.35 (App Router)
- **Linguagem:** TypeScript 5.5
- **UI:** React 18.3 + Framer Motion + Tailwind CSS
- **Armazenamento:** IndexedDB (local) + Vercel Blob (nuvem) + Neon PostgreSQL
- **Deploy:** Vercel (auto-deploy do GitHub)
- **Ícones:** @phosphor-icons/react
- **Drag-and-drop:** @dnd-kit/core + @dnd-kit/sortable
- **Exportação:** jspdf, xlsx, jszip
- **Virtualização:** @tanstack/react-virtual
- **Versão atual:** 3.5.0

## Estrutura de Diretórios

```
├── app/                    # Páginas e API routes
│   ├── page.tsx           # Componente principal (~2160 linhas)
│   ├── PinGate.tsx        # Autenticação dual (Admin/Viewer)
│   ├── SetupScreen.tsx    # Configuração inicial de blocos
│   ├── CapturaScreen.tsx  # Captura de fotos com GPS
│   └── api/               # API routes (9 endpoints)
├── lib/                    # Utilitários e lógica de negócio
│   ├── db.ts              # IndexedDB v3 via idb
│   ├── syncQueue.ts       # Fila de sincronização offline
│   ├── utils.ts           # normalizeBloco, normApto, etc.
│   ├── auth.ts            # Server-side PIN auth
│   ├── api.ts             # Client-side auth fetch
│   ├── settings.ts        # Configurações persistidas
│   ├── export/            # PDF, XLSX, CSV, ZIP, JSON, HTML
│   ├── autoBackup.ts      # Backup automático timer
│   └── notificationsPush.ts # Notificações browser
├── components/             # Componentes React reutilizáveis
├── public/                 # Assets estáticos e Service Worker
├── Troca-cyble/           # Documentação (Obsidian vault)
└── .opencode/             # Configuração do opencode
```

## Convenções de Código

- Usar TypeScript para todos os arquivos
- Seguir padrões existentes do projeto
- Preferir componentes funcionais com hooks
- Usar Tailwind CSS para estilos
- Ícones: @phosphor-icons/react
- Animações: Framer Motion
- Nunca usar `console.log` em produção (apenas `console.warn` em catches)
- Normalizar `bloco` com `normalizeBloco()` de `lib/utils.ts` ao comparar valores

## ⚠️ ATENÇÃO — Branch `cyble-trabalho`

**NUNCA deletar a branch `cyble-trabalho`.** Ela é uma referência histórica/backup do projeto e deve ser preservada permanentemente, mesmo que esteja desatualizada em relação à `main`.

## Comandos de Desenvolvimento

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção (verificar sempre antes de commitar)
npm run lint     # Verificar lint
npm run format   # Formatar código
```

## Fluxo de Trabalho

1. Entender o requisito
2. Verificar código existente (grep/glob/search primeiro)
3. Implementar seguindo convenções
4. Rodar `npm run build` para verificar erros de tipo
5. Verificar lint
6. **Atualizar documentação** (Obsidian vault + README.md — obrigatório antes de commitar)
7. Commitar com mensagem descritiva (conventional commits)
8. Push para GitHub (Vercel faz auto-deploy)

## ⚠️ CRÍTICO — Backup Antes de Qualquer Alteração

**ANTES de qualquer mudança no código (bug fix, feature, refactor, update de dependência), o agent DEVE:**

1. **Alertar o usuário** sobre a necessidade de backup
2. **Confirmar que o backup foi feito** antes de prosseguir
3. **Registrar quais apartamentos já foram vistoriados** (via IndexedDB local)

### Por quê?
- O app está **em uso em campo** — dados reais de vistorias estão no IndexedDB do celular
- Fotos e status de apartamentos podem ser perdidos se o deploy quebrar algo
- O progresso de cada apartamento (Cyble Antes/Depois/Documento) é local

### O que perguntar ao usuário antes de mudanças:
```
⚠️ ATENÇÃO: App em uso em campo!

Antes de prosseguir com esta alteração, confirme:

1. Você já fez backup dos dados? (Configurações > Backup completo)
2. Quais apartamentos já foram vistoriados? (para verificar após deploy)
3. Tem fotos pendentes de sincronização? (verificar indicador "pendentes")

Confirma que posso prosseguir com a alteração?
```

### Após o deploy:
- Verificar com o usuário se tudo continua funcionando
- Confirmar que os dados antigos ainda estão presentes
- Se houver perda de dados, orientar a restaurar do backup

## ⚠️ OBRIGATÓRIO — Sincronização de Documentação

**TODA alteração no código DEVE ser acompanhada de atualização no Obsidian vault e no README.md.**

### Regras de Sincronização

| Alteração no código | Obsidian (`Troca-cyble/`) | README.md |
|---------------------|---------------------------|-----------|
| Nova funcionalidade | `00-Visão Geral.md` (feature list) + `10-Changelog.md` + `09-Roadmap.md` | Seção "Funcionalidades" |
| Alteração de stack/dependência | `00-Visão Geral.md` (Stack) | Seção "Stack" |
| Novo componente | `02-Estrutura de Arquivos.md` + `07-Estilo e Design.md` | — |
| Alteração no banco de dados | `03-Banco de Dados Local.md` | — |
| Nova API route | `04-API Routes.md` | — |
| Alteração de deploy/config | `05-Deploy e Configuração.md` | Seção "Deploy" |
| Bug fix | `10-Changelog.md` | — |
| Nova versão | `00-Visão Geral.md` + `10-Changelog.md` | `package.json` + README |
| Componente novo | `02-Estrutura.md` + `07-Estilo.md` | — |
| Atalho/UX | `07-Estilo e Design.md` | — |

### Checklist Pré-Commit

- [ ] Código buildou sem erros (`npm run build`)
- [ ] Obsidian vault atualizado (arquivos relevantes)
- [ ] README.md atualizado (se aplicável)
- [ ] `10-Changelog.md` tem entrada para a mudança
- [ ] `APP_VERSION` em `lib/version.ts` e `sw.js` atualizado (se nova versão)
- [ ] `package.json` version atualizado (se nova versão)
- [ ] Commit com mensagem descritiva (conventional commits)

## Sistema de PIN

- **`ADMIN_PIN`** — Acesso total: editar, excluir, selecionar múltiplas, agendar, configurar
- **`VIEWER_PIN`** — Apenas visualizar fotos, sem editar nem excluir (read-only)
- **`APP_PIN`** — Legado, funciona como admin para compatibilidade

## Skills Relevantes para Este Projeto

### Frontend/React/Next.js
- **vercel-react-best-practices** — Otimização React/Next.js (regras de performance)
- **react-patterns** — Padrões React 18/19, hooks, server/client components
- **react-performance** — Otimização de performance React
- **next-best-practices** — Convenções App Router, RSC, data fetching
- **frontend-patterns** — Padrões gerais de frontend
- **frontend-a11y** — Acessibilidade React/Next.js
- **motion-foundations** — Framer Motion tokens e performance
- **motion-patterns** — Animações React (button, modal, toast, stagger)
- **make-interfaces-feel-better** — Detalhes de UI polish

### TypeScript/Code Quality
- **coding-standards** — Convenções de código cross-project
- **error-handling** — Padrões de error handling TypeScript
- **refactor** — Refatoração cirúrgica sem mudar comportamento

### Testing
- **tdd** — Test-driven development
- **tdd-workflow** — Workflow TDD com 80%+ coverage
- **react-testing** — Testes com React Testing Library + Vitest/Jest

### Security
- **security-review** — Checklist de segurança (auth, input handling, secrets)
- **security-bounty-hunter** — Caça a vulnerabilities

### Deployment/DevOps
- **deploy-to-vercel** — Deploy na Vercel
- **deployment-patterns** — CI/CD, Docker, health checks

### Documentation
- **code-tour** — CodeTour para onboarding
- **architecture-decision-records** — ADRs para decisões

### Database
- **postgres-patterns** — Padrões PostgreSQL (Neon)
- **prisma-patterns** — Se migrar para Prisma

### Debugging
- **click-path-audit** — Auditoria de fluxo de cliques/gestos
- **production-audit** — Auditoria de readiness para produção
- **verification-loop** — Sistema de verificação completo

### Design/UI
- **ui-ux-pro-max** — Design intelligence com 50+ estilos
- **design-taste-frontend** — Engenharia de UI de alto nível
- **redesign-existing-projects** — Upgrade de projetos existentes

### Git/Workflow
- **git-commit** — Commits convencionais
- **git-workflow** — Branching strategies, merge vs rebase
- **github-ops** — Operações GitHub (issues, PRs, releases)

### Performance
- **performance** — Otimização web performance
- **lighthouse** — Auditoria Lighthouse CLI

### Research
- **search-first** — Pesquisar antes de codificar
- **context7-mcp** — Docs atualizadas de bibliotecas via Context7
- **deep-research** — Pesquisa profunda multi-fonte

### Agent/Workflow
- **blueprint** — Planos passo-a-passo para projetos complexos
- **orch-fix-defect** — Orquestração para correção de bugs
- **orch-add-feature** — Orquestração para novas features
- **orch-refine-code** — Orquestração para refatoração
- **parallel-execution-optimizer** — Execução paralela de tarefas
- **plan-orchestrate** — Decompor planos em cadeias de agentes

### Context/Memory
- **ck** — Memória persistente por projeto
- **strategic-compact** — Compactação estratégica de contexto
- **context-budget** — Auditoria de consumo de tokens

## MCPs Disponíveis

### context7
Busca documentação atualizada de bibliotecas e frameworks.
- **Uso:** Quando precisar de API reference, setup, ou exemplos de código de qualquer lib
- **Exemplo:** "Como usar `@vercel/blob` no Next.js?" → `resolve-library-id` + `query-docs`
- **Sempre usar** antes de implementar código que depende de uma biblioteca

### deepwiki
Documentação AI-powered de repositórios GitHub.
- **Uso:** Para entender a estrutura de repos públicos ou verificar padrões
- **Exemplo:** `read_wiki_contents` do repo `vercel/next.js` para padrões de deploy

### pencil
Editor de design .pen (web/mobile apps).
- **Uso:** Para criar ou ler designs de interface (se necessário)
- **Uso comum:** Raro neste projeto (PWA focused), mas disponível para wireframes

## Configuração do Modelo

- **Modelo:** opencode/mimo-v2.5-free (gratuito)
- **Configuração:** opencode.json
