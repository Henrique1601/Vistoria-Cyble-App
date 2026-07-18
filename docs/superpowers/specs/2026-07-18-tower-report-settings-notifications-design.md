# Design Spec: Tower Report Panel, Settings Screen, Notification Center

**Date:** 2026-07-18
**Version:** 2.6.0
**Status:** Approved

---

## Overview

Three independent features for the Vistoria Cyble app:

1. **Tower Report Panel** — Slide-in panel with detailed per-tower report
2. **Settings Screen** — Dedicated settings page with all user preferences
3. **Notification Center** — In-app notification system with bell icon and history

---

## Feature 1: Tower Report Panel

### Purpose

When a user taps a tower/bloco in the main grid, instead of just showing the apartment list, a slide-in panel from the right provides a comprehensive report for that specific tower.

### Components

#### `components/TowerReportPanel.tsx`

A full-height slide-in panel (right side) with:

**Header:**
- Tower name (e.g., "Torre A")
- Close button (X)
- Total apartments count badge

**Summary cards (2x2 grid):**
- Total aptos
- Concluidos (green)
- Em andamento (yellow)
- Pendentes (red)

**Progress section:**
- Animated progress bar with percentage
- Text: "X/Y aptos concluidos"

**Filters row:**
- Period filter: start date + end date pickers (reuse `lib/utils.ts` date functions)
- Status filter: chips for "Todos", "Concluido", "Em andamento", "Pendente"

**Apartment list:**
- Scrollable list of all apartments in the tower
- Each row shows:
  - Apartment code (e.g., "0107")
  - Status badge (colored: green/yellow/red)
  - Last inspection date (if available from online data)
  - Photo count indicator
- Click row → navigate to CapturaScreen for that apto
- Sorted by status (pending first) then by apartment number

**Export section (bottom):**
- "Exportar CSV" button — calls `exportarCSV()` filtered to this tower
- "Exportar PDF" button — calls `exportarPDF()` filtered to this tower
- "Exportar XLSX" button — calls `exportarXLSX()` filtered to this tower

### UX Behavior

- Panel slides in from right with spring animation (`x: '100%'` → `x: 0`)
- Backdrop: `bg-base/60 backdrop-blur-sm`, clicking closes panel
- Swipe down or click X to close
- Panel width: `max-w-md` (full width on mobile, constrained on desktop)
- When panel opens, main content is scroll-locked
- Panel receives tower name as prop, fetches data internally

### Data Flow

```
BlocosGrid (tower card click)
  → onTowerClick(towerName)
    → page.tsx sets state: selectedTower = towerName
      → <TowerReportPanel tower={selectedTower} onClose={...} />
        → uses existing statusMap, fotosOnlineMap, fotosCountMap from page.tsx
        → filters data for the selected tower
```

### Props

```typescript
interface TowerReportPanelProps {
  tower: string;
  status: ApartamentoStatus[];
  fotosOnline: FotoOnline[];
  fotosCountMap: Map<string, number>;
  onNavigateToApto: (bloco: string, apto: string) => void;
  onExport: (format: 'csv' | 'pdf' | 'xlsx', tower: string) => void;
  onClose: () => void;
}
```

---

## Feature 2: Settings Screen

### Purpose

Dedicated settings page accessible from the "Config" tab in BottomNav. Replaces the current behavior where Config tab does nothing.

### Components

#### `app/configuracoes/ConfiguracoesClient.tsx`

A scrollable settings page with sections:

**Section: Aparencia**
- Theme selector: Dark / Light / Auto
  - Three toggle buttons with icons (Moon / Sun / CircleHalf)
  - Current selection highlighted with accent color
  - Persists to `localStorage.vistoria_theme` (already works via `lib/theme.tsx`)

**Section: Captura**
- Photo quality selector: 50% / 75% / 90%
  - Three toggle buttons
  - Default: 75%
  - Persists to `localStorage.vistoria_qualidade_foto`
  - Used by `comprimirImagem()` in `lib/db.ts`
- Scan mode default: On / Off
  - Persists to `localStorage.vistoria_scan_mode`

**Section: Dados**
- "Dias para alerta" — number input (1-90), default 7
  - Persists to `localStorage.vistoria_dias_alerta`
- "Itens por pagina" — selector: 10 / 20 / 50 / Todos
  - Persists to `localStorage.vistoria_itens_pagina`
- "Limpar fotos locais" — red button, confirmation dialog
  - Calls `indexedDB.clear('fotos')` and `indexedDB.clear('syncLog')`
- "Limpar tudo" — red button, double confirmation dialog
  - Clears all IndexedDB data + localStorage
- "Exportar backup" — calls `fazerBackupManual()`
- "Importar backup" — file picker, calls `restaurarDados()`

**Section: Segurança**
- "Alterar PIN" — current PIN input + new PIN input + confirm
  - Validates current PIN against server
  - Updates `APP_PIN` on server (or stores locally if server-side not available)
  - For now: just show current PIN display (not changeable without server endpoint)

**Section: Sobre**
- App version: "2.6.0"
- Storage usage: progress bar with "X MB de Y MB (Z%)"
  - Uses `checarEspacoStorage()` from `lib/db.ts`
- Link: "Ver no GitHub" → opens repo URL
- Last backup: timestamp display

### Navigation

