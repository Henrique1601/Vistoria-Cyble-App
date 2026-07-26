# Changelog — Vistoria Cyble

## v3.3.0 (25/07/2026)

### Exportação Avançada
- **PDF personalizado** — `lib/export/pdf.ts` reescrito com `PDFTemplate` interface
  - Logo customizada, cores de destaque, rodapé, cards de stats, timestamp opcional
  - `buildPDF()` aceita template como parâmetro
  - `exportarPDF()`/`compartilharPDF()`/`relatorioPDFComFotos()` aceitam template opcional
  - Seletor de 5 cores de destaque no painel de exportação
- **Export JSON** — `lib/export/json.ts` NOVO
  - `ExportJSON` interface: version, exportedAt, summary, apartments[]
  - `exportarJSON()` gera backup estruturado
  - `parseImportJSON()` para validação na importação
- **Backup automático** — `lib/autoBackup.ts` NOVO
  - `startAutoBackup()`/`stopAutoBackup()` timer baseado em `getBackupIntervalo()`
  - Upload automático para `/api/backup` com auth header
  - Auto-inicia na página quando `getBackupAutomatico()` está ativo

### Experiência
- **Filtro por status** — pills coloridos no filter bar
  - Todos/Pendente (vermelho)/Andamento (amarelo)/Concluido (verde)
  - `statusFilter` state filtra `aptosDoBloco` memo
- **Tutorial interativo** — `components/OnboardingTour.tsx` NOVO
  - 7 passos guiados: Bem-vindo, Torres, Captura, Filtros, Exportar, Config, Notificações
  - `shouldShowTutorial()`/`markTutorialDone()` via localStorage `vistoria_tutorial_v2`
  - Progress dots, skip/próximo, animações spring
- **Notificações push** — `lib/notificationsPush.ts` NOVO
  - `requestNotificationPermission()` com fallback in-app
  - `showBrowserNotification()`, `notifySyncComplete()`, `notifyBackupComplete()`, `notifyPrazoApto()`
- **Auto-retry falhas** — `SyncQueueScreen` auto-retry
  - Retry automático de itens pendentes após 30s offline
  - `retryItem()` + `syncAll()` sequencial

---

## v3.2.0 (25/07/2026)

### UI Premium (10 novas features)
- **Glassmorphism** — classes `.glass` e `.glass-subtle` com `backdrop-blur-xl` semitransparente
  - BottomNav: `glass-subtle` (bg-raised/50 + blur)
  - NotificationCenter: `glass` (bg-raised/60 + blur)
  - SyncBanner: `backdrop-blur-md`
- **Swipe actions** — gestos touch nos cards de apartamento
  - Swipe right → "Concluir" (verde, CheckCircle)
  - Swipe left → "Abrir" (accent, CaretRight)
  - Threshold: 80px, visual feedback com transform translateX
- **Skeleton premium** — shimmer animation + resolução cascata
  - `.skeleton` — shimmer animation 1.8s com CSS vars `--skeleton-bg` e `--skeleton-shimmer`
  - `.skeleton-resolve` — clip-path animation top-to-bottom 2s (ease-out)
  - BlocosGrid e lista de aptos usam skeleton no loading
- **Double-tap favoritar** — toque duplo (<300ms) alterna estrela amarela
  - Persistido em `localStorage` como `vistoria_favoritos` JSON array
  - Star icon (yellow) aparece ao lado do apto favoritado
