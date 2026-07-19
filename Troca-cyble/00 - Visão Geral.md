# Vistoria Cyble — Visão Geral

## O que é
PWA (Progressive Web App) para celular que registra fotos da **troca de Cyble** em apartamentos, organizados por bloco. Funciona **offline** — fotos ficam no IndexedDB até ter internet, depois sincronizam sozinhas para o Vercel Blob.

## Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Linguagem:** TypeScript 5.5
- **UI:** React 18.3 + Framer Motion
- **Armazenamento local:** IndexedDB via `idb` (v2 —FotoRecord com `anotacoes`, `gps`, `nota`)
- **Armazenamento nuvem:** Vercel Blob (`@vercel/blob`) + Neon PostgreSQL
- **Fonts:** Space Grotesk (display), IBM Plex Mono (mono), Inter (body)
- **Deploy:** Vercel (auto-deploy do GitHub)
- **Versão atual:** 3.0.0

## Funcionalidades
1. **PIN de acesso** — autenticação simples via variável de ambiente `APP_PIN` (4821)
2. **Configuração de blocos** — cadastro de apartamentos por bloco (8 torres A–H, ~1280 aptos)
3. **Captura de fotos** — 3 categorias: Cyble Antes, Cyble Depois (multi), Documento
4. **Status visual** — bolinhas verdes/amarelas mostram progresso por apartamento
5. **Busca** — filtrar apartamentos por número (global e por bloco)
6. **Offline-first** — funciona sem internet, sincroniza automaticamente
7. **PWA instalável** — ícone próprio, tela standalone, atalhos
8. **Exportação** — PDF, XLSX, CSV, ZIP (com fotos), PDF com fotos embutidas
9. **Compartilhar** — Web Share API (WhatsApp, email, etc)
10. **Dashboard** — progresso por torre, estatísticas, período, atrasados
11. **Modo escaneamento** — captura rápida contínua com feedback visual
12. **Tema** — Dark/Light/Auto (alternância automática 18h–6h)
13. **Backup/Restore** — exportar/importar IndexedDB completo
14. **GPS** — geolocalização automática por foto
15. **Anotações** — desenho/texto livre nas fotos (PhotoEditor)
16. **Notas por foto** — campo de texto em cada foto
17. **Onboarding** — tour guiado de 5 passos
18. **Notificações** — sino com badge, auto-dismiss, pub/sub
19. **Configurações** — tema, qualidade foto, itens por página, dias alerta, backup agendado
20. **Fila de sync** — status individual, retry, backoff exponencial, filtros
21. **Relatório por torre** — painel lateral com stats detalhadas
22. **Modo Multi-Foto** — manter câmera aberta para captura contínua
23. **Compartilhar Relatório** — link público via Vercel Blob (7 dias)
24. **Backup Agendado** — backup periódico automático configurável
25. **Timer de Escaneamento** — tempo por apto via timestamps das fotos

## Fluxo Principal
```
PIN → Selecionar Bloco → Selecionar Apartamento → Tirar Fotos → Sincronizar
PIN -> 4821 
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
