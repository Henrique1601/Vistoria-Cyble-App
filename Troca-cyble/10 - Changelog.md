# Changelog — Vistoria Cyble

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
- Input de nota já existia no CapturaScreen (via `atualizarNota()`)

### Exportação por Período
- **`page.tsx`** — `statusExportacao` agora usa `statusFiltradoPorData` quando datas estão definidas
- **`components/ExportSection.tsx`** — indicador visual de período ativo (ícone Calendar + range + contagem de aptos)
- Filtro de período do dashboard agora afeta todas as exportações (CSV, PDF, XLSX, ZIP, HTML)

### Mapa de Progresso (Heatmap)
- **`components/ProgressHeatmap.tsx`** — NOVO componente
  - Grid colorido por torre: cada célula = 1 apto
  - Verde (concluído), amarelo (em andamento), vermelho (pendente)
  - Dot indicador de nota (ponto accent no canto)
  - Clicável — navega direto para o apto
  - Toggle na tela principal para mostrar/esconder
  - Tooltip com status e notas

---

## v2.8.0 (18/07/2026)

### Audit Log
- **`lib/auditLog.ts`** — Estado reativo de auditoria via IndexedDB
  - Actions rastreadas: `photo_captured`, `photo_deleted`, `photo_annotated`, `photo_shared`, `sync_started`, `sync_completed`, `sync_failed`, `export_csv`, `export_pdf`, `export_xlsx`, `export_zip`, `export_html`, `backup_created`, `backup_restored`, `settings_changed`, `login`, `logout`
  - Auto-trim para máx. 500 registros
  - Search e filtro por tipo de ação
- **`components/AuditLogScreen.tsx`** — Tela dedicada
  - Header com contadores e busca
  - Filtros: Todas / Fotos / Sync / Exports / Backup / Config
  - Lista com ícone colorido por ação, descrição, timestamp relativo

### Scan Mode Pro
- **`lib/scanPro.ts`** — Feedback sonoro + vibração via Web Audio API
  - Tons diferenciados por evento: foto capturada, foto sincronizada, categoria alterada, erro, completo, próximo apto
  - Vibração patterns:拍 (photo), sync, error, success
  - Toggles configuráveis: `audioEnabled`, `vibrationEnabled`
  - Chamado em `CapturaScreen` ao salvar foto

### HTML Report Export
- **`lib/export/html.ts`** — Gerador de relatório HTML standalone
  - `gerarRelatorioHTML()` gera HTML com thumbs de fotos embutidos, stats por torre, progress bars, tema escuro
  - `downloadHTML()` para download no browser
  - Interface `HtmlFoto` para mapeamento simplificado de fotos
- **`components/ExportSection.tsx`** — Novo botão HTML na seção de exportação

---

## v2.7.0 (18/07/2026)

### Fila de Sync Avançada
- **`lib/syncQueue.ts`** — Estado reativo da fila de sincronização
  - Status por foto: `pending` → `uploading` → `success` | `failed`
  - Auto-retry com backoff exponencial (1s → 2s → 4s → 8s → 30s, máx 5 tentativas)
  - Upload 3 fotos em paralelo
  - Cancelamento de sync em andamento
  - Retry individual, retry todas as falhas, limpar enviadas
  - Pub/sub para reatividade (`subscribe`, `getQueue`, `getQueueStats`)
- **`components/SyncQueueScreen.tsx`** — Tela dedicada
  - Header com contadores e status online/offline
  - Barra de progresso geral animada
  - Botão Sincronizar Tudo / Cancelar
  - Filtros: Todos / Pendente / Enviando / Enviado / Falhou
  - Lista de fotos com: categoria, apto/bloco, timestamp, status badge, tentativas
  - Retry individual por foto, dispensar enviadas
- **Acessibilidade:** SyncBanner (barra inferior) agora é clicável e abre a tela da fila

---

## v2.6.0 (18/07/2026)

### Painel de Relatório por Torre
- **`components/TowerReportPanel.tsx`** — Painel lateral slide-in da direita
  - Cards de resumo: concluídos/em andamento/pendentes
  - Barra de progresso animada
  - Filtros de status (Todos/Pendente/Em andamento/Concluído)
  - Lista de aptos com badge de status, data última vistoria, contagem de fotos
  - Clique no apto navega para CapturaScreen
  - Backdrop blur, spring animation
