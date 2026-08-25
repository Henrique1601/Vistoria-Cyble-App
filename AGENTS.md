# AGENTS.md — Vistoria Cyble App

> **Manual de Instruções, Governança, Arquitetura e Diretrizes para Agentes de IA**  
> **Versão do App:** 3.5.0 | **Framework:** Next.js 14.2.35 (App Router) | **Linguagem:** TypeScript 5.5

---

## 1. Visão Geral do Projeto

O **Vistoria Cyble App** é um **Progressive Web App (PWA) de alta resiliência *offline-first*** desenvolvido para técnicos e operadores em campo registrarem a substituição e vistoria de hidrômetros/módulos Cyble em grandes condomínios verticais (organizados por torres A–H e apartamentos).

### Objetivos Principais
- **Operação 100% Offline:** Funcionamento ininterrupto em subsolos, poços de hidrômetro e garagens sem conectividade, com armazenamento local no IndexedDB e sincronização automática em segundo plano quando a internet for restabelecida.
- **Auditoria Visual & Metadados:** Registro categorizado de fotos (*Cyble Antes*, *Cyble Depois*, *Documento*), detecção de nitidez/brilho, coordenadas GPS, marca d'água automática e anotações sobre as imagens.
- **Relatórios & Exportação:** Emissão de laudos em PDF formatados (com miniaturas embutidas), planilhas XLSX, CSV, arquivos compactados ZIP com estrutura de pastas e links públicos HTML.

---

## 2. Stack Tecnológica & Dependências

- **Framework Web:** Next.js 14.2.35 (App Router, Serverless Functions em Node.js runtime)
- **Linguagem:** TypeScript 5.5 (modo estrito)
- **Interface & Estilização:** React 18.3 + Tailwind CSS 3.4 + Framer Motion 12
- **Tipografia:** Geist Sans / Geist Mono (`geist`)
- **Ícones:** `@phosphor-icons/react` 2.1
- **Banco de Dados Local (Cliente):** IndexedDB v4 via biblioteca `idb` 8.0
- **Banco de Dados Remoto (Nuvem):** Neon Serverless PostgreSQL via `@neondatabase/serverless` 1.1
- **Armazenamento de Arquivos:** `@vercel/blob` 0.27
- **Virtualização & Drag-and-Drop:** `@tanstack/react-virtual` 3.14 + `@dnd-kit/core` 6.3 + `@dnd-kit/sortable` 10.0
- **Exportações:** `jspdf` 4.2 + `jspdf-autotable` 5.0 + `xlsx` (SheetJS) 0.18 + `jszip` 3.10
- **Monitoramento & Erros:** `@sentry/nextjs` 10.68
- **Testes:** Vitest 4.1 + React Testing Library + JSDOM
- **Hospedagem & CI/CD:** Vercel (Auto-deploy integrado ao GitHub)

---

## 3. Estrutura Completa de Diretórios

