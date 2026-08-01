# Estrutura de Arquivos

```
vistoria-cyble-app/
├── app/
│   ├── layout.tsx              # Layout raiz (fonts, metadata, SW register, providers)
│   ├── page.tsx                # Home — gerencia estado e navegação (~2296 linhas)
│   ├── globals.css             # Estilos globais (dark/light themes, CSS vars, shimmer)
│   ├── global-error.tsx        # Error boundary global (tema hardcoded, retry buttons)
│   ├── error.tsx               # Error boundary de rota
│   ├── not-found.tsx           # Página 404
│   ├── PinGate.tsx             # Tela de autenticação por PIN dual (Admin/Viewer)
│   ├── SetupScreen.tsx         # Cadastro de blocos (Manual/Importar/Nuvem)
│   ├── CapturaScreen.tsx       # Interface de captura de fotos (~730 linhas)
│   ├── sw-register.tsx         # Registro do Service Worker
│   ├── galeria/
│   │   ├── page.tsx            # Rota /galeria
│   │   └── GaleriaClient.tsx   # Visualização de fotos online (~897 linhas)
│   ├── configuracoes/
│   │   └── ConfiguracoesClient.tsx  # Tela de configurações (~767 linhas)
│   └── api/
│       ├── status/route.ts     # GET/POST — status de conclusão + validação PIN
│       ├── upload/route.ts     # POST — upload de foto (admin only)
│       ├── fotos/route.ts      # GET/DELETE/PATCH — CRUD de fotos
│       ├── fotos/bulk-delete/route.ts  # POST — exclusão em lote
│       ├── concluidos/route.ts  # GET/POST — status de conclusão
│       ├── building-config/route.ts  # GET/POST — config de prédios
│       ├── agendamentos/route.ts  # GET/POST/PUT/DELETE — agendamentos
│       ├── backup/route.ts     # POST/GET/DELETE — backup para Blob
│       ├── share-report/route.ts  # POST — relatório público
│       └── version/route.ts    # GET — versão do app
├── components/
│   ├── BottomNav.tsx           # Navegação inferior (6 abas, glassmorphism)
│   ├── Toast.tsx               # Sistema de toasts (success/error/info/warning)
│   ├── ProgressToast.tsx       # Toast premium com progress bar e shimmer
│   ├── SearchBar.tsx           # Busca global com status dots
│   ├── FotosRecentes.tsx       # Fotos capturadas recentemente
│   ├── AtrasadosSection.tsx   # Seção de apartamentos atrasados
│   ├── BlocosGrid.tsx          # Grid de torres com ProgressRing
│   ├── ProgressRing.tsx        # Anel de progresso SVG circular
│   ├── ExportSection.tsx       # Seção de exportação (lazy loaded)
│   ├── TowerReportPanel.tsx    # Painel lateral de relatório por torre
│   ├── TowerComparison.tsx     # Comparativo lado a lado entre torres
│   ├── PeriodReport.tsx        # Relatório por período com filtros
│   ├── SyncQueueScreen.tsx     # Fila de sincronização com retry
│   ├── AuditLogScreen.tsx      # Log de auditoria
│   ├── AgendaScreen.tsx        # Tela de agendamentos (com ConfirmDialog)
│   ├── NovoAgendamentoModal.tsx  # Modal de novo agendamento
│   ├── QuickScheduleModal.tsx  # Agendamento rápido
│   ├── EditarAgendamentoModal.tsx  # Modal de edição de agendamento
│   ├── NotificationCenter.tsx  # sino com badge, dropdown
│   ├── EmptyState.tsx          # Ilustrações quando vazio
│   ├── SuccessAnimation.tsx    # Confetti e check animado
│   ├── ImportarFotosModal.tsx  # Importação em lote de pastas
│   ├── PhotoEditor.tsx         # Editor de anotações nas fotos
│   ├── ProgressHeatmap.tsx     # Grid colorido de progresso
│   ├── ConfirmDialog.tsx       # Modal de confirmação reutilizável
│   ├── StatusScreen.tsx        # Tela de status do sistema (DB, storage, sync)
│   ├── StatusDot.tsx           # Indicador de status visual
│   ├── ContextMenu.tsx         # Menu de contexto (long press)
│   ├── OnboardingTour.tsx      # Tour guiado de 7 passos
│   └── CommentsModal.tsx       # Modal de comentários por apartamento
├── hooks/
│   ├── useKeyboardShortcuts.ts # Atalhos de teclado genéricos
│   └── useRealTimeStatus.ts    # Polling de status a cada 30s
├── lib/
│   ├── db.ts                   # Abstração IndexedDB (v4, ~750 linhas)
│   ├── auth.ts                 # Server-side PIN auth (requireAdmin/requireAnyPin)
│   ├── api.ts                  # Client-side auth fetch (getAuthHeaders/authFetch)
│   ├── theme.tsx               # ThemeProvider (dark/light/auto)
│   ├── settings.ts             # Preferências do usuário (localStorage)
│   ├── syncQueue.ts            # Fila de sync com retry/backoff (~222 linhas)
│   ├── notifications.ts        # State management de notificações pub/sub
│   ├── notificationsPush.ts    # Browser push notifications + fallback in-app
│   ├── auditLog.ts             # Log de auditoria via IndexedDB
│   ├── backup.ts               # Backup manual/automático
│   ├── autoBackup.ts           # Timer de backup automático configurável
│   ├── scanPro.ts              # Feedback sonoro + vibração
│   ├── drawing.ts              # Canvas API para anotações
│   ├── haptic.ts               # Vibração em ações (6 padrões)
│   ├── motion.ts               # Constantes de animação (spring, stagger, item)
│   ├── utils.ts                # normApto(), normalizeBloco(), formatarDataParaInput(), etc.
│   ├── constants.ts            # Constantes centralizadas (SYNC_INTERVAL_MS, etc.)
│   ├── version.ts              # APP_VERSION = '3.4.1'
│   ├── blurDetect.ts           # Detecção de blur/brilho em fotos (Laplacian)
│   ├── googleDrive.ts          # Integração Google Drive (gapi + OAuth2)
│   ├── validation.ts           # Validação de input para API routes
│   ├── rateLimit.ts            # Rate limiter in-memory (4 tiers)
│   ├── sql.ts                  # Singleton Neon PostgreSQL connection
│   └── export/
│       ├── index.ts            # Barrel export
│       ├── csv.ts              # Exportação CSV
│       ├── pdf.ts              # Exportação PDF (jspdf) com PDFTemplate
│       ├── xlsx.ts             # Exportação XLSX
│       ├── zip.ts              # Exportação ZIP com fotos
│       ├── json.ts             # Exportação JSON estruturada
│       ├── html.ts             # Relatório HTML standalone
│       └── utils.ts            # Helpers de exportação
├── public/
│   ├── sw.js                   # Service Worker (stale-while-revalidate, push events)
│   ├── manifest.json           # PWA manifest (com shortcuts, categories)
│   ├── robots.txt              # SEO (noindex/nofollow para PWA)
│   └── icon.svg                # Ícone do app
├── Troca-cyble/                # Obsidian vault — documentação
├── package.json                # v3.4.0
├── tsconfig.json
├── next.config.mjs
└── README.md
```

