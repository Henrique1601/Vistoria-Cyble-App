# Vistoria Cyble — Visão Geral

## O que é
PWA (Progressive Web App) para celular que registra fotos da **troca de Cyble** em apartamentos, organizados por bloco. Funciona **offline** — fotos ficam no IndexedDB até ter internet, depois sincronizam sozinhas para o Vercel Blob.

## Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Linguagem:** TypeScript 5.5
- **UI:** React 18.3
- **Armazenamento local:** IndexedDB via `idb`
- **Armazenamento nuvem:** Vercel Blob (`@vercel/blob`)
- **Fonts:** Space Grotesk (display), IBM Plex Mono (mono), Inter (body)
- **Deploy:** Vercel

## Funcionalidades
1. **PIN de acesso** — autenticação simples via variável de ambiente `APP_PIN`
2. **Configuração de blocos** — cadastro de apartamentos por bloco (uma vez só)
3. **Captura de fotos** — 3 categorias: Cyble Antes, Cyble Depois, Documento
4. **Status visual** — bolinhas verdes mostram progresso por apartamento
5. **Busca** — filtrar apartamentos por número
6. **Offline-first** — funciona sem internet, sincroniza automaticamente
7. **PWA instalável** — ícone próprio, tela standalone

## Fluxo Principal
```
PIN → Selecionar Bloco → Selecionar Apartamento → Tirar Fotos → Sincronizar
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
