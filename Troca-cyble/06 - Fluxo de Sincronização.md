# Fluxo de Sincronização

## Visão Geral
O app funciona offline-first. Fotos são salvas no IndexedDB local e sincronizadas automaticamente quando há conexão.

## Diagrama de Fluxo

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Captura    │────→│  IndexedDB   │────→│  Upload     │
│  (Câmera)   │     │  (blob local)│     │  (Vercel)   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  Tentar      │
                    │  Sincronizar │
                    │  (loop 15s)  │
                    └──────────────┘
```

## Detalhes do Loop de Sincronização

### Trigger 1: Timer (a cada 15 segundos)
```javascript
const interval = setInterval(tentarSincronizar, 15000);
```

### Trigger 2: Volta online
```javascript
window.addEventListener('online', on); // on → tentarSincronizar()
```

### Trigger 3: Após salvar foto
```javascript
onFotoSalva={() => { refreshStatus(); tentarSincronizar(); }}
```

## Algoritmo `tentarSincronizar()`
1. Verificar se está online (`navigator.onLine`)
2. Verificar se tem PIN configurado
3. Buscar fotos pendentes (`fotosPendentes()` — synced=false)
4. Para cada foto pendente:
   - Criar FormData com arquivo e metadados
   - POST para `/api/upload` com header `x-app-pin`
   - Se OK → `marcarSincronizada(id, url)`
   - Se erro → parar (não tenta as próximas)
5. Atualizar status e pendentes

## Service Worker (`public/sw.js`)
- **Cache:** `vistoria-shell-v1`
- **Estratégia:** Network-first, fallback to cache
- **Escopo:** Apenas requests GET (shell do app)
- **Fotos:** NUNCA passam pelo SW — vão direto pro IndexedDB

## Cenários

### Online (ideal)
```
Foto → IndexedDB → tentarSincronizar() → Upload → Marca como synced
```

### Offline (subsolo)
```
Foto → IndexedDB → tentarSincronizar() → navigator.onLine=false → espera
...
Volta online → tentarSincronizar() → Upload → Marca como synced
```

### PIN errado
```
tentarSincronizar() → 401 → break (para o loop)
```
