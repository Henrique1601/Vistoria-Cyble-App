# Changelog — Vistoria Cyble

## v3.7.0 (28/08/2026)

### Modularização Arquitetural de `app/page.tsx`
- **`hooks/useVistoriaState.ts`** — Hook centralizador do estado do IndexedDB, status dos apartamentos, fotos online e mapas O(1)
- **`hooks/useApartamentosFilter.ts`** — Hook para gerenciamento de filtros, ordenação, busca e paginação de torres
- **`hooks/useAppLifecycle.ts`** — Hook para timeout de inatividade, auto-backup, checagem de versão e alertas de storage
- **`components/views/ApartamentosView.tsx`** — View dedicada de listagem de apartamentos com rolagem virtualizada
- **`components/views/ExportarView.tsx`** — View isolada de exportação multiformato e relatórios
- **`components/Dashboard.tsx`** — Painel Hero isolado de métricas e filtros por período
- **`components/SyncBanner.tsx`** — Banner flutuante de sincronização/offline
- **`components/EstatisticasPeriodo.tsx` & `components/EstatisticasPorTorre.tsx`** — Componentes visuais de estatísticas
- **`app/page.tsx`** — Redução de ~2.412 linhas para 647 linhas limpas focadas em roteamento e modais
- **Performance:** Redução do bundle First Load JS em ~8 kB

## v3.6.0 (25/08/2026)

### Sincronização Unificada
- **`lib/syncQueue.ts`** — Pipeline de sincronização 100% centralizado e unificado
  - Suporte a concorrência configurável (lotes de 3 uploads simultâneos via `SYNC_CONCURRENCY`)
  - Gestão de ciclo de vida com callbacks (`onStart`, `onProgress`, `onSuccess`, `onError`, `onDone`)
  - Integração nativa com `logAudit` (`sync_started`, `sync_completed`, `sync_failed`)
  - Notificações in-app e push automáticas
  - Mutex com watchdog de segurança contra deadlocks
- **`app/page.tsx`** — Remoção da lógica de upload duplicada, delegando integralmente para `syncQueue.syncAll()`

### Processamento e Compressão em Web Worker
- **`public/workers/imageWorker.js`** — Web Worker para processamento paralelo de imagens
  - Autocorreção nativa de orientação EXIF com `createImageBitmap`
  - Redimensionamento e compressão JPEG com `OffscreenCanvas` em thread secundária
  - Análise laplaciana de nitidez e brilho médio para `detectBlur` em background
- **`lib/imageProcessor.ts`** — Gerenciador de ciclo de vida do worker com fallback automático
- **`app/CapturaScreen.tsx`** — Integração com `processarFotoCompleta()` mantendo a UI em 60 FPS contínuos durante disparos rápidos

## v3.5.1 (06/08/2026)

### Compartilhamento de Agenda
- **`components/ShareAgendaModal.tsx`** — Modal de compartilhamento da agenda
  - Filtro por período: Hoje, Semana, 7/15/30 dias, Todos
  - Preview formatado com atrasados, pendentes e concluídos
  - Copiar para área de transferência (clipboard)
  - Compartilhar via Web Share API (WhatsApp, email, etc.)
- **`components/AgendaScreen.tsx`** — Botão de compartilhar no header

### Exportação PDF da Agenda
- **`lib/export/agendaPdf.ts`** — Nova função `exportarAgendaPDF()`
  - Tabela formatada com seções: Atrasados, Pendentes, Concluídos
  - Header com título, data de geração e resumo
  - Cores por seção (vermelho, laranja, verde)
  - Compartilhamento via Web Share API

### Busca na Agenda
- **`components/AgendaScreen.tsx`** — Campo de busca
  - Filtra por torre, apartamento ou observação
  - Botão X para limpar busca
  - Busca em tempo real

### Google Calendar
- **`lib/googleCalendar.ts`** — Integração com Google Calendar
  - `gerarUrlGoogleCalendar()` — gera link direto para adicionar evento
  - `abrirGoogleCalendar()` — abre em nova aba
  - `gerarICS()` — gera arquivo .ics para importação em lote
  - `compartilharICS()` — compartilha .ics via Web Share API
  - `downloadICS()` — faz download do arquivo .ics
- **`components/AgendaScreen.tsx`** — Botões de Google Calendar
  - Botão Google Calendar no header (exporta .ics)
  - Botão Google Calendar em cada agendamento (abre link direto)

### Notificações de Lembrete
- **`lib/notificationsPush.ts`** — Novas funções
  - `notifyLembreteAgendamento()` — notifica sobre agendamento específico
  - `verificarLembretes()` — verifica agendamentos do dia e envia lembretes
