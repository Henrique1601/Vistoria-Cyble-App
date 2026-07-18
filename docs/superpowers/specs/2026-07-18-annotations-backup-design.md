# Design: Photo Annotations & Auto Backup

**Date:** 2026-07-18
**Status:** Approved

## 1. Photo Annotations

### User Flow
1. User captures/selects photo
2. Photo editor opens (fullscreen modal)
3. User annotates with pen, arrow, or text
4. Saves → annotated photo stored in IndexedDB
5. Can edit later (tap photo → reopens editor)

### Components
- `components/PhotoEditor.tsx` — Canvas editor with 3 tools
- `lib/drawing.ts` — Drawing logic (pen, arrow, text)

### Implementation
- Native Canvas API (zero dependencies)
- Layer system: background image + annotations
- Touch-friendly: 44px min touch targets
- Undo/redo with action stack

### Interface
- Top bar: Pen, Arrow, Text, Colors, Undo, Save, Cancel
- Fullscreen canvas with zoom/pan
- Touch-optimized controls

### Data Structure
```ts
interface FotoRecord {
  // ... existing fields
  anotacoes?: Array<{
    tipo: 'caneta' | 'seta' | 'texto';
    dados: unknown;
  }>;
}
```

## 2. Auto Backup

### User Flow
1. **Manual:** Tap "Backup" → generates JSON → upload Vercel Blob + auto download
2. **Automatic:** Runs 1x/day (18:00 or when app opens after 24h without backup)
3. **Status:** Last backup shown in settings panel

### Components
- `lib/backup.ts` — Backup logic (manual + automatic)
- `app/api/backup/route.ts` — Vercel Blob upload endpoint

### Implementation
- Read IndexedDB → generate JSON (existing `backupDados()`)
- Upload to Vercel Blob: `v2/backup/{userId}/{timestamp}.json`
- Local download of same JSON
- Save last backup timestamp in config store

### Auto-cleanup
- Keep last 7 backups in Vercel Blob
- Delete older backups automatically

### Interface
- "Backup" button in settings
- "Last backup: 18/07/2026 14:30" indicator
- Badge when backup is pending

## 3. Integration & Data Flow

### Modified Files
- `components/PhotoEditor.tsx` — NEW
- `lib/drawing.ts` — NEW
- `lib/backup.ts` — NEW (extracted from `lib/db.ts`)
- `app/api/backup/route.ts` — NEW
- `app/CapturaScreen.tsx` — Modified (opens editor)
- `lib/db.ts` — Modified (FotoRecord + backup separated)
- `components/BottomLinks.tsx` — Modified (backup button)