## Descrição dos Arquivos Críticos

### `app/page.tsx` (~2296 linhas)
- Componente raiz com toda a lógica de estado
- 35+ estados: `pin`, `userRole`, `lista`, `status`, `view`, `blocoAtual`, `aptoAtual`, `busca`, `pendentes`, `online`, `fotosOnline`, `buscaGlobal`, `dataFiltro`, `modoEscaneamento`, `fotosRecentes`, `diasAlerta`, `itensPagina`, `paginaAtual`, `theme`, `statusFilter`, `showCommentsModal`, etc.
- 11 views: `blocos`, `apartamentos`, `captura`, `configuracoes`, `syncQueue`, `auditLog`, `exportar`, `heatmap`, `agenda`, `comparativo`, `status`
- `tentarSincronizar()` — loop de sync com ProgressToast
- `normalizeBloco()` — normaliza chaves de torre
- Pre-computed maps: `statusMap`, `fotosOnlineMap` (O(1) lookups)
- Sync lock mutex via `syncLockRef`

### `lib/db.ts` (~750 linhas)
- Schema TypeScript com `DBSchema` do `idb` (v4)
- Stores: `fotos`, `config`, `syncLog`, `agendamentos`, `notas`, `comentarios`
- Funções: `salvarFoto`, `fotosDoApartamento`, `fotosPendentes`, `marcarSincronizada`, `statusDeTodosApartamentos`, `obterTodasFotos`, `marcarTodosDocsOK`
- `syncConcluidosToAPI()` com lock mutex para evitar overwrites
- `comprimirImagem()` com OffscreenCanvas + fallback `toBlob()`
- `loadImageFromBlob()` com timeout de 5s

### `lib/auth.ts` (~50 linhas)
- `requireAdmin(req)` — valida x-app-pin contra ADMIN_PIN ou APP_PIN
- `requireAnyPin(req)` — valida contra ADMIN_PIN, VIEWER_PIN ou APP_PIN
- `AuthRole` type: `'admin' | 'viewer' | 'none'`

### `lib/api.ts` (~30 linhas)
- `getAuthHeaders()` — lê PIN do localStorage
- `authFetch(url, opts)` — fetch com headers de autenticação

### `components/StatusScreen.tsx` (~331 linhas)
- Tela de status do sistema com métricas em tempo real
- API latency, storage estimate, sync stats, tower progress
- Acessível via Configuracoes > Sobre > "Ver Status"

### `hooks/useKeyboardShortcuts.ts` (~40 linhas)
- `useKeyboardShortcut(keys, handler)` — hook genérico
- `buildMainShortcuts()` — `/` busca, `Escape` voltar, `1-8` trocar torre
- **Ainda não integrado no page.tsx** (disponível para uso futuro)

### `components/CommentsModal.tsx` (~140 linhas)
- Modal de comentários por apartamento
- CRUD: adicionar, listar, excluir (com ConfirmDialog)
- Admin mode: exclusão habilitada

### `app/api/upload/route.ts` (~60 linhas)
- Admin auth via `requireAdmin()`
- Validação: `ALLOWED_IMAGE_TYPES`, `MAX_FILE_SIZE_BYTES` (15MB)
- Upload para Vercel Blob + insert no Neon PostgreSQL
- Path: `vistorias/bloco-{bloco}/apto-{apartamento}/{categoria}-{timestamp}.{ext}`
