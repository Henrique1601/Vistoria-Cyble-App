# Arquitetura do Projeto

## Diagrama de Componentes

```
┌──────────────────────────────────────────────────────┐
│                   layout.tsx                         │
│  (fonts, metadata, SwRegister, ThemeProvider)        │
│  ┌────────────────────────────────────────────────┐  │
│  │  ToastProvider + ProgressToastProvider         │  │
│  └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│                   page.tsx (Home)                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ PinGate │→│ Setup    │→│ Captura  │→│ Galeria │ │
│  │         │ │ Screen   │ │ Screen   │ │ Client  │ │
│  └─────────┘ └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ SyncQueue│ │ AuditLog │ │ Tower    │ │ Agenda │ │
│  │ Screen   │ │ Screen   │ │ Report   │ │ Screen │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────────────┐ ┌───────────────────────────┐ │
│  │ Configuracoes    │ │ NovoAgendamentoModal      │ │
│  │ Client           │ │ QuickScheduleModal        │ │
│  └──────────────────┘ │ EditarAgendamentoModal    │ │
│                       └───────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│              Componentes Compartilhados              │
│  BottomNav, SearchBar, FotosRecentes, BlocosGrid    │
│  ExportSection, AtrasadosSection, ProgressHeatmap   │
│  EmptyState, SuccessAnimation, NotificationCenter   │
│  ProgressToast, ImportarFotosModal, PhotoEditor     │
├──────────────────────────────────────────────────────┤
│              lib/ (Lógica de Negócio)                │
│  db.ts, auth.ts, api.ts, settings.ts, theme.tsx     │
│  syncQueue.ts, notifications.ts, auditLog.ts        │
│  backup.ts, scanPro.ts, drawing.ts, haptic.ts       │
│  export/{csv,pdf,xlsx,zip,html}.ts                  │
├──────────────────────────────────────────────────────┤
│              API Routes (Server-side)                │
│  /api/status, /api/upload, /api/fotos               │
│  /api/concluidos, /api/building-config              │
│  /api/agendamentos, /api/backup                     │
│  /api/share-report, /api/version                    │
│  /api/fotos/bulk-delete                             │
├──────────────────────────────────────────────────────┤
│              Armazenamento Nuvem                     │
│  Vercel Blob (fotos) + Neon PostgreSQL (metadados)  │
└──────────────────────────────────────────────────────┘
```

## Camadas

### 1. Apresentação (React Components)
- **PinGate** — Tela de login com PIN dual (Admin/Viewer)
- **SetupScreen** — Cadastro inicial de blocos/apartamentos (Manual/Importar/Nuvem)
- **CapturaScreen** — Interface de captura de fotos com drag-drop, multi-foto, GPS
- **GaleriaClient** — Visualização de fotos online agrupadas por torre/apto
- **Home (page.tsx)** — Gerencia estado global, navegação entre telas (~2000 linhas)

### 2. Componentes Compartilhados
- **BottomNav** — Navegação inferior (Inicio/Camera/Galeria/Agenda/Config)
- **SearchBar** — Busca global com status dots
- **BlocosGrid** — Grid de torres com ProgressRing
- **TowerReportPanel** — Painel lateral de relatório por torre
- **ExportSection** — Seção de exportação (CSV/PDF/XLSX/ZIP/HTML/Compartilhar)
- **SyncQueueScreen** — Fila de sincronização com retry/backoff
- **AuditLogScreen** — Log de auditoria do usuário
- **AgendaScreen** — Tela de agendamentos de vistoria
- **ConfiguracoesClient** — Tela de configurações
- **NotificationCenter** — sino com badge, dropdown de notificações
- **ProgressToast** — Toast premium com progress bar e shimmer
- **ProgressHeatmap** — Grid colorido de progresso por torre
- **ImportarFotosModal** — Importação em lote de pastas
- **PhotoEditor** — Editor de anotações nas fotos
- **EmptyState** — Ilustrações quando vazio
- **SuccessAnimation** — Confetti e check animado

### 3. Persistência Local
- **lib/db.ts** — Abstração sobre IndexedDB (v4)
  - Store `fotos` — fotos capturadas (blob + metadados: `anotacoes`, `gps`, `nota`)
  - Store `config` — lista de blocos/apartamentos e PIN
  - Store `syncLog` — log de sincronizações
  - Store `auditLog` — registro de ações
  - Store `agendamentos` — agendamentos de vistoria
  - Store `notas` — notas por foto (v4)
  - Store `comentarios` — comentários por apartamento (v4)

### 4. API (Server-side)
- **POST /api/status** — Valida PIN
- **POST /api/upload** — Upload de foto para Vercel Blob + Neon
- **GET/DELETE/PATCH /api/fotos** — CRUD de fotos online
- **POST /api/fotos/bulk-delete** — Exclusão em lote
- **GET/POST /api/concluidos** — Status de conclusão
- **GET/POST /api/building-config** — Configuração de prédios
- **GET/POST/PUT/DELETE /api/agendamentos** — CRUD de agendamentos
- **POST /api/backup** — Backup para Vercel Blob
- **POST /api/share-report** — Relatório público
- **GET /api/version** — Versão do app

### 5. Segurança
- **lib/auth.ts** — Server-side: `requireAdmin()`, `requireAnyPin()`
- **lib/api.ts** — Client-side: `getAuthHeaders()`, `authFetch()`
- **Admin PIN** — acesso total (mutations)
- **Viewer PIN** — read-only (apenas queries)

### 6. Sincronização
- **tentarSincronizar()** no page.tsx — loop a cada 15s + quando volta online
- **lib/syncQueue.ts** — Fila avançada com retry/backoff exponencial
- **ProgressToast** — Feedback visual em tempo real durante sync
- **Service Worker** — cache do shell, stale-while-revalidate

## Padrões de Estado
- **PIN:** localStorage (`vistoria_pin`) + validação via API
- **Lista de aptos:** IndexedDB → carregada no mount → `useState`
- **Status:** calculado a partir das fotos no IndexedDB (Map O(1))
- **View:** finite state machine (`blocos` → `apartamentos` → `captura` + `agenda` + `configuracoes`)
- **Sync:** lock mutex (`syncLockRef`) + ProgressToast para feedback visual
- **Tema:** `dark | light | auto` via ThemeProvider com CSS custom properties

## Decisões de Arquitetura
1. **Offline-first** — IndexedDB é a fonte de verdade, Blob é backup
2. **Service Worker mínimo** — cache do shell com stale-while-revalidate, fotos nunca passam pelo SW
3. **PIN client-side** — validado na API mas guardado no localStorage
4. **Security hardening** — Server-side auth middleware + client-side auth headers
5. **Sync dual** — Legacy batch (15s timer) + modern queue (retry/backoff) coexist
6. **Dual storage** — Vercel Blob (fotos) + Neon PostgreSQL (metadados/queries)
7. **normalizeBloco** — normaliza chaves de torre ("A" → "Torre A") para lookups consistentes
