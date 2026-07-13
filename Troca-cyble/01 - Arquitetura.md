# Arquitetura do Projeto

## Diagrama de Componentes

```
┌─────────────────────────────────────────┐
│              layout.tsx                  │
│  (fonts, metadata, SwRegister)          │
├─────────────────────────────────────────┤
│              page.tsx (Home)            │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ PinGate  │→│ Setup    │→│ Captura │ │
│  │          │ │ Screen   │ │ Screen  │ │
│  └──────────┘ └──────────┘ └─────────┘ │
├─────────────────────────────────────────┤
│           lib/db.ts (IndexedDB)         │
├─────────────────────────────────────────┤
│         api/upload + api/status         │
├─────────────────────────────────────────┤
│          Vercel Blob Storage            │
└─────────────────────────────────────────┘
```

## Camadas

### 1. Apresentação (React Components)
- **PinGate** — Tela de login com PIN
- **SetupScreen** — Cadastro inicial de blocos/apartamentos
- **CapturaScreen** — Interface de captura de fotos
- **Home (page.tsx)** — Gerencia estado global, navegação entre telas

### 2. Persistência Local
- **lib/db.ts** — Abstração sobre IndexedDB
  - Store `fotos` — fotos capturadas (blob binário)
  - Store `config` — lista de blocos/apartamentos e PIN

### 3. API (Server-side)
- **POST /api/status** — Valida PIN
- **POST /api/upload** — Upload de foto para Vercel Blob

### 4. Sincronização
- **TentarSincronizar()** no page.tsx — loop a cada 15s + quando volta online
- Service Worker (`public/sw.js`) — cache do shell, não intercepta POSTs

## Padrões de Estado
- **PIN:** localStorage (`vistoria_pin`) + validação via API
- **Lista de aptos:** IndexedDB → carregada no mount → `useState`
- **Status:** calculado a partir das fotos no IndexedDB
- **View:** finite state machine (`blocos` → `apartamentos` → `captura`)

## Decisões de Arquitetura
1. **Offline-first** —IndexedDB é a fonte de verdade, Blob é backup
2. **Service Worker mínimo** — apenas cache de shell, fotos nunca passam pelo SW
3. **PIN client-side** — validado na API mas guardado no localStorage
4. **Sem banco relacional** —IndexedDB é suficiente para dados locais do usuário
