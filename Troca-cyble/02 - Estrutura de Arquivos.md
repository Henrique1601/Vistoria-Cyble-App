# Estrutura de Arquivos

```
vistoria-cyble-app/
├── app/
│   ├── layout.tsx          # Layout raiz (fonts, metadata, SW register)
│   ├── page.tsx            # Home — gerencia estado e navegação
│   ├── globals.css         # Estilos globais (dark theme)
│   ├── PinGate.tsx         # Tela de autenticação por PIN
│   ├── SetupScreen.tsx     # Cadastro de blocos e apartamentos
│   ├── CapturaScreen.tsx   # Interface de captura de fotos
│   ├── sw-register.tsx     # Registro do Service Worker
│   └── api/
│       ├── upload/
│       │   └── route.ts    # POST — upload de foto para Vercel Blob
│       └── status/
│           └── route.ts    # POST — validação de PIN
├── lib/
│   └── db.ts               # Abstração IndexedDB (fotos + config)
├── public/
│   ├── sw.js               # Service Worker (cache do shell)
│   ├── manifest.json       # PWA manifest
│   └── icon.svg            # Ícone do app (referenciado no manifest)
├── Troca-cyble/            # Obsidian vault — documentação do projeto
├── package.json
├── tsconfig.json
├── next.config.mjs
├── next-env.d.ts
└── README.md
```

## Descrição dos Arquivos Críticos

### `app/page.tsx` (207 linhas)
- Componente raiz com toda a lógica de estado
- Estados: `pin`, `lista`, `status`, `view`, `blocoAtual`, `aptoAtual`, `busca`, `pendentes`, `online`
- Função `tentarSincronizar()` — loop de sync a cada 15s
- Componente `SyncBanner` — banner de status no rodapé

### `lib/db.ts` (117 linhas)
- Schema TypeScript com `DBSchema` do `idb`
- Funções: `salvarFoto`, `fotosDoApartamento`, `fotosPendentes`, `marcarSincronizada`
- Funções de config: `salvarListaApartamentos`, `carregarListaApartamentos`

### `app/api/upload/route.ts` (33 linhas)
- Valida PIN via header `x-app-pin`
- Salva no Vercel Blob com path organizacional
- Path: `vistorias/bloco-{bloco}/apto-{apartamento}/{categoria}-{timestamp}.{ext}`
