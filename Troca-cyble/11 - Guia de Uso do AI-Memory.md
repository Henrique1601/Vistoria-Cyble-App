# 11 - Guia de Uso do AI-Memory (Cérebro do Projeto)

> **Memória de Longo Prazo, Recuperação Semântica e Handoff Contínuo entre Agentes de IA**  
> **Ferramenta:** [akitaonrails/ai-memory](https://github.com/akitaonrails/ai-memory) | **Versão:** 2.4.0 (Windows Native)

---

## 1. O que é o AI-Memory neste Projeto?

O **AI-Memory** é o subsistema de **memória persistente de longo prazo** do Vistoria Cyble App. Ele permite que sessões de IA (Google Antigravity, Claude Code, Cursor, Codex, etc.) compartilhem o mesmo contexto, histórico de decisões arquiteturais, regras invioláveis e aprendizados sem depender da memória volátil do chat.

### Principais Pilares
- **Fonte da Verdade em Markdown:** Todas as memórias são páginas `.md` estruturadas e versionadas, acompanhadas de índice SQLite (FTS5).
- **Embeddings Locais 100% Gratuitos:** Utiliza o modelo local `all-MiniLM-L6-v2 (384d)` embutido, realizando busca semântica veloz sem custo de API e sem envio de dados para servidores externos.
- **Captura Silenciosa via Hooks:** Observa automaticamente prompts e chamadas de ferramentas através de lifecycle hooks nativos sem interrupção do fluxo de trabalho.
- **Interface Web Integrada:** Visualizador gráfico embutido para consulta de páginas, sessões e grafos de dependências.

---

## 2. Estrutura e Localização no Sistema

| Recurso | Caminho | Finalidade |
| :--- | :--- | :--- |
| **Binário do Windows** | `C:\Users\conta\AppData\Local\ai-memory\ai-memory.exe` | Executável principal (adicionado ao PATH do Windows) |
| **Banco de Dados & Wiki** | `C:\Users\conta\AppData\Local\ai-memory\` | Contém `db/memory.sqlite`, `wiki/`, `models/` e `config.toml` |
| **Escopo do Repositório** | `c:\Users\Public\Downloads\Vistoria-Cyble-App\.ai-memory.toml` | Define `workspace = "default"` e `project = "vistoria-cyble-app"` |
| **Skills de Agentes** | `c:\Users\Public\Downloads\Vistoria-Cyble-App\.agents\skills\` | Habilidades de busca, gravação, handoff e governança |
| **Hooks do Antigravity** | `C:\Users\conta\.gemini\config\hooks.json` | Captura automática de eventos de ciclo de vida |
| **Configuração MCP** | `C:\Users\conta\.gemini\config\mcp_config.json` | Registro do endpoint `http://127.0.0.1:49374/mcp` |

---

## 3. Como Iniciar o Servidor

Para que as ferramentas de MCP, a interface web e os hooks funcionem, o servidor HTTP do AI-Memory deve estar ativo:

### Início Rápido no PowerShell:
```powershell
ai-memory serve --transport http --bind 127.0.0.1:49374 --enable-web
```

### Acesso à Interface Web:
Abra no navegador:
👉 **[http://127.0.0.1:49374/web](http://127.0.0.1:49374/web)**

*(A interface permite navegar pela árvore de páginas, histórico de sessões, nós do grafo semântico e status dos embeddings).*

---

## 4. Comandos Essenciais do Dia a Dia

Todos os comandos abaixo podem ser executados no terminal PowerShell dentro da pasta do projeto:

### 4.1. Consultar o Status da Memória
Exibe total de páginas, embeddings gerados, tamanho do SQLite e provedores ativos:
```powershell
ai-memory status
```

### 4.2. Buscar Conhecimento na Memória (Busca Semântica / FTS5)
```powershell
# Buscar regras do OneDrive
ai-memory search "onedrive"

# Buscar regras de validação de conclusão
ai-memory search "concluidos"

# Buscar políticas de git e branches
ai-memory search "cyble-trabalho"
```

### 4.3. Ler uma Página de Memória Completa
```powershell
ai-memory read-page --path "rules/git-branches.md"
ai-memory read-page "concluidos"
```

### 4.4. Gravar Nova Decisão ou Regra de Negócio
Para salvar um aprendizado ou decisão técnica definitiva:
```powershell
ai-memory write-page `
  --path "decisions/nome-da-decisao.md" `
  --title "Título Explicativo" `
  --kind decision `
  --tier semantic `
  --pinned `
  --body "# Título`n`nConteúdo detalhado da decisão..."
```
- `--kind`: `rule` (regra), `decision` (decisão técnica), `gotcha` (armadilha/problema superado), `fact` (fato do sistema).
- `--tier`: `semantic` (permanente), `procedural` (passo a passo), `episodic` (relato de sessão).
- `--pinned`: Impede que a limpeza automática (*retention sweep*) descarte a página por antiguidade.

### 4.5. Limpeza e Otimização do Banco
```powershell
# Compactar páginas livres do SQLite sem apagar nada
ai-memory compact

# Gerar backup compactado em .tar.gz
ai-memory backup
```

---

## 5. Páginas Fundamentais Já Inicializadas

As seguintes páginas de governança e arquitetura já residem na memória do projeto:

1. **`rules/git-branches.md`**:
   - Preservação perpétua da branch `cyble-trabalho`.
   - Regra de deploy na Vercel através da branch `main`.
   - Sincronização da branch `trabalho`.
2. **`decisions/concluidos-validation.md`**:
   - Critério de 3 fatores para status Concluído: marcação manual, 3 categorias registradas (`cyble_antes` + `cyble_depois` + `documento`) e agendamento concluído (`concluido === true`).
   - Total auditado e consolidado: **811 apartamentos**.
3. **`gotchas/onedrive-upload.md`**:
   - Necessidade de criação recursiva de pastas (`ensureFolderExists`) na API do Microsoft Graph antes de enviar fotos.
   - Preservação do Vercel Blob no modo híbrido (`'ambos'`).

---

## 6. Ativação Opcional com OpenRouter (Consolidação Inteligente com LLM)

Por padrão, o AI-Memory opera em **modo zero-LLM** (gratuito e local). Se desejar que ele use um modelo do OpenRouter para gerar resumos mais refinados de sessões longas:

1. Obtenha sua chave no [openrouter.ai](https://openrouter.ai).
2. Configure as variáveis antes de iniciar o servidor:
```powershell
$env:AI_MEMORY_LLM_PROVIDER="openai-compat"
$env:OPENAI_API_BASE="https://openrouter.ai/api/v1"
$env:OPENAI_API_KEY="sk-or-v1-sua-chave-aqui"
$env:AI_MEMORY_LLM_MODEL="anthropic/claude-3.5-sonnet"
ai-memory serve --transport http --bind 127.0.0.1:49374 --enable-web
```
Com isso, o consolidador automático usará a inteligência do OpenRouter para resumir automaticamente cada encerramento de sessão.
