# Estilo e Design

## Paleta de Cores (Dark Theme)

| Variável       | Cor      | Uso                           |
|----------------|----------|-------------------------------|
| `--bg`         | `#0a0f14`| Fundo principal               |
| `--panel`      | `#111820`| Fundo dos painéis             |
| `--panel-2`    | `#161f29`| Fundo secundário (inputs)     |
| `--border`     | `#223040`| Bordas                        |
| `--text`       | `#dceee` | Texto principal               |
| `--text-dim`   | `#7f93a3`| Texto secundário              |
| `--accent`     | `#f2994a`| Cor de destaque (laranja)     |
| `--accent-dim` | `#5c3d1f`| Fundo do dot de destaque      |
| `--ok`         | `#3ecfc0`| Verde (concluído)             |
| `--danger`     | `#e2604f`| Vermelho (erro/offline)       |

## Tipografia

| Fonte           | Uso          | Pesos         |
|-----------------|--------------|---------------|
| Space Grotesk   | Títulos (display) | 500, 700  |
| IBM Plex Mono   | Códigos/números   | 400, 600  |
| Inter           | Texto geral      | 400, 500, 600 |

## Componentes

### Shell
- Max-width: 720px, centralizado
- Padding: 28px top, 16px sides, 100px bottom (espaço pro SyncBanner)

### Hero
- Flex row com dot laranja (9px, border-radius 50%, box-shadow) + título

### Painéis (`panel`)
- Background: `--panel`, border: `--border`, border-radius: 10px
- Título em uppercase, 12px, letter-spacing

### Botões
- **primary:** laranja (`--accent`), texto escuro, full-width, border-radius 10px
- **secondary:** transparente, borda, texto claro
- **ghost:** sem fundo, sem borda, texto dim

### Lista de Apartamentos
- Container com borda e border-radius
- Rows com flex justify-between
- Badges: 3 dots (cyble antes, cyble depois, documento)
- Dot verde (`--ok`) = concluído

### SyncBanner
- Fixed bottom, full-width
- Laranja se pendente, vermelho se offline
- Mostra quantidade de fotos pendentes
