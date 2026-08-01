# Estilo e Design

## Paleta de Cores

### Dark Theme (default)
| CSS Variable         | Cor       | Uso                           |
|----------------------|-----------|-------------------------------|
| `--color-base`       | `#0c0f14` | Fundo principal               |
| `--color-base-raised`| `#141920` | Fundo dos painéis             |
| `--color-base-overlay`| `#1a2029`| Fundo secundário (inputs)     |
| `--color-base-border`| `#253040` | Bordas                        |
| `--color-content`    | `#e2e8f0` | Texto principal               |
| `--color-content-secondary`| `#94a3b8`| Texto secundário         |
| `--color-content-tertiary`| `#64748b`| Texto terciário           |
| `--color-accent`     | `#e8823a` | Cor de destaque (laranja)     |
| `--color-success`    | `#34d399` | Verde (concluído)             |
| `--color-danger`     | `#f87171` | Vermelho (erro/offline)       |
| `--color-warn`       | `#fbbf24` | Amarelo (atenção)             |

### Light Theme
| CSS Variable         | Cor       | Uso                           |
|----------------------|-----------|-------------------------------|
| `--color-base`       | `#f8fafc` | Fundo principal               |
| `--color-base-raised`| `#ffffff` | Fundo dos painéis             |
| `--color-base-overlay`| `#f1f5f9`| Fundo secundário              |
| `--color-base-border`| `#e2e8f0` | Bordas                        |
| `--color-content`    | `#1e293b` | Texto principal               |
| `--color-accent`     | `#e8823a` | Cor de destaque (laranja)     |
| `--color-success`    | `#10b981` | Verde (concluído)             |
| `--color-danger`     | `#ef4444` | Vermelho (erro/offline)       |

### Tema Auto
- `dark` das 18h às 6h
- `light` das 6h às 18h
- Alterna automaticamente via `ThemeProvider`

## Tipografia

| Fonte           | Uso               | Pesos              |
|-----------------|-------------------|--------------------|
| Geist Display   | Títulos (display) | 500, 700           |
| Geist Mono      | Códigos/números   | 400, 600           |
| Inter           | Texto geral       | 400, 500, 600      |

## Componentes

### Shell
- Max-width: 720px, centralizado
- Padding: 28px top, 16px sides, 100px bottom (espaço pro BottomNav)

### BottomNav
- 6 abas: Inicio / Camera / Galeria / Agenda / Exportar / Config
- **Touch targets: 44px mínimo** (WCAG 2.2 AA)
- Ícones: @phosphor-icons/react
- Haptic feedback ao tocar
- **Glassmorphism:** `glass-subtle` (bg-raised/50 + backdrop-blur)

### Header (CapturaScreen)
- Botões de ação: **44px mínimo** (w-11 h-11)
- Back, Multifoto, Flash, Info

### Painéis (`panel`)
- Background: `var(--color-base-raised)`, border: `var(--color-base-border)`
- Border-radius: 12px
- Shadow: `var(--shadow-diffusion-color)`

### Botões
- **primary:** laranja (`--color-accent`), texto escuro, full-width, border-radius 10px
- **secondary:** transparente, borda, texto claro
- **ghost:** sem fundo, sem borda, texto dim
- **Touch target mínimo: 44px**

### Toasts
- **Regular toast** (z-index: 80): success/error/info/warning com auto-dismiss
- **ProgressToast** (z-index: 85): spinner + progress bar + shimmer durante sync
- Localização: bottom-20, centralizado
- Animação: spring (stiffness 400, damping 30)

### ConfirmDialog
- Modal de confirmação reutilizável (danger/warning variants)
- `onConfirm` / `onCancel` callbacks
- Usado em: AgendaScreen (delete), CommentsModal (delete)

### SyncBanner
- Fixed bottom, full-width
- Verde se sincronizando, vermelho se offline
- Mostra quantidade de fotos pendentes
- Clicável → navega para SyncQueueScreen

### Empty States
- Ilustrações SVG quando não há dados
- Mensagem descritiva + ação sugerida
- Tipos: search, photos, agenda, backup

### StatusScreen (NOVO)
- Tela de status do sistema com métricas em tempo real
- API latency, storage estimate, sync stats, tower progress
- Acessível via Configuracoes > Sobre > "Ver Status"

### CommentsModal (NOVO)
- Modal de comentários por apartamento
- CRUD: adicionar, listar, excluir (com ConfirmDialog)
- Admin mode: exclusão habilitada

### ProgressHeatmap
- Grid colorido por torre
- Verde (concluído), amarelo (em andamento), vermelho (pendente)
- Clicável → navega para o apto

### PhotoEditor
- Canvas fullscreen com ferramentas: pen, arrow, text
- Throttled via requestAnimationFrame
- Anotações salvas como `AcaoDesenho[]` no FotoRecord

### OnboardingTour
- Tour guiado de 7 passos
- Progress dots, skip/próximo, animações spring
- Persistido em localStorage (`vistoria_tutorial_v2`)

## Animações (Framer Motion)
- **Spring:** stiffness 400, damping 30 (padrão)
- **Stagger:** children animados em sequência
- **Exit animations:** AnimatePresence com scale/opacity
- **Shimmer:** CSS keyframes para ProgressToast e skeleton loading

### Shimmer Skeleton (NOVO)
- `.skeleton` — shimmer animation 1.8s com CSS vars `--skeleton-bg` e `--skeleton-shimmer`
- `.skeleton-resolve` — clip-path animation top-to-bottom 2s (ease-out)
- Usado em: BlocosGrid, GaleriaClient skeleton cards, lista de aptos

## Acessibilidade
- **Touch targets:** 44px mínimo (WCAG 2.2 AA)
- **Color contrast:** >= 4.5:1 para texto
- **Screen reader:** labels em botões e inputs
- **Keyboard navigation:** tab order lógico
- **Haptic feedback:** vibração em ações importantes
- **Global Error Boundary:** `app/global-error.tsx` com tema hardcoded (retry + reload)
