# Estrutura de Arquivos

```
vistoria-cyble-app/
├── app/
│   ├── layout.tsx              # Layout raiz (fonts, metadata, SW register, providers)
│   ├── page.tsx                # Home — gerencia estado e navegação (~2000 linhas)
│   ├── globals.css             # Estilos globais (dark/light themes, CSS vars)
│   ├── PinGate.tsx             # Tela de autenticação por PIN dual (Admin/Viewer)
│   ├── SetupScreen.tsx         # Cadastro de blocos (Manual/Importar/Nuvem)
│   ├── CapturaScreen.tsx       # Interface de captura de fotos (~730 linhas)
│   ├── sw-register.tsx         # Registro do Service Worker
│   ├── galeria/
│   │   └── GaleriaClient.tsx   # Visualização de fotos online (~856 linhas)
│   ├── configuracoes/
│   │   └── ConfiguracoesClient.tsx  # Tela de configurações
│   └── api/
│       ├── status/route.ts     # POST — validação de PIN
│       ├── upload/route.ts     # POST — upload de foto (admin only)
│       ├── fotos/route.ts      # GET/DELETE/PATCH — CRUD de fotos
│       ├── fotos/bulk-delete/route.ts  # POST — exclusão em lote
│       ├── concluidos/route.ts  # GET/POST — status de conclusão
│       ├── building-config/route.ts  # GET/POST — config de prédios
│       ├── agendamentos/route.ts  # GET/POST/PUT/DELETE — agendamentos
│       ├── backup/route.ts     # POST — backup para Blob
│       ├── share-report/route.ts  # POST — relatório público
│       └── version/route.ts    # GET — versão do app
├── components/
│   ├── BottomNav.tsx           # Navegação inferior (5 abas)
│   ├── Toast.tsx               # Sistema de toasts (success/error/info/warning)
│   ├── ProgressToast.tsx       # Toast premium com progress bar e shimmer
│   ├── SearchBar.tsx           # Busca global com status dots
│   ├── FotosRecentes.tsx       # Fotos capturadas recentemente
│   ├── AtrasadosSection.tsx   # Seção de apartamentos atrasados
│   ├── BlocosGrid.tsx          # Grid de torres com ProgressRing
│   ├── ProgressRing.tsx        # Anel de progresso SVG circular
│   ├── ExportSection.tsx       # Seção de exportação
│   ├── TowerReportPanel.tsx    # Painel lateral de relatório por torre
│   ├── SyncQueueScreen.tsx     # Fila de sincronização com retry
│   ├── AuditLogScreen.tsx      # Log de auditoria
│   ├── AgendaScreen.tsx        # Tela de agendamentos
│   ├── NovoAgendamentoModal.tsx  # Modal de novo agendamento
│   ├── QuickScheduleModal.tsx  # Agendamento rápido
│   ├── EditarAgendamentoModal.tsx  # Modal de edição de agendamento
│   ├── NotificationCenter.tsx  # sino com badge, dropdown
│   ├── EmptyState.tsx          # Ilustrações quando vazio
│   ├── SuccessAnimation.tsx    # Confetti e check animado
│   ├── ImportarFotosModal.tsx  # Importação em lote de pastas
│   ├── PhotoEditor.tsx         # Editor de anotações nas fotos
│   └── ProgressHeatmap.tsx     # Grid colorido de progresso
├── lib/
│   ├── db.ts                   # Abstração IndexedDB (v3, ~530 linhas)
│   ├── auth.ts                 # Server-side PIN auth (requireAdmin/requireAnyPin)
│   ├── api.ts                  # Client-side auth fetch (getAuthHeaders/authFetch)
│   ├── theme.tsx               # ThemeProvider (dark/light/auto)
│   ├── settings.ts             # Preferências do usuário (localStorage)
│   ├── syncQueue.ts            # Fila de sync com retry/backoff (~220 linhas)
│   ├── notifications.ts        # State management de notificações pub/sub
│   ├── auditLog.ts             # Log de auditoria via IndexedDB
│   ├── backup.ts               # Backup manual/automático
│   ├── scanPro.ts              # Feedback sonoro + vibração
│   ├── drawing.ts              # Canvas API para anotações
│   ├── haptic.ts               # Vibração em ações
│   ├── motion.ts               # Constantes de animação (spring, stagger, item)
│   ├── utils.ts                # normApto(), formatarDataParaInput(), etc.
│   ├── version.ts              # APP_VERSION = '3.2.0'
│   ├── export/
│   │   ├── index.ts            # Barrel export
│   │   ├── csv.ts              # Exportação CSV
│   │   ├── pdf.ts              # Exportação PDF (jspdf)
│   │   ├── xlsx.ts             # Exportação XLSX
│   │   ├── zip.ts              # Exportação ZIP com fotos
│   │   ├── html.ts             # Relatório HTML standalone
│   │   └── utils.ts            # Helpers de exportação
│   └── sql.ts                  # Singleton Neon PostgreSQL connection
├── public/
│   ├── sw.js                   # Service Worker (stale-while-revalidate)
│   ├── manifest.json           # PWA manifest
│   └── icon.svg                # Ícone do app
├── Troca-cyble/                # Obsidian vault — documentação
├── package.json                # v3.2.0
├── tsconfig.json
├── next.config.mjs
└── README.md
```

