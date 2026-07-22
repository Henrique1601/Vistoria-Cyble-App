# AGENTS.md - Vistoria Cyble App

## Visão Geral

PWA para celular que registra fotos da troca de Cyble em apartamentos, organizados por bloco. Funciona offline e sincroniza automaticamente.

## Stack

- **Framework:** Next.js 14.2.35 (App Router)
- **Linguagem:** TypeScript 5.5
- **UI:** React 18.3 + Framer Motion + Tailwind CSS
- **Armazenamento:** IndexedDB (local) + Vercel Blob (nuvem)
- **Deploy:** Vercel

## Estrutura de Diretórios

```
├── app/                    # Páginas e API routes
│   ├── page.tsx           # Componente principal
│   ├── PinGate.tsx        # Autenticação
│   ├── SetupScreen.tsx    # Configuração inicial
│   ├── CapturaScreen.tsx  # Captura de fotos
│   └── api/               # API routes
├── lib/                    # Utilitários e lógica de negócio
├── components/             # Componentes React reutilizáveis
├── public/                 # Assets estáticos e Service Worker
├── Troca-cyble/           # Documentação do projeto
└── .opencode/             # Configuração do opencode
```

## Convenções de Código

- Usar TypeScript para todos os arquivos
- Seguir padrões existentes do projeto
- Preferir componentes funcionais com hooks
- Usar Tailwind CSS para estilos
- Ícones: @phosphor-icons/react
- Animações: Framer Motion

## Comandos de Desenvolvimento

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run lint     # Verificar lint
npm run format   # Formatar código
```

## Fluxo de Trabalho

1. Entender o requisito
2. Verificar código existente
3. Implementar seguindo convenções
4. Testar localmente
5. Verificar lint
6. Commitar com mensagem descritiva

## Skills do Agent

- **code-review** — Revisar PRs e mudanças
- **debug** — Debugar issues
- **documentation** — Criar/atualizar docs
- **tdd** — Escrever testes primeiro
- **vercel-react-best-practices** — Otimizar React/Next.js

## Configuração do Modelo

- **Modelo:** opencode/mimo-v2.5-free (gratuito)
- **Configuração:** opencode.json
