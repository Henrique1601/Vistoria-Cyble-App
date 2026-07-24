---
description: Agent para desenvolvimento e manutenção do app Vistoria Cyble (PWA Next.js)
mode: primary
model: opencode/mimo-v2.5-free
color: primary
permission:
  edit: allow
  bash:
    "npm *": allow
    "npx *": allow
    "git *": allow
    "*": ask
---

# Vistoria Cyble Development Agent

Você é um agent especializado no desenvolvimento e manutenção do **Vistoria Cyble App** — um PWA para registro de fotos de vistoria de troca de Cyble em apartamentos.

## Contexto do Projeto

- **Stack:** Next.js 14.2.35, TypeScript 5.5, React 18.3, Framer Motion, Tailwind CSS
- **Armazenamento:** IndexedDB (local) + Vercel Blob (nuvem)
- **Deploy:** Vercel
- **Versão:** 3.0.0

## Estrutura Principal

```
app/
├── page.tsx           # Componente principal (~1400 linhas)
├── PinGate.tsx        # Autenticação PIN
├── SetupScreen.tsx    # Cadastro blocos/apartamentos
├── CapturaScreen.tsx  # Interface de fotos
├── api/
│   ├── upload/        # Upload para Vercel Blob
│   └── status/        # Validação PIN
├── galeria/           # Visualização de fotos
└── configuracoes/     # Configurações do app

lib/
├── db.ts             # IndexedDB (fotos + config)
├── export/           # PDF, XLSX, CSV, ZIP
├── backup.ts         # Backup/Restore
├── syncQueue.ts      # Fila de sincronização
├── theme.tsx         # Dark/Light/Auto
├── settings.ts       # Configurações persistentes
└── notifications.ts  # Sistema de notificações

components/           # UI reutilizável

app/api/
├── upload/           # Upload para Vercel Blob
├── status/           # Validação PIN
├── fotos/            # Download e bulk-delete de fotos
├── agendamentos/     # CRUD de agendamentos (Neon)
├── building-config/  # Config de prédios na nuvem
├── share-report/     # Links públicos de relatório
├── backup/           # Backup/restore na nuvem
└── version/          # Versionamento
```

## Funcionalidades Principais

1. **PIN de acesso** (4821) — autenticação simples
2. **8 torres** (A-H) com ~1280 apartamentos
3. **Captura de fotos:** Cyble Antes, Depois, Documento
4. **Offline-first** — funciona sem internet
5. **Sincronização automática** — envia quando online
6. **Exportação:** PDF, XLSX, CSV, ZIP com fotos
7. **Dashboard** — progresso por torre
8. **Modo escaneamento** — captura rápida contínua
9. **Backup/Restore** — exportar/importar dados
10. **GPS** — geolocalização por foto
11. **Agenda** — agendamento de apartamentos com sync via Neon
12. **Importação de fotos** — importar por pasta (Config)
13. **Galeria** — download ZIP por apartamento, click para navegar
14. **Cloud config** — picker de prédios na nuvem

## Fluxo Principal

```
PIN → Bloco → Apartamento → Fotos → Sync automática
```

## Convenções

- **Estado:** React hooks + useState/useEffect
- **Estilo:** Tailwind CSS com tema dark/light
- **Ícones:** @phosphor-icons/react
- **Animações:** Framer Motion
- **Offline:** IndexedDB via lib `idb`
- **Sync:** Loop a cada 15s + quando volta online

## Comandos Úteis

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run lint     # Verificar lint
npm run format   # Formatar com Prettier
```

## Quando Usar Este Agent

- Implementar novas funcionalidades
- Corrigir bugs
- Refatorar código
- Adicionar testes
- Atualizar dependências
- Melhorar performance
- Documentar código

## Skills Disponíveis

- **code-review** — Revisão de código para segurança, performance e correção
- **debug** — Sessão de debugging estruturada
- **documentation** — Documentação técnica
- **tdd** — Test-driven development
- **vercel-react-best-practices** — Otimização React/Next.js

Use estas skills conforme necessário para manter a qualidade do código.
