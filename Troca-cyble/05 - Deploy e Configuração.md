# Deploy e Configuração

## Deploy na Vercel

### Pré-requisitos
1. Repositório no GitHub
2. Conta na Vercel

### Passos
1. Importar repositório na Vercel
2. Configurações automáticas:
   - Framework: Next.js detectado automaticamente
   - Build command: `next build`
   - Output directory: `.next`
3. **Ativar Vercel Blob:**
   - No projeto na Vercel → **Storage → Create Database → Blob**
   - Isso cria automaticamente `BLOB_READ_WRITE_TOKEN`
4. **Adicionar variável de ambiente:**
   - `APP_PIN` = PIN numérico (ex: `4821`)
5. Deploy

### Variáveis de Ambiente

| Variável               | Onde configurar     | Descrição                          |
|------------------------|---------------------|------------------------------------|
| `APP_PIN`              | Environment Variables | PIN de acesso ao app              |
| `BLOB_READ_WRITE_TOKEN`| Storage (automático) | Token do Vercel Blob              |

## Instalação no Celular (PWA)
1. Abrir link no Chrome/Safari
2. Digitar o PIN
3. "Adicionar à tela inicial" (Android) ou "Adicionar à Tela de Início" (iPhone)
4. Agora abre como app normal com ícone próprio

## Configuração Inicial (no app)
1. Primeira vez: tela de configuração pede lista de apartamentos
2. Definir quantidade de blocos (máx 20)
3. Colar apartamentos um por linha em cada bloco
4. Dados ficam salvos no IndexedDB do celular

## Comandos Úteis
```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Start (produção)
npm start

# Deploy via CLI
npx vercel
```