- BottomNav "Config" tab → sets view to `'configuracoes'`
- `page.tsx` renders `<ConfiguracoesClient />` when `view === 'configuracoes'`
- Back button in header returns to previous view

### Storage Keys

| Key | Default | Type |
|-----|---------|------|
| `vistoria_qualidade_foto` | `'75'` | `'50'\|'75'\|'90'` |
| `vistoria_scan_mode` | `'false'` | `'true'\|'false'` |
| `vistoria_dias_alerta` | `'7'` | string (number) |
| `vistoria_itens_pagina` | `'20'` | `'10'\|'20'\|'50'\|'999'` |

---

## Feature 3: Notification Center

### Purpose

In-app notification system that shows alerts for sync, backup, updates, and errors. No push notifications — purely within the app session.

### Components

#### `components/NotificationCenter.tsx`

Bell icon with badge in the header bar:

**Trigger:**
- Bell icon (Phosphor `Bell` icon) in the main header (next to theme toggle)
- Badge shows count of unread notifications (red circle with number)
- Click opens dropdown panel

**Dropdown panel:**
- Header: "Notificacoes" + "Limpar todas" button
- Scrollable list of notifications (max 20 visible)
- Each notification row:
  - Icon (type-specific)
  - Message text
  - Relative time ("2min atras", "1h atras")
  - Unread dot indicator
- Click notification → navigates to relevant action (if applicable)
- Empty state: "Nenhuma notificacao"

### Notification Types

```typescript
interface Notificacao {
  id: string;
  tipo: 'sync' | 'backup' | 'update' | 'storage' | 'error' | 'success';
  titulo: string;
  mensagem: string;
  timestamp: number;
  lida: boolean;
  acao?: () => void; // callback when clicked
}
```

| Event | Tipo | Titulo | Auto-dismiss |
|-------|------|--------|-------------|
| Sync completed | `success` | "Sincronizado" | 5s |
| Sync failed | `error` | "Erro na sincronizacao" | manual |
| Backup done | `success` | "Backup concluido" | 5s |
| Update available | `update` | "Atualizacao disponivel" | manual |
| Storage >85% | `storage` | "Armazenamento quase cheio" | manual |
| Photo saved | `success` | "Foto salva" | 3s |

### State Management

```typescript
// lib/notifications.ts
let notifications: Notificacao[] = [];
let listeners: Set<() => void> = new Set();

export function addNotification(n: Omit<Notificacao, 'id' | 'timestamp' | 'lida'>) { ... }
export function markAsRead(id: string) { ... }
export function clearAll() { ... }
export function getNotifications(): Notificacao[] { ... }
export function subscribe(listener: () => void): () => void { ... }
export function getUnreadCount(): number { ... }
```

Simple pub/sub pattern — no external state library needed.

### Integration Points

| Location | Trigger |
|----------|---------|
| `page.tsx` `tentarSincronizar()` | After sync batch completes (success or error) |
| `lib/backup.ts` `fazerBackupManual()` | After backup upload succeeds |
| `lib/backup.ts` `fazerBackupAutomatico()` | After auto-backup succeeds |
| `app/page.tsx` `checkVersion()` | When SW detects new version |
| `app/page.tsx` `checarEspacoStorage()` | When storage > 85% |
| `app/CapturaScreen.tsx` `handleEditorSalvar()` | After photo saved successfully |

### Header Integration

The bell icon goes in the main header bar of `page.tsx`, next to the existing theme toggle button. When there are unread notifications, a small red badge appears on the bell.

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `components/TowerReportPanel.tsx` | Slide-in tower report panel |
| `app/configuracoes/page.tsx` | Settings page server wrapper |
| `app/configuracoes/ConfiguracoesClient.tsx` | Settings page client component |
| `components/NotificationCenter.tsx` | Bell icon + dropdown notifications |
| `lib/notifications.ts` | Notification state management (pub/sub) |
| `lib/settings.ts` | Settings persistence helpers (get/set for all localStorage keys) |

### Modified Files

| File | Changes |
|------|---------|
| `app/page.tsx` | Add `view: 'configuracoes'`, tower click handler, notification bell in header, integrate notifications into sync/backup |
| `components/BottomNav.tsx` | Config tab navigates to configuracoes view |
| `components/BlocosGrid.tsx` | Tower card click calls `onTowerClick` prop |
| `lib/db.ts` | `comprimirImagem()` reads quality from settings |
| `app/CapturaScreen.tsx` | Fire notification after photo save |

### Deleted Files

None.

---

## Implementation Order

1. **Phase 1: Settings Screen** (foundation — other features depend on settings)
   - Create `lib/settings.ts`
   - Create `lib/notifications.ts`
   - Create `app/configuracoes/` page
   - Update `page.tsx` view routing
   - Update `BottomNav.tsx`
   - Persist `diasAlerta`, `itensPagina`, `qualidadeFoto`

2. **Phase 2: Notification Center** (needed by other features for feedback)
   - Create `components/NotificationCenter.tsx`
   - Add bell icon to header
   - Wire up notification triggers

3. **Phase 3: Tower Report Panel** (uses settings + notifications)
   - Create `components/TowerReportPanel.tsx`
   - Update `BlocosGrid.tsx` with click handler
   - Wire up exports filtered by tower
