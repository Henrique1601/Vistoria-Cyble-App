# Banco de Dados Local (IndexedDB)

## Nome do Banco: `vistoria-cyble` (versão 1)

## Stores

### Store: `fotos`
Armazena as fotos capturadas como blobs binários.

| Campo       | Tipo     | Descrição                           |
|-------------|----------|-------------------------------------|
| `id`        | number   | Auto-increment key                  |
| `bloco`     | string   | Nome do bloco (ex: "Bloco 1")       |
| `apartamento` | string | Código do apartamento (ex: "101")   |
| `categoria` | Categoria | `cyble_antes` / `cyble_depois` / `documento` |
| `blob`      | Blob     | Dados binários da foto              |
| `timestamp` | number   | `Date.now()` no momento da captura  |
| `synced`    | boolean  | `true` quando enviada para o Blob   |
| `uploadUrl` | string?  | URL retornada pelo Vercel Blob      |

### Store: `config`
Armazena configurações gerais como key-value.

| Key         | Valor                              |
|-------------|------------------------------------|
| `blocos`    | `Record<string, string[]>` — mapa de blocos → array de aptos |
| `pin`       | `string` — PIN de acesso           |

## Funções da API (`lib/db.ts`)

```typescript
// Config
salvarListaApartamentos(lista)    // Salva a lista de blocos/aptos
carregarListaApartamentos()       // Retorna a lista salva
salvarPin(pin)                    // Salva o PIN
carregarPin()                     // Retorna o PIN

// Fotos
salvarFoto(rec)                   // Adiciona foto no IndexedDB
fotosDoApartamento(bloco, apto)   // Fotos de um apartamento específico
fotosPendentes()                  // Fotos não sincronizadas (synced=false)
marcarSincronizada(id, url)       // Marca foto como sincronizada
statusDeTodosApartamentos(lista)  // Status de progresso de todos os aptos
```

## Fluxo de Dados
```
Câmera → File → salvarFoto() → IndexedDB (blob local)
                                    ↓
                            tentarSincronizar()
                                    ↓
                        POST /api/upload → Vercel Blob (URL remota)
                                    ↓
                        marcarSincronizada(id, url)
```

## Limitações
- Fotos ficam no IndexedDB até sincronizar (se celular for resetado, perde)
- Sem backup local — confiamos que o sync vai acontecer
- Cada dispositivo tem sua própria IndexedDB (sem progresso compartilhado)
