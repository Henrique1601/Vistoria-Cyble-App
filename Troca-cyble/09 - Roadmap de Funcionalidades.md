# Roadmap de Funcionalidades

## Status
- ⬜ Pendente
- 🟡 Em andamento
- ✅ Concluído

---

## v3.5.0 (02/08/2026)

### ✅ Google Drive Backup
- Integração completa com Google Drive API (gapi + OAuth2)
- Botão "Conectar ao Google Drive" no painel de configurações
- Upload de backup JSON para o Drive
- Listagem de backups existentes
- Client ID real configurado

### ✅ Documentação Sincronizada
- Regras de sincronização Obsidian/README no AGENTS.md
- Todos os docs atualizados

---

## v3.4.1 (31/07/2026)

### ✅ Bug Fixes
- Blur detect timeout (5s) no mobile
- Compressão imagem OffscreenCanvas fallback
- Input reset para re-abrir galeria
- Scroll-to-top ao trocar de view
- CommentsModal integrado na view apartamentos
- Photo error handling com toast

---

## v3.4.0 (31/07/2026)

### ✅ StatusScreen
- Tela de status do sistema (API latency, storage, sync stats, tower progress)
- Acessível via Config > Sobre > "Ver Status"

### ✅ Global Error Boundary
- `app/global-error.tsx` com tema hardcoded, retry + reload

### ✅ Keyboard Shortcuts Hook
- `hooks/useKeyboardShortcuts.ts` — hook genérico + `buildMainShortcuts()`

### ✅ CommentsModal
- Modal de comentários por apartamento com ConfirmDialog

### ✅ ConfirmDialog Melhorias
- Variants danger/warning, integrado em AgendaScreen + CommentsModal

### ✅ Toasts Melhorias
- Toast ao favoritar (AptoCard), toast add/delete (CommentsModal)

### ✅ Shimmer Skeleton
- Animação de shimmer nos skeleton cards da galeria

### ✅ SEO
- OpenGraph, Twitter meta tags, robots.txt, manifest.json atualizado

### ✅ API Version
- `/api/version` endpoint para SW auto-update

---

## v3.3.0 (25/07/2026)

### ✅ PDF Personalizado
### ✅ Export JSON
### ✅ Backup Automático
### ✅ Filtro por Status
### ✅ Tutorial Interativo (7 passos)
### ✅ Notificações Push
### ✅ Auto-retry Falhas

---

## v3.2.0 (25/07/2026)

### ✅ Glassmorphism
### ✅ Swipe Actions
### ✅ Skeleton Premium
### ✅ Double-tap Favoritar
### ✅ Alto Contraste
### ✅ Filtros Sticky
### ✅ Gradientes Temáticos
### ✅ Ícones Animados
### ✅ Exportar Pendentes
### ✅ Skeleton Resolução
### ✅ Security Hardening
### ✅ ProgressToast

---

## v3.1.0 (24/07/2026)

### ✅ Agenda/Scheduling System
### ✅ Importar Fotos
### ✅ Drag-and-Drop
### ✅ Haptic Feedback
### ✅ Empty States
### ✅ Watermark

---

## v3.0.0 (18/07/2026)

### ✅ Modo Multi-Foto
### ✅ Compartilhar Relatório
### ✅ Backup Agendado
### ✅ Timer de Escaneamento

---

## Backlog / Brainstorm

> Itens abaixo ainda NÃO foram implementados.

### 📱 Touch e Gestos
- ⬜ Long press para ações rápidas (menu contextual)
- ✅ Swipe actions nos cards (abrir/marcar concluído)
- ✅ Double tap para favoritar

### 📊 Feedback Visual
- ✅ BottomNav com badge animado (pulse)
- ⬜ Header colapsável ao scrollar
- ⬜ Confetti maior ao completar bloco inteiro
- ⬜ Status dots com glow animado

### 🌙 Temas e Personalização
- ⬜ Temas personalizáveis (3-4 paletas)
- ✅ Modo alto contraste (sol forte)
- ⬜ Modo uma mão
- ⬜ Widgets do celular

### 🤖 Inteligência
- ⬜ Sugestão automática de aptos atrasados
- ⬜ Identificação de foto duplicada
- ⬜ Análise de qualidade da foto (blur detect parcial)
- ⬜ Relatório automático diário

### 👥 Multi-usuário
- ⬜ Login com email/senha
- ⬜ Progresso compartilhado (banco central)
- ⬜ Permissões por usuário
- ⬜ Histórico de ações por usuário

### 🎮 Gamificação
- ⬜ Conquistas (primeiro apto, 100% torre, etc)
- ⬜ Ranking de progresso
- ⬜ Streak de dias trabalhados

### 📊 Analytics
- ✅ Dashboard de produtividade
- ✅ Tempo médio por apto
- ✅ Comparativo entre torres
- ⬜ Exportação de métricas

### 🔧 Melhorias Técnicas
- ✅ Virtualizar lista de aptos com @tanstack/react-virtual
- ✅ Wire keyboard shortcuts no page.tsx
- ⬜ Background Sync via SW (self.registration.sync)
- ⬜ Undo em operações bulk (marcar todos docs OK)
- ⬜ IndexedDB schema validation com zod
- ⬜ CSRF protection nas API routes
- ⬜ Sentry/LogRocket error monitoring
- ⬜ Testes (Vitest + React Testing Library)
- ⬜ Google Drive backup (OAuth integration)

---

## Notas
- Todas as funcionalidades são independentes (podem ser implementadas em qualquer ordem)
- Não dependem de novas APIs externas
- Mantêm o character offline-first do app
- Cada feature pode ser commitada e deployada separadamente