## Descrição dos Arquivos Críticos

### `app/page.tsx` (~2000 linhas)
- Componente raiz com toda a lógica de estado
- 30+ estados: `pin`, `userRole`, `lista`, `status`, `view`, `blocoAtual`, `aptoAtual`, `busca`, `pendentes`, `online`, `fotosOnline`, `buscaGlobal`, `dataFiltro`, `modoEscaneamento`, `fotosRecentes`, `diasAlerta`, `itensPagina`, `paginaAtual`, `theme`, etc.
- `tentarSincronizar()` — loop de sync com ProgressToast
- `normalizeBloco()` — normaliza chaves de torre
- Pre-computed maps: `statusMap`, `fotosOnlineMap` (O(1) lookups)
- Sync lock mutex via `syncLockRef`

### `lib/db.ts` (~530 linhas)
- Schema TypeScript com `DBSchema` do `idb` (v3)
- Stores: `fotos`, `config`, `syncLog`, `auditLog`, `agendamentos`
- Funções: `salvarFoto`, `fotosDoApartamento`, `fotosPendentes`, `marcarSincronizada`, `statusDeTodosApartamentos`
- `syncConcluidosToAPI()` com lock mutex para evitar overwrites

### `lib/auth.ts` (~50 linhas)
- `requireAdmin(req)` — valida x-app-pin contra ADMIN_PIN ou APP_PIN
- `requireAnyPin(req)` — valida contra ADMIN_PIN, VIEWER_PIN ou APP_PIN
- `AuthRole` type: `'admin' | 'viewer' | 'none'`

### `lib/api.ts` (~30 linhas)
- `getAuthHeaders()` — lê PIN do localStorage
- `authFetch(url, opts)` — fetch com headers de autenticação

### `components/ProgressToast.tsx` (~180 linhas)
- `ProgressToastProvider` — contexto para feedback de sync
- `useSyncProgress()` — hook: `showSyncProgress`, `updateSyncProgress`, `dismissSyncProgress`
- Estados: syncing (spinner + shimmer), success (green check), error (red warning)
- Animações: spring, shimmer overlay, auto-dismiss

### `app/api/upload/route.ts` (~60 linhas)
- Admin auth via `requireAdmin()`
- Validação: `ALLOWED_IMAGE_TYPES`, `MAX_FILE_SIZE_BYTES` (15MB)
- Upload para Vercel Blob + insert no Neon PostgreSQL
- Path: `vistorias/bloco-{bloco}/apto-{apartamento}/{categoria}-{timestamp}.{ext}`