- **`BlocosGrid.onSelect`** agora abre o painel (não navega para lista)

### Tela de Configurações
- **`app/configuracoes/ConfiguracoesClient.tsx`** — Tela dedicada
  - **Aparência:** Toggle dark/light/auto
  - **Captura:** Qualidade foto (50/75/90%), modo escaneamento padrão
  - **Dados:** Dias alerta (+/-), itens por página (10/20/50/tudo), exportar/importar backup, limpar fotos locais, limpar tudo
  - **Sobre:** Versão, barra de armazenamento, link GitHub
- **`lib/settings.ts`** — Persistência de preferências em localStorage
  - `get/setTema`, `get/setQualidadeFoto`, `get/setScanMode`, `get/setDiasAlerta`, `get/setItensPagina`

### Central de Notificações
- **`components/NotificationCenter.tsx`** — Ícone sino com badge no header
  - Dropdown com lista de notificações
  - Tipos: sync, backup, update, storage, error, success
  - Auto-dismiss timers, mark read, clear all
- **`lib/notifications.ts`** — State management pub/sub
  - `Notificacao` interface, `addNotification`, `subscribe`, `autoDismiss`
- **Triggers:** sync sucesso/erro, update disponível, storage >85%

### BottomNav
- Tab "Config" adicionada ao BottomNav
- Navegação `view` expandida: `'blocos' | 'apartamentos' | 'captura' | 'configuracoes' | 'syncQueue'`

---

## v2.5.1 (17/07/2026)

### Filtro por Data
- Date pickers no dashboard (data início/fim)
- Atalhos: Hoje, Ontem, Últimos 7 dias, Últimos 30 dias, Todos
- `lib/utils.ts` — funções de data: `formatarDataParaInput`, `obterDataInicio`, `obterDataFim`, `estaNoIntervalo`

---

## v2.5.0 (17/07/2026)

### Anotações nas Fotos (PhotoEditor)
- **`lib/drawing.ts`** — Canvas API: pen, arrow, text, `renderizarCanvas`, `obterPontoCanvas`, `paraBlob`
- **`components/PhotoEditor.tsx`** — Editor fullscreen com canvas throttled via `requestAnimationFrame`
- FotoRecord inclui `anotacoes?: AcaoDesenho[]`

### Backup Automático
- **`lib/backup.ts`** — `fazerBackupManual`, `fazerBackupAutomatico`, `obterUltimoBackup`, `deveFazerBackup`
- **`app/api/backup/route.ts`** — POST endpoint com rotação de 7 backups no Vercel Blob

---

## v2.4.0 (16/07/2026)

### Performance + Refactor
- Upload 3 fotos em paralelo (era sequencial)
- `statusDeTodosApartamentos` usa Map O(1) (era O(n²))
- `backupDados` pula base64 de fotos sincronizadas
- `restaurarDados` usa transação única IndexedDB
- `normApto` consolidado em `lib/utils.ts`
- Motion constants extraídas para `lib/motion.ts`
- CSS custom properties para dark/light themes
- `export.ts` (976 linhas) → `lib/export/{csv,pdf,xlsx,zip,utils,index}.ts`

### Refactor do page.tsx
- 6 componentes extraídos: SearchBar, FotosRecentes, AtrasadosSection, BlocosGrid, ExportSection, BottomLinks
- ESLint + Prettier configurados
- Singleton Neon connection (`lib/sql.ts`)
- Upload validation (`ALLOWED_IMAGE_TYPES`, `MAX_FILE_SIZE_BYTES`)

---

## Infraestrutura
- **GitHub:** `https://github.com/Henrique1601/Vistoria-Cyble-App.git`
- **Vercel:** `https://vistoria-cyble-app.vercel.app`
- **Neon PostgreSQL:** projeto `withered-math-93982661`, DB `neondb`
- **Vercel Blob store:** `vistoria-cyble-app-public`
- **Env vars:** `APP_PIN`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`
