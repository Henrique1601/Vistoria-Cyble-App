# API Routes

## Autenticação
Todas as rotas requerem PIN via header `x-app-pin`.

**Helpers:**
- `lib/auth.ts` — Server-side: `requireAdmin(req)`, `requireAnyPin(req)`
- `lib/api.ts` — Client-side: `getAuthHeaders()`, `authFetch()`

**Roles:**
- **Admin** (`ADMIN_PIN` ou `APP_PIN`) — acesso total (mutations + reads)
- **Viewer** (`VIEWER_PIN`) — apenas leitura (queries)

---

## POST `/api/status`
Valida se o PIN informado está correto.

**Request:** `{ "pin": "4821" }`
**Response:** `{ "ok": true }` ou `{ "ok": false }`

---

## POST `/api/upload`
Upload de foto para Vercel Blob + insert no Neon PostgreSQL. **Admin only.**

**Headers:** `x-app-pin: <admin_pin>`

**Body (FormData):**
| Campo         | Tipo   | Descrição                    |
|---------------|--------|------------------------------|
| `file`        | File   | Arquivo de imagem (max 15MB) |
| `bloco`       | string | Nome do bloco                |
| `apartamento` | string | Código do apartamento        |
| `categoria`   | string | Tipo da foto                 |
| `timestamp`   | string | Timestamp da captura         |

**Response (200):** `{ "url": "...", "path": "..." }`

**Path no Blob:** `vistorias/bloco-{bloco}/apto-{apartamento}/{categoria}-{timestamp}.{ext}`

---

## GET `/api/fotos`
Lista fotos online do Neon PostgreSQL. **Any PIN.**

**Query params:** `?bloco=X` (opcional, filtra por bloco)

---

## DELETE `/api/fotos`
Exclui foto do Vercel Blob e do Neon PostgreSQL. **Admin only.**

**Body:** `{ "path": "vistorias/...", "id": 123 }`

---

## PATCH `/api/fotos`
Atualiza metadados da foto no Neon PostgreSQL. **Admin only.**

**Body:** `{ "id": 123, "nota": "..." }`

---

## POST `/api/fotos/bulk-delete`
Exclusão em lote de fotos. **Admin only.**

**Body:** `{ "items": [{ "path": "...", "id": 123 }, ...] }`

---

## GET `/api/concluidos`
Lista apartamentos concluídos do Neon PostgreSQL. **Any PIN.**

---

## POST `/api/concluidos`
Salva/atualiza status de conclusão no Neon PostgreSQL. **Admin only.**

**Body:** `{ "concluidos": [{ "bloco": "Torre A", "apartamento": "107", "cyble_antes": true, ... }] }`

---

## GET `/api/building-config`
Busca configuração de prédios do Neon PostgreSQL. **Any PIN.**

---

## POST `/api/building-config`
Salva configuração de prédios no Neon PostgreSQL. **Admin only.**

**Body:** `{ "config": { "torres": [...], "aptosPorTorre": {...} } }`

---

## GET `/api/agendamentos`
Lista agendamentos do Neon PostgreSQL. **Any PIN.**

**Query params:** `?bloco=X` (opcional)

---

## POST `/api/agendamentos`
Cria novo agendamento. **Admin only.**

**Body:** `{ "bloco": "Torre A", "apartamento": "107", "data": "2026-07-25", "observacao": "..." }`

---

## PUT `/api/agendamentos`
Atualiza agendamento existente. **Admin only.**

**Body:** `{ "id": 123, "concluido": true, "observacao": "..." }`

---

## DELETE `/api/agendamentos`
Exclui agendamento. **Admin only.**

**Body:** `{ "id": 123 }`

---

## POST `/api/backup`
Backup do IndexedDB para Vercel Blob. **Admin only.**

**Body:** `{ "dados": {...} }`

**Response:** `{ "ok": true, "path": "backups/..." }`

---

## POST `/api/share-report`
Gera link público do relatório HTML. **Any PIN.**

**Body:** `{ "html": "<html>...</html>" }`

**Response:** `{ "ok": true, "url": "https://..." }` (expira em 7 dias)

---

## GET `/api/version`
Retorna versão do app.

**Response:** `{ "version": "3.4.1" }`

---

## Variáveis de Ambiente

| Variável                 | Onde configurar       | Descrição                          |
|--------------------------|-----------------------|------------------------------------|
| `ADMIN_PIN`              | Environment Variables | PIN de administrador (acesso total)|
| `VIEWER_PIN`             | Environment Variables | PIN de visualizador (read-only)    |
| `APP_PIN`                | Environment Variables | Legado (funciona como admin)       |
| `BLOB_READ_WRITE_TOKEN`  | Storage (automático)  | Token do Vercel Blob              |
| `DATABASE_URL`           | Environment Variables | Connection string do Neon PostgreSQL|
| `BLOB_STORE_ID`          | Environment Variables | ID do Blob store                   |
| `BLOB_WEBHOOK_PUBLIC_KEY`| Environment Variables | Chave pública do webhook           |
