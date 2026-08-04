# Vistoria Cyble — Visão Geral

## O que é
PWA (Progressive Web App) para celular que registra fotos da **troca de Cyble** em apartamentos, organizados por bloco. Funciona **offline** — fotos ficam no IndexedDB até ter internet, depois sincronizam sozinhas para o Vercel Blob.

## Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Linguagem:** TypeScript 5.5
- **UI:** React 18.3 + Framer Motion + Tailwind CSS
- **Armazenamento local:** IndexedDB via `idb` (v4 — FotoRecord com `anotacoes`, `gps`, `nota`, `capturedAt`; stores: `notas`, `comentarios`)
- **Armazenamento nuvem:** Vercel Blob (`@vercel/blob`) + Neon PostgreSQL
- **Ícones:** @phosphor-icons/react
- **Drag-and-drop:** @dnd-kit/core + @dnd-kit/sortable
- **Exportação:** jspdf, xlsx, jszip
- **Virtualização:** @tanstack/react-virtual (disponível)
- **Fonts:** Geist (display + mono)
- **Deploy:** Vercel (auto-deploy do GitHub)
- **Versão atual:** 3.5.0

## Sistema de PIN
- **`ADMIN_PIN`** — Acesso total: editar, excluir fotos, selecionar múltiplas, agendar, configurar
- **`VIEWER_PIN`** — Apenas visualizar fotos, sem editar nem excluir (read-only)
- **`APP_PIN`** — Legado, funciona como admin para compatibilidade

## Funcionalidades (100+ implementadas)

### Core
1. **PIN de acesso** — autenticação dual (Admin/Viewer) via variáveis de ambiente
2. **Configuração de blocos** — cadastro de apartamentos por bloco (8 torres A–H, ~1280 aptos)
3. **Captura de fotos** — 3 categorias: Cyble Antes, Cyble Depois (multi), Documento
4. **Status visual** — bolinhas verdes/amarelas mostram progresso por apartamento
5. **Busca** — filtrar apartamentos por número (global e por bloco) com status dots

### Offline & Sync
6. **Offline-first** — funciona sem internet, sincroniza automaticamente
7. **PWA instalável** — ícone próprio, tela standalone, atalhos
8. **Fila de sync** — status individual, retry, backoff exponencial, filtros
9. **ProgressToast** — barra de progresso animada com shimmer durante sincronização
10. **Backup/Restore** — exportar/importar IndexedDB completo
11. **Backup Agendado** — backup periódico automático configurável (30min/1h/6h/24h)

### Exportação
12. **Exportação** — PDF, XLSX, CSV, ZIP (com fotos), PDF com fotos embutidas, JSON
13. **Compartilhar** — Web Share API (WhatsApp, email, etc)
14. **Compartilhar Relatório** — link público via Vercel Blob (7 dias)
15. **Relatório HTML** — relatório standalone com thumbnails embutidos

### Interface
16. **Dashboard** — progresso por torre, estatísticas, período, atrasados
17. **Modo escaneamento** — captura rápida contínua com feedback visual e sonoro
18. **Tema** — Dark/Light/Auto (alternância automática 18h–6h)
19. **Onboarding** — tour guiado de 7 passos com persistência em localStorage
20. **Notificações** — sino com badge animado (ring bell), auto-dismiss, pub/sub
21. **Configurações** — tema, qualidade foto, itens por página, dias alerta, backup agendado, modo compacto, alto contraste
22. **Relatório por torre** — painel lateral com stats detalhadas
23. **Mapa de Progresso (Heatmap)** — grid colorido por torre
24. **Empty States** — ilustrações quando vazio
25. **Status do Sistema** — painel com latência DB, armazenamento, stats de sync, progresso por torre

### UI Premium (v3.2.0+)
40. **Glassmorphism** — BottomNav e painéis com `backdrop-blur` semitransparente
41. **Swipe actions** — deslizar cards para Abrir (esquerda) com gestos touch
42. **Skeleton premium** — shimmer animation + resolução cascata via `.skeleton-resolve`
43. **Double-tap favoritar** — toque duplo (<300ms) alterna estrela amarela
44. **Alto contraste** — tema saturado (laranja/verde/texto branco), toggle no filter bar
45. **Filtros sticky** — barra de busca e filtros fixam no topo ao rolar
46. **Gradientes temáticos** — cards com gradiente sutil baseado no status
47. **Ícones animados** — sino oscilante com notificações, sync spinner no SyncBanner
48. **Exportar pendentes** — toggle "Pendentes" no export exclui aptos concluídos