```
├── app/                           # Camada de apresentação e rotas de backend (App Router)
│   ├── page.tsx                  # Componente principal do dashboard, controle de views e orquestração
│   ├── PinGate.tsx               # Portão de autenticação dual (Admin / Viewer) com cache offline
│   ├── SetupScreen.tsx           # Cadastro e importação inicial de torres e apartamentos (TXT/CSV/XLSX/Nuvem)
│   ├── CapturaScreen.tsx         # Interface de câmera, captura contínua, GPS, OCR/blur e anotações
│   ├── layout.tsx                # Shell raiz, fonts, ThemeProvider, ToastProvider e registro de PWA
│   ├── globals.css               # Estilos base, temas (Dark/Light/Alto Contraste), glassmorphism e animações
│   ├── sw-register.tsx           # Registrador de Service Worker no cliente
│   ├── global-error.tsx          # Error boundary global com tema independente
│   ├── error.tsx & not-found.tsx # Tratamento de erros e 404
│   ├── configuracoes/            # Painel de preferências do sistema
│   ├── galeria/                  # Galeria online de fotos sincronizadas
│   └── api/                      # Serverless API Routes (Node.js runtime)
│       ├── status/               # GET (status em tempo real), POST (validação PIN), DELETE (desmarcar)
│       ├── upload/               # POST de fotos para Vercel Blob + insert de metadados no Neon
│       ├── fotos/                # GET, DELETE, PATCH de fotos e sub-rota bulk-delete
│       ├── concluidos/           # GET/POST de apartamentos marcados como concluídos
│       ├── building-config/      # GET/POST de configurações estruturais dos prédios/torres
│       ├── agendamentos/         # CRUD de vistorias agendadas
│       ├── backup/               # POST de backup compactado para Vercel Blob
│       ├── share-report/         # POST de relatório HTML com geração de link temporário (7 dias)
│       └── version/              # GET da versão atual para auto-update do Service Worker
├── lib/                           # Núcleo de lógica de negócios, banco e utilitários
│   ├── db.ts                     # Camada completa de abstração do IndexedDB v4 (fotos, config, logs)
│   ├── syncQueue.ts              # Fila de sincronização com retry e backoff exponencial (1s a 30s)
│   ├── auth.ts                   # Autenticação server-side com timingSafeEqual (Admin / Viewer)
│   ├── api.ts                    # Wrapper client-side com injeção automática de cabeçalhos x-app-pin
│   ├── utils.ts                  # normalizeBloco, normApto, formatadores de data e helpers
│   ├── sql.ts                    # Conexão e constantes do Neon PostgreSQL
│   ├── settings.ts               # Armazenamento e leitura de preferências em localStorage
│   ├── rateLimit.ts              # Rate limiting em memória com 4 tiers de proteção
│   ├── validation.ts             # Sanitização e validação de inputs via regex
│   ├── blurDetect.ts             # Algoritmo laplaciano de nitidez e brilho para fotos
│   ├── drawing.ts                # Motor de desenho em canvas para o editor de anotações
│   ├── scanPro.ts                # Feedback sonoro (Web Audio API) e tátil para modo escaneamento
│   ├── haptic.ts                 # Padrões de vibração tátil (Haptic API)
│   ├── autoBackup.ts             # Timer configurável de backup periódico em background
│   ├── backup.ts                 # Rotinas de backup manual/automático e restauração
│   ├── googleCalendar.ts         # Integração de agendamentos com Google Calendar (.ics e links)
│   ├── googleDrive.ts            # Integração OAuth2 para backup direto no Google Drive
│   ├── notifications.ts          # Sistema pub/sub de notificações internas
│   ├── notificationsPush.ts      # Notificações Push do navegador
│   ├── version.ts                # Constante da versão atual da aplicação (3.5.0)
│   └── export/                   # Motores de exportação modularizados
│       ├── index.ts              # Barrel export dos geradores
│       ├── pdf.ts                # Relatórios técnicos em PDF com gráficos e fotos embutidas
│       ├── xlsx.ts               # Exportação analítica em planilhas Excel
│       ├── csv.ts                # Exportação em valores separados por vírgula
│       ├── zip.ts                # Compactador de fotos organizadas por diretórios
│       ├── json.ts               # Backup estruturado do banco de dados
│       ├── html.ts               # Relatório HTML autônomo com miniaturas base64
│       ├── agendaPdf.ts          # Emissão da pauta de agendamentos em PDF
│       └── utils.ts              # Carregamento de imagens e compartilhamento via Web Share API
├── components/                    # Componentes React modulares e reutilizáveis
│   ├── BottomNav.tsx             # Barra de navegação inferior com suporte a gestos e alvos táteis de 44px
│   ├── SearchBar.tsx             # Campo de busca instantânea com status dots e atalhos
│   ├── BlocosGrid.tsx            # Grid de seleção de torres com ProgressRing de avanço
│   ├── AptoCard.tsx              # Card interativo do apartamento com swipe, double-tap e tags
│   ├── ProgressToast.tsx         # Barra de progresso animada com shimmer para uploads
│   ├── PhotoEditor.tsx           # Editor visual de anotações sobre a foto (setas, textos, formas)
│   ├── AgendaScreen.tsx          # Gestão de agendamentos com filtros temporais
│   ├── AuditLogScreen.tsx        # Visualizador de trilha de auditoria
│   ├── StatusScreen.tsx          # Diagnóstico de latência de API, banco, storage e status de torres
│   ├── SyncQueueScreen.tsx       # Monitor da fila de upload com retry manual e cancelamento
│   ├── ExportSection.tsx         # Painel de exportação multiformato
│   ├── NotificationCenter.tsx    # Sino de notificações com badge animado
│   ├── OnboardingTour.tsx        # Tour guiado interativo para novos operadores
│   ├── ProgressHeatmap.tsx       # Mapa térmico visual de conclusão do condomínio
│   ├── ImportarFotosModal.tsx    # Modal de importação em lote de pastas locais
│   └── [Demais componentes...]   # Modais de comentários, confirmação, filtros e animações
├── public/                        # Assets estáticos, ícones e Service Worker
│   ├── sw.js                     # Service Worker v6 (Stale-while-revalidate, sync, push e fallback offline)
│   ├── manifest.json             # Manifesto PWA com atalhos e cores do tema
│   └── icons/                    # Ícones de aplicação em múltiplas resoluções
├── Troca-cyble/                   # Documentação viva do projeto (Obsidian Vault)
│   ├── 00 - Visão Geral.md
│   ├── 01 - Arquitetura.md
│   ├── 02 - Estrutura de Arquivos.md
│   ├── 03 - Banco de Dados Local.md
│   ├── 04 - API Routes.md
│   ├── 05 - Deploy e Configuração.md
│   ├── 06 - Fluxo de Sincronização.md
│   ├── 07 - Estilo e Design.md
│   ├── 08 - Checklist de Manutenção.md
│   ├── 09 - Roadmap de Funcionalidades.md
│   └── 10 - Changelog.md
└── package.json                   # Dependências e scripts de desenvolvimento
```

