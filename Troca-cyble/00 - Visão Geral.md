# Vistoria Cyble — Visão Geral

## O que é
PWA (Progressive Web App) para celular que registra fotos da **troca de Cyble** em apartamentos, organizados por bloco. Funciona **offline** — fotos ficam no IndexedDB até ter internet, depois sincronizam sozinhas para o Vercel Blob.

## Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Linguagem:** TypeScript 5.5
- **UI:** React 18.3 + Framer Motion + Tailwind CSS
- **Armazenamento local:** IndexedDB via `idb` (v3 —FotoRecord com `anotacoes`, `gps`, `nota`, `capturedAt`)
- **Armazenamento nuvem:** Vercel Blob (`@vercel/blob`) + Neon PostgreSQL
- **Ícones:** @phosphor-icons/react
- **Drag-and-drop:** @dnd-kit/core + @dnd-kit/sortable
- **Exportação:** jspdf, xlsx, jszip
- **Fonts:** Space Grotesk (display), IBM Plex Mono (mono), Inter (body)
- **Deploy:** Vercel (auto-deploy do GitHub)
- **Versão atual:** 3.2.0

## Sistema de PIN
- **`ADMIN_PIN`** — Acesso total: editar, excluir fotos, selecionar múltiplas, agendar, configurar
- **`VIEWER_PIN`** — Apenas visualizar fotos, sem editar nem excluir (read-only)
- **`APP_PIN`** — Legado, funciona como admin para compatibilidade

## Funcionalidades (84+ implementadas)

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
12. **Exportação** — PDF, XLSX, CSV, ZIP (com fotos), PDF com fotos embutidas
13. **Compartilhar** — Web Share API (WhatsApp, email, etc)
14. **Compartilhar Relatório** — link público via Vercel Blob (7 dias)
15. **Relatório HTML** — relatório standalone com thumbnails embutidos

### Interface
16. **Dashboard** — progresso por torre, estatísticas, período, atrasados
17. **Modo escaneamento** — captura rápida contínua com feedback visual e sonoro
18. **Tema** — Dark/Light/Auto (alternância automática 18h–6h)
19. **Onboarding** — tour guiado de 5 passos
20. **Notificações** — sino com badge animado (ring bell), auto-dismiss, pub/sub
21. **Configurações** — tema, qualidade foto, itens por página, dias alerta, backup agendado
22. **Relatório por torre** — painel lateral com stats detalhadas
23. **Mapa de Progresso (Heatmap)** — grid colorido por torre
24. **Empty States** — ilustrações quando vazio

### UI Premium (v3.2.0)
40. **Glassmorphism** — BottomNav e painéis com `backdrop-blur` semitransparente
41. **Swipe actions** — deslizar cards para Abrir (direita) ou Concluir (esquerda) com gestos touch
42. **Skeleton premium** — shimmer animation + resolução cascata (top-to-bottom) via `clip-path`
43. **Double-tap favoritar** — toque duplo (<300ms) alterna estrela amarela (persistido em localStorage)
44. **Alto contraste** — tema saturado (laranja/verde/texto branco), toggle no filter bar
45. **Filtros sticky** — barra de busca e filtros fixam no topo ao rolar
46. **Gradientes temáticos** — cards com gradiente sutil baseado no status (concluído/em andamento)
47. **Ícones animados** — sino oscilante com notificações, sync spinner no SyncBanner
48. **Exportar pendentes** — toggle "Pendentes" no export exclui aptos concluídos
49. **Skeleton resolução** — animação cascata de resolução para estados de loading premium

### Fotos
25. **Modo Multi-Foto** — manter câmera aberta para captura contínua
26. **GPS** — geolocalização automática por foto
27. **Anotações** — desenho/texto livre nas fotos (PhotoEditor)
28. **Notas por foto** — campo de texto em cada foto
29. **Águas (Watermark)** — marca d'água nas fotos exportadas
30. **Importar Fotos** — importação em lote de pastas

### Organização
31. **Agenda/Scheduling** — criar, editar, excluir agendamentos de vistoria
32. **Quick Schedule** — agendamento rápido modal
33. **Timer de Escaneamento** — tempo por apto via timestamps das fotos
34. **Audit Log** — registro de todas as ações do usuário

### Exportação Avançada (v3.3.0)
50. **PDF personalizado** — logo, cores de destaque, rodapé customizável via `PDFTemplate`
51. **Export JSON** — backup estruturado com version/summary/apartments
52. **Backup automático** — timer configurável (30min/1h/6h/24h) via `startAutoBackup()`
53. **Filtro por status** — pills (Todos/Pendente/Andamento/Concluido) com cores

### Experiência (v3.3.0)
54. **Tutorial interativo** — tour guiado de 7 passos com persistencia em localStorage
55. **Notificações push** — `requestNotificationPermission()` + fallback in-app
56. **Auto-retry falhas** — retry automático de itens pendentes após 30s offline

### Segurança
35. **Security Hardening** — `lib/auth.ts` (server-side) + `lib/api.ts` (client-side)
36. **PIN auth em todas as rotas** — requireAdmin para mutations, requireAnyPin para reads

### Acessibilidade
37. **Touch targets 44px** — BottomNav e botões do header com tamanho mínimo acessível
38. **Haptic feedback** — vibração em ações importantes
39. **Drag-and-drop** — reordenação de fotos com @dnd-kit

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