- **`components/AgendaScreen.tsx`** — Verificação automática ao abrir agenda

### Verificação de Duplicata
- **`components/NovoAgendamentoModal.tsx`** — Alerta de agendamento duplicado
  - Verifica automaticamente se apartamento já tem agendamento para a data
  - Aviso visual com ícone de warning quando detecta duplicata
  - Botão muda para "Agendar Mesmo Assim" (cor warning)
  - Permite salvar mesmo com duplicata (caso o usuário queira)

### Toggle Sincronização
- **`ConfiguracoesClient.tsx`** — Toggle "Sincronização automática"
  - Liga/desliga envio de fotos para a nuvem
  - Mostra quantidade de fotos pendentes quando desligado
  - Aviso amarelo com instrução para ativar sincronização

## v3.5.0 (02/08/2026)

### Google Drive Backup
- **`lib/googleDrive.ts`** — Integração completa com Google Drive API
  - `initGoogleDrive()` — inicializa gapi + OAuth2 token client
  - `requestGoogleDriveAccess()` — solicita acesso ao Drive via popup
  - `backupToGoogleDrive(blob, fileName)` — upload de backup JSON
  - `listGoogleDriveBackups()` — lista backups existentes no Drive
  - Client ID real configurado, descoberta automática de API
- **`ConfiguracoesClient.tsx`** — Seção "Google Drive" no painel de configurações
  - Botão "Conectar ao Google Drive" com OAuth flow
  - Indicador de conexão (bolinha verde)
  - Botão "Backup no Google Drive" — envia backup completo
  - Botão "Listar backups no Drive" — mostra quantidade de backups

### Melhorias de Qualidade
- **`lib/db.ts`** — Qualidade máxima aumentada: `QUALIDADE_MAP['100']` de `0.95` para `1.0`
- **`lib/db.ts`** — Resolução máxima: `MAX_IMAGE_WIDTH_FULL=4096` (qualidade 100 usa 4096px)

### Offline & Sync
- **`components/AgendaScreen.tsx`** — Merge de dados offline: preserva agendamentos locais ao sincronizar com servidor

### PWA
- **`app/page.tsx`** — Atualização SW: soft refresh em vez de reload completo (sem perda de estado)

### Segurança
- **`ConfiguracoesClient.tsx`** — Danger Zone: botões destrutivos protegidos com PIN admin + dupla confirmação

### Documentação
- **`AGENTS.md`** — Regras de sincronização Obsidian/README obrigatórias
- **`00-Visão Geral.md`** — Google Drive Backup adicionado às funcionalidades
- **`10-Changelog.md`** — Esta entrada
- **`09-Roadmap.md`** — Google Drive marcado como concluído
- **`README.md`** — Seção Google Drive adicionada

## v3.4.1 (31/07/2026)

### Keyboard Shortcuts
- **`hooks/useKeyboardShortcuts.ts`** — hook genérico + `buildMainShortcuts()` helper
- **`app/page.tsx`** — Atalhos integrados:
  - `/` — foca na busca global
  - `Escape` — navega para trás (captura→apartamentos→blocos)
  - `1-8` — troca de torre (quando na tela de blocos)

### Virtualização
- **`@tanstack/react-virtual`** — lista de apartamentos virtualizada
  - Container com scroll, maxHeight viewport-based
  - Virtualizer com 64px estimated size, 5 overscan
  - Melhora performance com listas grandes (~160 aptos)

### Bug Fixes
- **`lib/blurDetect.ts`** — 5s timeout no `loadImage()` para evitar travamento no mobile
- **`lib/db.ts`** — `loadImageFromBlob()` com 5s timeout + `OffscreenCanvas` fallback no `comprimirImagem()`
- **`app/CapturaScreen.tsx`** — Input reset (`type="file"`) para re-abrir galeria; `handleBlurOverride` com try/catch
- **`app/page.tsx`** — `fetch('/api/fotos')` condicionado ao PIN (evita erro 401)
- **`hooks/useRealTimeStatus.ts`** — Skip fetch se não houver PIN configurado
- **Scroll-to-top** — `scrollTo({ top: 0 })` ao trocar de view
- **Agenda filter** — Filtro de agendamentos corrigido para mostrar apenas aptos com fotos reais
- **Photo error handling** — try/catch em `handlePhotoChange` com toast de erro

### Comment Fix
- **`app/page.tsx`** — `<CommentsModal>` adicionado na view `'apartamentos'` com `adminMode`

## v3.4.0 (31/07/2026)

