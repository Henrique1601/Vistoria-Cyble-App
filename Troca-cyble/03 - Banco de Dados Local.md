# Banco de Dados Local (IndexedDB)

## Nome do Banco: `vistoria-cyble` (versão 4)

## Stores

### Store: `fotos`
Armazena as fotos capturadas como blobs binários.

| Campo         | Tipo       | Descrição                                    |
|---------------|------------|----------------------------------------------|
| `id`          | number     | Auto-increment key                           |
| `bloco`       | string     | Nome do bloco (ex: "Torre A")                |
| `apartamento` | string     | Código do apartamento (ex: "107")            |
| `categoria`   | Categoria  | `cyble_antes` / `cyble_depois` / `documento` |
| `blob`        | Blob       | Dados binários da foto                       |
| `timestamp`   | number     | `Date.now()` no momento da captura           |
| `synced`      | boolean    | `true` quando enviada para o Blob            |
| `uploadUrl`   | string?    | URL retornada pelo Vercel Blob               |
| `anotacoes`   | AcaoDesenho[]? | Desenhos/textos sobre a foto             |
| `gps`         | {lat, lng}? | Geolocalização da captura                   |
| `nota`        | string?    | Nota textual sobre a foto                    |
| `capturedAt`  | string?    | ISO timestamp da captura                     |

### Store: `config`
Armazena configurações gerais como key-value.

| Key         | Valor                              |
|-------------|------------------------------------|
| `blocos`    | `Record<string, string[]>` — mapa de blocos → array de aptos |
| `pin`       | `string` — PIN de acesso           |

### Store: `syncLog`
Registro de sincronizações realizadas.

| Campo        | Tipo    | Descrição                    |
|--------------|---------|------------------------------|
| `id`         | number  | Auto-increment key           |
| `timestamp`  | number  | Quando ocorreu               |
| `bloco`      | string  | Bloco da foto                |
| `apartamento`| string  | Apartamento da foto          |
| `categoria`  | string  | Tipo da foto                 |
| `url`        | string  | URL no Blob                  |
| `ok`         | boolean | Se成功 ou falhou             |
| `erro`       | string? | Mensagem de erro (se houve)  |

### Store: `auditLog`
Registro de ações do usuário.

| Campo       | Tipo    | Descrição                          |
|-------------|---------|------------------------------------|
| `id`        | number  | Auto-increment key                 |
| `action`    | string  | Tipo da ação (photo_captured, etc) |
| `detail`    | string  | Descrição da ação                  |
| `timestamp` | number  | Quando ocorreu                     |

### Store: `agendamentos`
Agendamentos de vistoria.

| Campo         | Tipo    | Descrição                    |
|---------------|---------|------------------------------|
| `id`          | number  | Auto-increment key           |
| `bloco`       | string  | Bloco                        |
| `apartamento` | string  | Apartamento                  |
| `data`        | string  | Data agendada (ISO)          |
| `concluido`   | boolean | Se já foi feito              |
| `observacao`  | string? | Observação                   |
| `criado_em`   | string  | Data de criação              |

### Store: `notas` (v4 — NOVO)
Notas por foto, indexadas por bloco+apartamento.

| Campo         | Tipo    | Descrição                    |
|---------------|---------|------------------------------|
| `id`          | number  | Auto-increment key           |
| `bloco`       | string  | Bloco                        |
| `apartamento` | string  | Apartamento                  |
| `fotoId`      | number  | Referência ao id da foto     |
| `nota`        | string  | Texto da nota                |
| `criado_em`   | string  | Data de criação              |

**Index:** `by-bloco-apto` (compound: bloco + apartamento) — lookups rápidos por apto

### Store: `comentarios` (v4 — NOVO)
Comentários por apartamento, indexados por bloco+apartamento.

| Campo         | Tipo    | Descrição                    |
|---------------|---------|------------------------------|
| `id`          | number  | Auto-increment key           |
| `bloco`       | string  | Bloco                        |
| `apartamento` | string  | Apartamento                  |
| `texto`       | string  | Texto do comentário          |
| `autor`       | string? | Quem escreveu (opcional)     |
| `criado_em`   | string  | Data de criação              |

**Index:** `by-bloco-apto` (compound: bloco + apartamento) — lookups rápidos por apto

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
excluirFoto(id)                   // Remove foto do IndexedDB
atualizarNota(id, nota)           // Atualiza nota da foto
atualizarAnotacoes(id, anotacoes) // Atualiza anotações/desenhos
obterTodasFotos()                 // Retorna todas as fotos (para exportação)

// Status
statusDeTodosApartamentos(lista)  // Status de progresso de todos os aptos
                                  // Retorna Map O(1) para lookups rápidos

// Concluidos (sincronizado com Neon)
salvarConcluidos(lista)           // Salva locally
carregarConcluidos()              // Carrega locally
limparConcluidos()                // Limpa local
syncConcluidosToAPI(pin)          // Sincroniza com Neon (com lock mutex)
marcarTodosDocsOK(bloco, aptos)   // Marca docs de todos aptos como OK

// Sync
registrarSync(log)                // Registra sync no syncLog store
ultimasFotos(n)                   // Últimas N fotos sincronizadas

// Backup
backupDados()                     // Exporta todo o IndexedDB
restaurarDados(dados)             // Importa dados para o IndexedDB
checarEspacoStorage()             // Verifica espaço disponível

// Agendamentos
criarAgendamento(dados)           // Cria novo agendamento
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
                        registrarSync(...)
                                    ↓
                        refreshStatus() → statusDeTodosApartamentos()
                                    ↓
                        syncConcluidosToAPI() → Neon PostgreSQL
```

## Limitações
- Fotos ficam no IndexedDB até sincronizar (se celular for resetado, perde)
- Backup/Restore disponível para mitigar perda
- Cada dispositivo tem sua própria IndexedDB (sem progresso compartilhado)
- Sync com Neon via `syncConcluidosToAPI()` (não bidirecional)