- **Alto contraste** — tema saturado para melhor visibilidade
  - `html.high-contrast`: cores saturadas (#ff9944 accent, #44ffaa success, texto branco)
  - Toggle no filter bar com ícone `CircleHalf`
  - Setting persistido em `lib/settings.ts`
- **Filtros sticky** — barra de busca e filtros fixam no topo ao rolar
  - `sticky top-14 z-20` com backdrop-blur quando scrollY > 80
- **Gradientes temáticos** — cards com gradiente sutil baseado no status
  - Concluído: `from-success/5` | Em andamento: `from-warn/5`
- **Ícones animados** — notificações e sync com animações
  - sino: `animate-ring-bell` (oscilante 0.8s quando unread > 0)
  - SyncBanner: `animate-[spin-slow_2s_linear_infinite]` no ArrowClockwise
- **Exportar pendentes** — toggle "Pendentes" no export
  - Filtra aptos concluídos antes de exportar
  - Botão perigoso vermelho quando ativo
- **Skeleton resolução** — animação cascata de loading premium
  - `@keyframes resolve-down` com clip-path de 0% para 100% em 2s

### Security Hardening
- **`lib/auth.ts`** — NOVO: Server-side PIN auth middleware
  - `requireAdmin(req)` — valida x-app-pin contra ADMIN_PIN ou APP_PIN
  - `requireAnyPin(req)` — valida contra ADMIN_PIN, VIEWER_PIN ou APP_PIN
  - `AuthRole` type: `'admin' | 'viewer' | 'none'`
- **`lib/api.ts`** — NOVO: Client-side auth fetch helpers
  - `getAuthHeaders()` — lê PIN do localStorage
  - `authFetch(url, opts)` — fetch com headers de autenticação
- **PIN dual:** `ADMIN_PIN` (acesso total) + `VIEWER_PIN` (read-only)
- **Todas as API routes** agora requerem PIN auth:
  - `/api/concluidos` — requireAnyPin
  - `/api/building-config` — requireAnyPin (GET), requireAdmin (POST)
  - `/api/agendamentos` — requireAnyPin (GET), requireAdmin (POST/PUT/DELETE)
  - `/api/fotos` — requireAnyPin (GET), requireAdmin (DELETE/PATCH)
  - `/api/fotos/bulk-delete` — requireAdmin
  - `/api/backup` — requireAdmin
  - `/api/share-report` — requireAnyPin
  - `/api/upload` — requireAdmin (era: aceitava qualquer PIN)
- **Client-side:** 20+ fetch calls atualizados para enviar `x-app-pin` header

### ProgressToast
- **`components/ProgressToast.tsx`** — NOVO: Toast premium com progress bar
  - `ProgressToastProvider` — contexto para feedback de sync
  - `useSyncProgress()` — hook: `showSyncProgress`, `updateSyncProgress`, `dismissSyncProgress`
  - Estados: syncing (spinner + shimmer), success (green check), error (red warning)
  - Animações: spring, shimmer overlay, auto-dismiss (3s success, 6s error)
  - z-index [85] para layerar acima de toasts regulares [80]
- **`app/layout.tsx`** — ProgressToastProvider adicionado ao lado de ToastProvider
- **`app/page.tsx`** — `tentarSincronizar()` agora mostra ProgressToast durante sync

### Bug Fixes
- **Gallery → capture navigation fix:** `normalizeBloco()` aplicado em `aptosDoBloco`, `aptosOnlineDoBloco`, e `fotosOnline` filter
  - Root cause: `grupo.bloco` (raw API "A") não encontrava `lista["Torre A"]`
- **`lib/db.ts`** — `_syncConcluidosLock` flag para prevenir overwrites concorrentes
- **`lib/db.ts`** — `syncConcluidosToAPI()` com lock + auth header
- **`console.warn`** adicionado em catch blocks silenciosos (`api/upload`, `lib/db.ts`)

### Acessibilidade
- **BottomNav:** Touch targets de `py-1.5` → `py-2.5` + `min-h-[44px]` (WCAG 2.2 AA)
- **CapturaScreen header:** Botões de `w-9 h-9`/`w-10 h-10` → `w-11 h-11` (44px)

### Code Quality
- Deletado `lib/timer.ts` (dead code, não importado em lugar nenhum)
- `package.json` version sincronizado com `lib/version.ts` (3.2.0)

---

## v3.1.0 (24/07/2026)

### Agenda/Scheduling System
- **`app/api/agendamentos/route.ts`** — NOVO: CRUD completo de agendamentos
  - GET (lista), POST (cria), PUT (atualiza), DELETE (exclui)
  - Conecta ao Neon PostgreSQL tabela `agendamentos`
- **`components/AgendaScreen.tsx`** — NOVO: Tela dedicada de agendamentos
  - Lista com filtros (Todos/Pendentes/Concluídos/Atrasados)
  - Toggle de conclusão com optimistic update
  - Exclusão com confirmação
- **`components/NovoAgendamentoModal.tsx`** — NOVO: Modal de novo agendamento
  - Seleção de torre, apartamento, data, observação
- **`components/QuickScheduleModal.tsx`** — NOVO: Agendamento rápido
  - Acesso direto do dashboard para agendar sem sair da tela
- **`components/EditarAgendamentoModal.tsx`** — NOVO: Edição de agendamento
  - Alterar data, observação, status de conclusão
- **`lib/db.ts`** — Store `agendamentos` adicionado ao IndexedDB (v3)

### Importar Fotos
- **`components/ImportarFotosModal.tsx`** — NOVO: Importação em lote de pastas
  - Selecionar pasta → detecta automaticamente torre e apto
  - Preview antes de importar
  - Importação em batch com progresso

### Busca com Status
- **`components/SearchBar.tsx`** — Status dots nos resultados de busca
  - Verde = concluído, amarelo = em andamento, vermelho = pendente

### Drag-and-Drop
- **`@dnd-kit/core` + `@dnd-kit/sortable`** instalados
- Reordenação de fotos no CapturaScreen
- Feedback visual durante drag

### Haptic Feedback
- **`lib/haptic.ts`** — Vibração em ações importantes
  - Patterns: foto, sync, error, success

### Empty States
- **`components/EmptyState.tsx`** — Ilustrações quando não há dados
  - Tipos: search, photos, agenda, backup

### Watermark
- Marca d'água nas fotos exportadas (PDF, ZIP)

---

## v3.0.0 (18/07/2026)

### Modo Multi-Foto
- **`app/CapturaScreen.tsx`** — Novo botão "Manter na câmera" (ícone Repeat) no header
  - Quando ativado em categorias multi-foto, mantém a câmera abria após salvar
  - Permite capturar múltiplas fotos sem reabrir a câmera a cada vez
  - Auto-reabre câmera 300ms após salvar para melhor UX

### Compartilhar Relatório
- **`app/api/share-report/route.ts`** — NOVO endpoint POST
  - Upload do HTML para Vercel Blob (`v2/reports/`)
  - Público com 7 dias de expiração
  - Limite de 20 relatórios (limpeza automática)
- **`components/ExportSection.tsx`** — Botão "Compartilhar Link" (estilo accent)
  - Novo prop `onShareReport`
  - Gera link público e copia para clipboard

### Backup Agendado
- **`lib/settings.ts`** — Novas preferências: `backupAutomatico` + `backupIntervalo`
  - Intervalos: 30min, 1h, 6h, 24h
- **`app/page.tsx`** — `setInterval` para backup periódico em background
  - Respeita configuração do usuário
  - Toast de confirmação a cada backup automático
- **`app/configuracoes/ConfiguracoesClient.tsx`** — Toggles de configuração
  - Toggle "Backup automático" (Sim/Não)
  - Selector de intervalo quando ativo

### Timer de Escaneamento
- **`lib/db.ts`** — `FotoRecord` inclui `capturedAt?: string` (ISO timestamp)
- **`lib/timer.ts`** — NOVO módulo de cálculo de tempo
  - `calcularTempoApto()` — tempo entre primeira e última foto
  - `calcularTempoPorTorre()` — estatísticas por torre
  - `formatarTempo()` — formatação legível (minutos/segundos)
- **`components/TowerReportPanel.tsx`** — Tempo médio por apto no tooltip
- **`components/ProgressHeatmap.tsx`** — Cor do heatmap reflete tempo (verde = rápido, vermelho = lento)
- **`lib/export/csv.ts`** + **`lib/export/pdf.ts`** + **`lib/export/xlsx.ts`** — Coluna "Tempo" adicionada

---

## v2.9.0 (18/07/2026)

### Notas por Foto
- **`lib/db.ts`** — `ApartamentoStatus` agora inclui `notas?: string[]` (agregado das notas das fotos)
- **`statusDeTodosApartamentos()`** coleta notas de todas as fotos do apto
- **Badge de nota** (ícone 📝 + contador) na lista de aptos e no TowerReportPanel
- **Exportações** — coluna "Notas" adicionada ao CSV, PDF e XLSX

### Exportação por Período
- **`page.tsx`** — `statusExportacao` agora usa `statusFiltradoPorData` quando datas estão definidas
- **`components/ExportSection.tsx`** — indicador visual de período ativo

### Mapa de Progresso (Heatmap)
- **`components/ProgressHeatmap.tsx`** — NOVO componente
  - Grid colorido por torre: cada célula = 1 apto
  - Verde (concluído), amarelo (em andamento), vermelho (pendente)
  - Clicável — navega direto para o apto

---

## v2.8.0 (18/07/2026)

### Audit Log
- **`lib/auditLog.ts`** — Estado reativo de auditoria via IndexedDB
- **`components/AuditLogScreen.tsx`** — Tela dedicada

### Scan Mode Pro
- **`lib/scanPro.ts`** — Feedback sonoro + vibração via Web Audio API

### HTML Report Export
- **`lib/export/html.ts`** — Gerador de relatório HTML standalone

---

## v2.7.0 (18/07/2026)

### Fila de Sync Avançada
- **`lib/syncQueue.ts`** — Estado reativo da fila de sincronização
- **`components/SyncQueueScreen.tsx`** — Tela dedicada

---

## v2.6.0 (18/07/2026)

### Painel de Relatório por Torre
- **`components/TowerReportPanel.tsx`** — Painel lateral slide-in

### Tela de Configurações
- **`app/configuracoes/ConfiguracoesClient.tsx`** — Tela dedicada
- **`lib/settings.ts`** — Persistência de preferências em localStorage

### Central de Notificações
- **`components/NotificationCenter.tsx`** — Ícone sino com badge
- **`lib/notifications.ts`** — State management pub/sub

### BottomNav
- Tab "Config" adicionada ao BottomNav

---

## v2.5.1 (17/07/2026)

### Filtro por Data
- Date pickers no dashboard (data início/fim)
- Atalhos: Hoje, Ontem, Últimos 7 dias, Últimos 30 dias, Todos

---

## v2.5.0 (17/07/2026)

### Anotações nas Fotos (PhotoEditor)
- **`lib/drawing.ts`** — Canvas API: pen, arrow, text
- **`components/PhotoEditor.tsx`** — Editor fullscreen

### Backup Automático
- **`lib/backup.ts`** — `fazerBackupManual`, `fazerBackupAutomatico`
- **`app/api/backup/route.ts`** — POST endpoint

---

## v2.4.0 (16/07/2026)

### Performance + Refactor
- Upload 3 fotos em paralelo (era sequencial)
- `statusDeTodosApartamentos` usa Map O(1) (era O(n²))
- `export.ts` → `lib/export/{csv,pdf,xlsx,zip,utils,index}.ts`

### Refactor do page.tsx
- 6 componentes extraídos: SearchBar, FotosRecentes, AtrasadosSection, BlocosGrid, ExportSection, BottomLinks
- CSS custom properties para dark/light themes

---

## Infraestrutura
- **GitHub:** `https://github.com/Henrique1601/Vistoria-Cyble-App.git`
- **Vercel:** `https://vistoria-cyble-app.vercel.app`
- **Neon PostgreSQL:** projeto `withered-math-93982661`, DB `neondb`
- **Vercel Blob store:** `vistoria-cyble-app-public`
- **Env vars:** `ADMIN_PIN`, `VIEWER_PIN`, `APP_PIN`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`
