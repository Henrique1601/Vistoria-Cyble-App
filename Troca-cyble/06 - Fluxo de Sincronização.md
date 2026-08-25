# Fluxo de Sincronização

## Visão Geral
O app funciona offline-first. Fotos são salvas no IndexedDB local e sincronizadas automaticamente quando há conexão. O pipeline de sincronização é **totalmente unificado** dentro de `lib/syncQueue.ts`, gerenciando concorrência (3 uploads simultâneos), retry automático com backoff exponencial, telemetria de progresso em tempo real e auditoria.

## Diagrama de Fluxo

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌─────────────┐
│  Captura    │────→│  IndexedDB   │────→│   syncQueue    │────→│  Upload     │
│  (Câmera)   │     │  (blob local)│     │  (lotes de 3)  │     │  (Vercel)   │
└─────────────┘     └──────────────┘     └───────┬────────┘     └─────────────┘
                                                 │
                                          ┌──────┴───────┐
                                          ▼              ▼
                                   ProgressToast   Neon Postgres
                                   (shimmer bar)    (metadados)
```

## Motor Unificado de Sincronização (`lib/syncQueue.ts`)

### Triggers
1. **Timer:** `setInterval(tentarSincronizar, 15000)` — a cada 15 segundos
2. **Online:** `window.addEventListener('online', tentarSincronizar)`
3. **Pós-foto:** `onFotoSalva={() => { refreshStatus(); tentarSincronizar(); }}`

### Algoritmo
1. Verificar se está online (`navigator.onLine`)
2. Verificar se tem PIN configurado
3. Verificar lock mutex (`syncLockRef`) — previne execuções concorrentes
4. Buscar fotos pendentes (`fotosPendentes()` — synced=false)
5. Se não tem pendentes → return
6. Log de auditoria (`sync_started`)
7. **Mostrar ProgressToast** com total de fotos
8. Processar em batches de 3 (`CONCURRENCY = 3`)
9. Para cada foto no batch:
   - Criar FormData com arquivo e metadados
   - POST para `/api/upload` com header `x-app-pin`
   - Se OK → `marcarSincronizada(id, url)` + `registrarSync(...)` + **atualizar progresso**
   - Se erro → `failed = true` + `registrarSync(...)` + **mostrar erro no toast**
10. Se sucesso → **ProgressToast success** + notificação no sino
11. Se falha → **ProgressToast error** + notificação de erro no sino
12. `refreshStatus()` → `statusDeTodosApartamentos()`

### ProgressToast (feedback visual)
- **Syncing:** Spinner animado + shimmer na barra + "X de Y fotos" + porcentagem
- **Success:** Check verde + "N foto(s) sincronizada(s)" + auto-dismiss 3s
- **Error:** Warning vermelho + mensagem de erro + auto-dismiss 6s

## Modern Queue (`lib/syncQueue.ts`)

### Estrutura
```typescript
interface QueueItem {
  foto: FotoRecord;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  attempts: number;
  lastError?: string;
  nextRetryAt?: number;
}
```

### Comportamento
- Upload sequencial (não paralelo)
- Max 5 tentativas por foto
- Backoff exponencial: 1s → 2s → 4s → 8s → 30s (capped)
- Sucesso: remove da fila após 3s
- UI: `SyncQueueScreen` com filtros, retry individual, cancelamento

## Service Worker (`public/sw.js`)
- **Cache:** `vistoria-shell-v4`
- **Estratégia:** Stale-while-revalidate para requests GET
- **Version check:** Compara versão do SW com `APP_VERSION`
- **Auto-update:** Se versão diferente → `skipWaiting()` + reload
- **Escopo:** Apenas requests GET (shell do app)
- **Fotos:** NUNCA passam pelo SW — vão direto pro IndexedDB

## Cenários

### Online (ideal)
```
Foto → IndexedDB → tentarSincronizar() → ProgressToast → Upload → Marca como synced → Success toast
```

### Offline (subsolo)
```
Foto → IndexedDB → tentarSincronizar() → navigator.onLine=false → espera
...
Volta online → tentarSincronizar() → ProgressToast → Upload → Marca como synced
```

### PIN errado
```
tentarSincronizar() → 401 → break (para o loop) → ProgressToast error
```

### Muitas fotos pendentes
```
ProgressToast mostra: "Sincronizando fotos... 3 de 15" → "5 de 15" → ... → "15 de 15" → Success
```