### Fotos
25. **Modo Multi-Foto** — manter câmera aberta para captura contínua
26. **GPS** — geolocalização automática por foto
27. **Anotações** — desenho/texto livre nas fotos (PhotoEditor)
28. **Notas por foto** — campo de texto em cada foto
29. **Águas (Watermark)** — marca d'água nas fotos exportadas
30. **Importar Fotos** — importação em lote de pastas
31. **Detecção de Blur** — análise de nitidez e brilho antes/depois da captura

### Organização
32. **Agenda/Scheduling** — criar, editar, excluir agendamentos de vistoria
33. **Quick Schedule** — agendamento rápido modal
34. **Timer de Escaneamento** — tempo por apto via timestamps das fotos
35. **Audit Log** — registro de todas as ações do usuário
36. **Comentários** — modal de comentários por apartamento com contagem no card

### Exportação Avançada (v3.3.0+)
50. **PDF personalizado** — logo, cores de destaque, rodapé customizável via `PDFTemplate`
51. **Export JSON** — backup estruturado com version/summary/apartments
52. **Backup automático** — timer configurável (30min/1h/6h/24h) via `startAutoBackup()`
53. **Filtro por status** — pills (Todos/Pendente/Andamento/Concluido) com cores

### Experiência (v3.3.0+)
54. **Tutorial interativo** — tour guiado de 7 passos com persistencia em localStorage
55. **Notificações push** — `requestNotificationPermission()` + fallback in-app
56. **Auto-retry falhas** — retry automático de itens pendentes após 30s offline
57. **Comparativo de torres** — painel lado a lado com stats detalhadas
58. **Relatório por período** — filtro temporal com exportação

### Google Drive (v3.5.0)
59. **Google Drive Backup** — backup completo para o Google Drive via OAuth2
60. **Listar backups Drive** — visualizar backups existentes no Drive

### Segurança
37. **Security Hardening** — `lib/auth.ts` (server-side) + `lib/api.ts` (client-side)
38. **PIN auth em todas as rotas** — requireAdmin para mutations, requireAnyPin para reads
39. **Rate limiting** — 4 tiers (auth: 10/min, upload: 30/min, read: 120/min, write: 40/min)
40. **Input validation** — regex-based para bloco, apto, data, hora, texto
41. **File size limits** — 15MB imagens, 50MB backups, 10MB relatórios
61. **Danger Zone** — botões destrutivos protegidos com PIN admin + dupla confirmação

### Acessibilidade
42. **Touch targets 44px** — BottomNav e botões do header com tamanho mínimo acessível
43. **Haptic feedback** — vibração em ações importantes (6 padrões)
44. **Drag-and-drop** — reordenação de fotos com @dnd-kit
45. **Keyboard shortcuts** — `/` busca, `Escape` voltar, `1-8` trocar torre

### Infraestrutura
46. **Global Error Boundary** — `app/global-error.tsx` com tema hardcoded
47. **SEO** — OpenGraph, Twitter, robots.txt, manifest.json aprimorado
48. **Service Worker** — stale-while-revalidate, cache offline, push events
49. **Auto-update** — SW verifica `/api/version` e notifica sobre atualizações

## Fluxo Principal
```
PIN (Admin ou Viewer) → Selecionar Bloco → Selecionar Apartamento → Tirar Fotos → Sincronizar
```

## Links Úteis
- [[01 - Arquitetura]]
- [[02 - Estrutura de Arquivos]]
- [[03 - Banco de Dados Local]]
- [[04 - API Routes]]
- [[05 - Deploy e Configuração]]
- [[06 - Fluxo de Sincronização]]
- [[07 - Estilo e Design]]
- [[08 - Checklist de Manutenção]]
- [[09 - Roadmap de Funcionalidades]]
- [[10 - Changelog]]
