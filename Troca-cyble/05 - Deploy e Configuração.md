# Deploy e Configuração

## Deploy na Vercel

### Pré-requisitos
1. Repositório no GitHub
2. Conta na Vercel
3. Conta no Neon PostgreSQL

### Passos
1. Importar repositório na Vercel
2. Configurações automáticas:
   - Framework: Next.js detectado automaticamente
   - Build command: `next build`
   - Output directory: `.next`
3. **Ativar Vercel Blob:**
   - No projeto na Vercel → **Storage → Create Database → Blob**
   - Isso cria automaticamente `BLOB_READ_WRITE_TOKEN`
4. **Configurar Neon PostgreSQL:**
   - Criar projeto no Neon
   - Criar database `neondb`
   - Copiar connection string para `DATABASE_URL`
5. **Adicionar variáveis de ambiente** (ver tabela abaixo)
6. Deploy

### Variáveis de Ambiente

| Variável                 | Onde configurar       | Descrição                          |
|--------------------------|-----------------------|------------------------------------|
| `ADMIN_PIN`              | Environment Variables | PIN de administrador (acesso total)|
| `VIEWER_PIN`             | Environment Variables | PIN de visualizador (read-only)    |
| `APP_PIN`                | Environment Variables | Legado (funciona como admin)       |
| `BLOB_READ_WRITE_TOKEN`  | Storage (automático)  | Token do Vercel Blob              |
| `DATABASE_URL`           | Environment Variables | Connection string do Neon PostgreSQL|
| `BLOB_STORE_ID`          | Environment Variables | ID do Blob store                   |
| `BLOB_WEBHOOK_PUBLIC_KEY`| Environment Variables | Chave pública do webhook           |

## Instalação no Celular (PWA)
1. Abrir link no Chrome/Safari
2. Digitar o PIN (Admin ou Viewer)
3. "Adicionar à tela inicial" (Android) ou "Adicionar à Tela de Início" (iPhone)
4. Agora abre como app normal com ícone próprio

## Configuração Inicial (no app)
1. Primeira vez: tela de configuração pede lista de apartamentos
2. 3 modos: Manual (colar lista), Importar (arquivo .txt), Nuvem (buscar do Neon)
3. Definir quantidade de blocos (máx 20)
4. Colar apartamentos um por linha em cada bloco
5. Dados ficam salvos no IndexedDB do celular

## Comandos Úteis
```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Format
npm run format

# Start (produção)
npm start

# Deploy via CLI
npx vercel
```

## Neon PostgreSQL

### Tabelas
- `fotos` — metadados de fotos online (bloco, apartamento, categoria, url, etc)
- `concluidos` — status de conclusão por apartamento
- `building_config` — configuração de prédios (JSONB)
- `agendamentos` — agendamentos de vistoria

### Branches
- `main` — branch de produção
- Branches temporárias para migrações (criadas e deletadas automaticamente)

## Limitações Conhecidas
- Trocar celular antes de sincronizar tudo = perda de fotos (usar Backup/Restore)
- Cada dispositivo tem IndexedDB independente (sem sync entre aparelhos)
- Sem paginação na lista (~180 aptos por bloco funciona bem)
- Vercel Blob: 1GB free tier (suficiente para ~5000 fotos)
