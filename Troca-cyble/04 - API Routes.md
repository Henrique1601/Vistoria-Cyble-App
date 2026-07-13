# API Routes

## POST `/api/status`
Valida se o PIN informado está correto.

**Request:**
```json
{ "pin": "4821" }
```

**Response:**
```json
{ "ok": true }   // ou { "ok": false }
```

**Código:** `app/api/status/route.ts` (7 linhas)
- Compara `pin` do body com `process.env.APP_PIN`

---

## POST `/api/upload`
Faz upload de uma foto para o Vercel Blob.

**Headers:**
- `x-app-pin`: PIN de autenticação

**Body (FormData):**
| Campo        | Tipo   | Descrição                    |
|--------------|--------|------------------------------|
| `file`       | File   | Arquivo de imagem            |
| `bloco`      | string | Nome do bloco                |
| `apartamento`| string | Código do apartamento        |
| `categoria`  | string | Tipo da foto                 |
| `timestamp`  | string | Timestamp da captura         |

**Response (200):**
```json
{
  "url": "https://blob.vercel-storage.com/vistorias/bloco-1/apto-101/cyble_antes-1234567890.jpg",
  "path": "vistorias/bloco-1/apto-101/cyble_antes-1234567890.jpg"
}
```

**Erros:**
- `401` — PIN inválido ou não configurado
- `400` — Campos faltando

**Path no Blob:**
```
vistorias/bloco-{bloco}/apto-{apartamento}/{categoria}-{timestamp}.{ext}
```

**Variáveis de ambiente necessárias:**
- `APP_PIN` — PIN de acesso
- `BLOB_READ_WRITE_TOKEN` — Token do Vercel Blob (criado automaticamente)