---

## 4. Configurações de Ambiente & Segurança

Todas as variáveis devem ser configuradas no arquivo `.env.local` para desenvolvimento e no painel da **Vercel** para produção:

| Variável | Obrigatória | Descrição |
| :--- | :---: | :--- |
| `ADMIN_PIN` | **Sim** | PIN de acesso com permissão total (mutações, fotos, exclusões, agendamentos e configurações) |
| `VIEWER_PIN` | **Sim** | PIN de acesso em modo leitura (*Read-Only*, consultas e visualização de fotos) |
| `APP_PIN` | Não | PIN legado (reconhecido como Admin para retrocompatibilidade) |
| `DATABASE_URL` | **Sim** | Connection String do Neon Serverless PostgreSQL (`postgres://...`) |
| `BLOB_READ_WRITE_TOKEN` | **Sim** | Token de leitura e escrita do Vercel Blob Storage |
| `BLOB_STORE_ID` | Não | Identificador único do Blob Store |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Não | Chave pública para validação de webhooks do Blob Storage |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Não | Client ID para autenticação OAuth2 do Google Drive Backup |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Não | Configurações de telemetria de erros no Sentry |

### Políticas de Segurança Implementadas
1. **Timing-Safe Auth:** Comparação de PINs com `crypto.timingSafeEqual` via [lib/auth.ts](file:///c:/Users/Public/Downloads/Vistoria-Cyble-App/lib/auth.ts) prevenindo ataques de análise temporal.
2. **Rate Limiting em 4 Camadas ([lib/rateLimit.ts](file:///c:/Users/Public/Downloads/Vistoria-Cyble-App/lib/rateLimit.ts)):**
   - *Auth Tier:* 10 requisições / minuto
   - *Upload Tier:* 30 requisições / minuto
   - *Write Tier:* 40 requisições / minuto
   - *Read Tier:* 120 requisições / minuto
3. **Content Security Policy (CSP):** Cabeçalhos estritos configurados no [next.config.mjs](file:///c:/Users/Public/Downloads/Vistoria-Cyble-App/next.config.mjs) limitando fontes de conexões, mídias e frames.
4. **Limites de Payload:** 15 MB para imagens, 50 MB para arquivos de backup e 10 MB para relatórios.

---

## 5. Deploy & Integração Contínua (CI/CD)

- **Plataforma de Deploy:** Vercel
- **Gatilho de CI/CD:** Auto-deploy acionado a cada `push` na branch `main` do GitHub.
- **Comando de Build:** `npm run build`
- **Ambiente de Execução:** Node.js Serverless Functions (`export const runtime = 'nodejs'` em rotas de API que utilizam processamento de imagens e Blob).
- **Service Worker Auto-Update:** O Service Worker consulta o endpoint `/api/version` e avisa o usuário através de soft refresh sem interromper o trabalho em andamento.

---

## 6. Políticas de Git & Controle de Versão

### ⚠️ REGRA INVIOLÁVEL — Preservação da Branch `cyble-trabalho`
**A branch `cyble-trabalho` NUNCA DEVE SER DELETADA sob nenhuma circunstância.** Ela constitui a referência histórica original e o backup permanente do projeto.

### Padrão de Mensagens de Commit (Conventional Commits)
Utilizar a skill `caveman-commit` para estruturar mensagens enxutas e sem ruído:
- `feat: <descrição curta>` — Nova funcionalidade
- `fix: <descrição curta>` — Correção de bug
- `refactor: <descrição curta>` — Refatoração sem alteração de comportamento
- `perf: <descrição curta>` — Melhoria de desempenho
- `docs: <descrição curta>` — Alteração de documentação (Obsidian/README)
- `test: <descrição curta>` — Adição ou ajuste de testes

---

## 7. ⚠️ PROTOCOLO CRÍTICO DE CAMPO: Backup Antes de Alterações

> [!CAUTION]
> **APLICAÇÃO EM USO ATIVO EM CAMPO!**  
> Os dados reais de vistorias residem no IndexedDB dos celulares dos técnicos. Qualquer alteração ou deploy incorreto pode apagar vistorias não sincronizadas.

**ANTES de qualquer modificação de código (bug fix, feature, refatoração, atualização de pacotes), o agente DEVE:**
1. Alertar o usuário sobre a necessidade imediata de backup.
2. Confirmar se o backup manual foi gerado (`Configurações > Backup completo`).
3. Verificar se há fotos pendentes de sincronização no contador de pendências.

**Mensagem padrão obrigatória a ser enviada ao usuário antes de alterar arquivos:**
```
⚠️ ATENÇÃO: O app está em uso real em campo!

Antes de prosseguirmos com esta alteração no código, confirme:
1. Foi realizado o backup completo dos dados? (Configurações > Backup completo)
2. Existem fotos pendentes de envio? (Verifique se o contador de pendências está zerado)
3. Quais apartamentos/torres já foram vistoriados hoje?

Podemos prosseguir com segurança?
```

---

## 8. ⚠️ PROTOCOLO OBRIGATÓRIO: Sincronização de Documentação

> [!IMPORTANT]
> **Toda e qualquer alteração de código DEVE ser acompanhada da atualização correspondente no Vault Obsidian (`Troca-cyble/`) e no `README.md`.**

### Tabela de Sincronização

| Natureza da Alteração | Obsidian (`Troca-cyble/`) | `README.md` |
| :--- | :--- | :--- |
| **Nova Funcionalidade** | `00 - Visão Geral.md` + `09 - Roadmap de Funcionalidades.md` + `10 - Changelog.md` | Seção "Funcionalidades" |
| **Alteração de Stack/Dep** | `00 - Visão Geral.md` (Stack) + `10 - Changelog.md` | Seção "Stack" |
| **Novo Componente / UI** | `02 - Estrutura de Arquivos.md` + `07 - Estilo e Design.md` | — |
| **Alteração de Banco/Schema**| `03 - Banco de Dados Local.md` | — |
| **Nova Rota de API** | `04 - API Routes.md` | — |
| **Ajustes de Deploy/Ambiente**| `05 - Deploy e Configuração.md` | Seção "Deploy" |
| **Correção de Bug (Bugfix)** | `10 - Changelog.md` | — |
| **Incremento de Versão** | `00 - Visão Geral.md` + `10 - Changelog.md` + `lib/version.ts` + `sw.js` | `package.json` + `README.md` |

### Checklist Pré-Commit
- [ ] `npm run build` validado sem erros de tipagem/compilação
- [ ] `npm run lint` validado
- [ ] Arquivos do Obsidian vault atualizados
- [ ] `README.md` sincronizado
- [ ] `10 - Changelog.md` registrado com a nova entrada
- [ ] `APP_VERSION` em `lib/version.ts`, `public/sw.js` e `package.json` atualizados (se nova versão)
- [ ] Commit formatado segundo o padrão *Conventional Commits*

---

## 9. Mapeamento de Skills do Projeto

Abaixo estão as **skills especializadas disponíveis** que o agente deve acionar para cada tipo de tarefa:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Mapeamento de Skills Especializadas                  │
├──────────────────────────────────┬─────────────────────────────────────┤
│   Performance & Frontend React   │       Bancos de Dados & Cloud       │
│  - vercel-react-best-practices   │  - neon-postgres (SQL, pooling)     │
│  - vercel-composition-patterns   │  - supabase                         │
│  - modern-web-guidance           │                                     │
│  - memory-leak-debugging         │                                     │
│  - debug-optimize-lcp            │                                     │
├──────────────────────────────────┼─────────────────────────────────────┤
│   Arquitetura & Refatoração      │     Documentação & Conhecimento     │
│  - improve-codebase-architecture │  - obsidian-vault                   │
│  - architecture (ADRs)           │  - documentation                    │
│  - code-review                   │  - doc-coauthoring                  │
│  - debug                         │  - write-spec                       │
│  - deploy-checklist              │                                     │
├──────────────────────────────────┼─────────────────────────────────────┤
│        Testes & Qualidade        │       Documentos & Relatórios       │
│  - tdd / tdd-workflow            │  - pdf & view-pdf                   │
│  - webapp-testing                │  - xlsx                             │
│  - react-testing                 │  - docx & pptx                      │
├──────────────────────────────────┼─────────────────────────────────────┤
│    Comunicação & Convenções      │      Investigação & Pesquisa        │
│  - caveman-commit                │  - grill-me / grill-with-docs       │
│  - ux-copy                       │  - triage                           │
│  - brand-review                  │  - context7-cli / find-docs         │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 10. MCPs (Model Context Protocol) Habilitados

- **`context7`:** Utilizado para consultar documentação e referências oficiais de bibliotecas (`@vercel/blob`, `@neondatabase/serverless`, `idb`, `jspdf`, `xlsx`).
- **`deepwiki`:** Consulta técnica contextual de repositórios do GitHub.
- **`pencil`:** Editor visual de wireframes e protótipos de design `.pen`.

---

## 11. Oportunidades & Roadmap de Melhorias Técnicas

Com base na auditoria arquitetural, as seguintes melhorias técnicas estão mapeadas para execução:

1. **Modularização de `app/page.tsx` (Alta Prioridade):**  
   Desacoplar o componente monolítico de ~2.400 linhas em hooks dedicados (`useVistoriaState`, `useVistoriaSync`, `useAutoBackup`, `useApartamentosFilter`) usando a skill `vercel-composition-patterns`.
2. **Unificação dos Motores de Sincronização:**  
   Centralizar o upload legado de `page.tsx` inteiramente dentro do pipeline com retry e backoff de `lib/syncQueue.ts`.
3. **Controle de Lanterna (*Torch*) na Câmera:**  
   Adicionar botão de acionamento do flash via `MediaTrackConstraints` em `CapturaScreen.tsx` para iluminação de caixas de hidrômetros escuras.
4. **Compressão de Imagens em Web Worker:**  
   Mover `comprimirImagem()` e `detectBlur()` para uma thread secundária de Web Worker, mantendo a interface a 60 FPS lisos durante disparos contínuos.
5. **Assinatura Digital no Documento:**  
   Implementar captura de assinatura digital na tela com geração automática de termo de vistoria em PDF assinado.
6. **Sincronização Bidirecional Multi-Técnico:**  
   Mecanismo de pull incremental do Neon PostgreSQL para manter a visualização de conclusão sincronizada entre múltiplos aparelhos na mesma obra.
7. **Suíte de Testes Automatizados:**  
   Implementação de testes unitários e de integração com Vitest e Playwright cobrindo os fluxos offline e de exportação via skills `tdd` e `webapp-testing`.