### Novos Componentes
- **`components/StatusScreen.tsx`** — Tela de status do sistema
  - API latency measurement, storage estimate, sync stats
  - Tower progress bars + overall progress
  - Acessível via Configuracoes > Sobre > "Ver Status"
- **`app/global-error.tsx`** — Global error boundary com tema hardcoded
  - Retry button + reload page
  - HTML inline (não depende de React/Tailwind)
- **`hooks/useKeyboardShortcuts.ts`** — Atalhos de teclado genéricos
  - `useKeyboardShortcut(keys, handler)` — hook reutilizável
  - `buildMainShortcuts()` — `/` busca, `Escape` voltar, `1-8` trocar torre
- **`components/CommentsModal.tsx`** — Modal de comentários por apartamento
  - CRUD: adicionar, listar, excluir (com ConfirmDialog)
  - Admin mode: exclusão habilitada

### Melhorias UI
- **`components/ConfirmDialog.tsx`** — `danger`/`warning` variants, `onConfirm`/`onCancel`
- **`components/AgendaScreen.tsx`** — ConfirmDialog + toast no delete
- **`components/CommentsModal.tsx`** — ConfirmDialog + toast no add/delete
- **`components/AptoCard.tsx`** — Toast ao favoritar
- **`app/galeria/GaleriaClient.tsx`** — Shimmer animation no skeleton cards

### SEO
- **`app/layout.tsx`** — OpenGraph + Twitter meta tags, robots (noindex/nofollow)
- **`public/robots.txt`** — Criado (User-agent: * Disallow: /)
- **`public/manifest.json`** — orientation, categories, lang, dir adicionados

### Infraestrutura
- **`lib/version.ts`** — `APP_VERSION = '3.4.1'`
- **`public/sw.js`** — Cache `vistoria-shell-v6`, version 3.4.1
- **`package.json`** — `@tanstack/react-virtual` instalado (disponível para uso futuro)
- **`app/api/version/route.ts`** — Endpoint GET para SW auto-update

---

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
- **Todas as API routes** agora requerem PIN auth
- **Client-side:** 20+ fetch calls atualizados para enviar `x-app-pin` header

### ProgressToast
- **`components/ProgressToast.tsx`** — NOVO: Toast premium com progress bar
  - `ProgressToastProvider` — contexto para feedback de sync
  - `useSyncProgress()` — hook: `showSyncProgress`, `updateSyncProgress`, `dismissSyncProgress`
  - Estados: syncing (spinner + shimmer), success (green check), error (red warning)
  - Animações: spring, shimmer overlay, auto-dismiss (3s success, 6s error)

### Bug Fixes
- **Gallery → capture navigation fix:** `normalizeBloco()` aplicado em 3 places
- **`lib/db.ts`** — `_syncConcluidosLock` flag para prevenir overwrites concorrentes
- **Acessibilidade:** Touch targets 44px (WCAG 2.2 AA)

---

## v3.1.0 (24/07/2026)

### Agenda/Scheduling System
- CRUD completo de agendamentos (GET/POST/PUT/DELETE)
- AgendaScreen, NovoAgendamentoModal, QuickScheduleModal, EditarAgendamentoModal
- Neon PostgreSQL tabela `agendamentos`

### Importar Fotos (Bulk Import)
- ImportarFotosModal — importação em lote de pastas
- Auto-detect torre e apto, preview antes de importar

### Drag-and-Drop
- @dnd-kit/core + @dnd-kit/sortable para reordenação de fotos

### Haptic Feedback
- Vibração em ações importantes

### Empty States
- Ilustrações SVG quando não há dados

### Watermark
- Marca d'água nas fotos exportadas

---

## v3.0.0 (18/07/2026)

### Modo Multi-Foto
- Botão "Manter na câmera" para captura contínua

### Compartilhar Relatório
- Link público via Vercel Blob (7 dias)

### Backup Agendado
- Backup periódico automático (30min/1h/6h/24h)

### Timer de Escaneamento
- Tempo por apto via timestamps das fotos

---

## v2.9.0 (18/07/2026)

### Notas por Foto
### Exportação por Período
### Mapa de Progresso (Heatmap)

---

## v2.8.0 (18/07/2026)

### Audit Log
### Scan Mode Pro (sonoro + vibração)
### HTML Report Export

---

## Infraestrutura
- **GitHub:** `https://github.com/Henrique1601/Vistoria-Cyble-App.git`
- **Vercel:** `https://vistoria-cyble-app.vercel.app`
- **Neon PostgreSQL:** projeto `withered-math-93982661`, DB `neondb`
- **Vercel Blob store:** `vistoria-cyble-app-public`
- **Env vars:** `ADMIN_PIN`, `VIEWER_PIN`, `APP_PIN`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`
