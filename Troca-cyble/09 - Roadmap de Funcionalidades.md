# Roadmap de Funcionalidades

## Status
- ⬜ Pendente
- 🟡 Em andamento
- ✅ Concluído

---

## Relatórios e Dados

### 1. Exportar progresso em PDF
- **Status:** ✅
- **Descrição:** Gerar PDF com lista de apartamentos concluídos/pendentes por torre, com data e hora
- **Uso:** Enviar para o gestor no final do dia/semana
- **Dependências:** Nenhuma

### 2. Exportar em Excel/CSV
- **Status:** ✅
- **Descrição:** Gerar arquivo .csv com colunas: Torre, Apto, Status Cyble Antes, Status Cyble Depois, Qtd Documentos, Última atualização
- **Uso:** Abrir no computador para planilhas e filtros
- **Dependências:** Nenhuma

### 3. Dashboard resumido
- **Status:** ✅
- **Descrição:** Tela com percentual de conclusão por torre, total de fotos tiradas, total pendentes, fotos não sincronizadas
- **Uso:** Visão geral rápida antes de começar o trabalho
- **Dependências:** Nenhuma

---

## Experiência no Campo

### 4. Barra de progresso por torre
- **Status:** ✅
- **Descrição:** Barra visual de progresso (0-100%) ao lado do nome da torre na listagem
- **Uso:** Saber rapidamente quanto falta por torre
- **Dependências:** Nenhuma

### 5. Marcar apto como "em andamento"
- **Status:** ✅
- **Descrição:** Terceiro estado visual (bolinha amarela) para aptos onde já começou a vistoria mas não terminou
- **Uso:** Saber quais aptos estão pela metade
- **Dependências:** Nenhuma

### 6. Ordenar aptos por status
- **Status:** ✅
- **Descrição:** Opção de ordenação: pendentes primeiro, concluídos no final (ou vice-versa)
- **Uso:** Focar nos que ainda faltam
- **Dependências:** Nenhuma

### 7. Botão voltar flutuante
- **Status:** ✅
- **Descrição:** Botão fixo no canto da tela para voltar à lista de apartamentos sem precisar scrollar até o topo
- **Uso:** Navegação rápida no campo
- **Dependências:** Nenhuma

### 8. Contador de fotos no apto
- **Status:** ✅
- **Descrição:** Mostrar "3 fotos" ao invés de só bolinhas na lista de apartamentos
- **Uso:** Saber quantas fotos foram tiradas sem entrar no apto
- **Dependências:** Nenhuma

---

## Organização das Fotos

### 9. Deletar foto errada
- **Status:** ✅
- **Descrição:** Botão de excluir em cada foto antes de sincronizar (IndexedDB)
- **Uso:** Corrigir foto tirada errada sem precisar refazer tudo
- **Dependências:** Nenhuma

### 10. Ver fotos já enviadas
- **Status:** ✅
- **Descrição:** Mostrar thumbnail com link para a URL do Blob nas fotos já sincronizadas
- **Uso:** Conferir se a foto subiu corretamente
- **Dependências:** Nenhuma

### 11. Ordem cronológica das fotos
- **Status:** ✅
- **Descrição:** Ordenar fotos por timestamp na tela do apartamento
- **Uso:** Visualizar evolução (antes → depois)
- **Dependências:** Nenhuma

### 17. Cyble Depois aceita múltiplas fotos
- **Status:** ✅
- **Descrição:** Categoria "Cyble — Depois" agora permite até 2 fotos (multi: true)
- **Uso:** Registrar mais de uma foto do estado depois da troca
- **Dependências:** Nenhuma

---

## Segurança e Controle

### 12. Logout explícito
- **Status:** ✅
- **Descrição:** Botão de sair que limpa o PIN do localStorage e volta para a tela de login
- **Uso:** Empréstimo do celular, troca de turno
- **Dependências:** Nenhuma

### 13. Timeout automático
- **Status:** ✅
- **Descrição:** Deslogar após 30 minutos sem uso (configurável)
- **Uso:** Segurança em caso de celular perdido/roubado
- **Dependências:** Opção 12 (Logout explícito)

### 14. Histórico de sincronização
- **Status:** ✅
- **Descrição:** Log com data/hora de cada upload realizado, acessível numa tela de "Atividade"
- **Uso:** Conferir se tudo foi enviado, rastrear erros
- **Dependências:** Nenhuma

---

## Performance

### 15. Compressão de imagem
- **Status:** �
- **Descrição:** Reduzir resolução/qualidade da foto antes de salvar no IndexedDB e enviar
- **Uso:** Economizar espaço no celular e加快 upload
- **Dependências:** Nenhuma

### 16. Upload em background
- **Status:** ✅
- **Descrição:** Sincronizar fotos sem bloquear a UI (mostrar progresso sutil no canto)
- **Uso:** Continuar tirando fotos enquanto envia as anteriores
- **Dependências:** Nenhuma

---

## Ordem de Implementação Sugerida

| Fase | Funcionalidades | Justificativa |
|------|----------------|---------------|
| 1 | ✅ 4, 8, 9 | Melhoram diretamente a experiência no campo (mais uso) |
| 2 | ✅ 1, 2, 3 | Relatórios para gestão |
| 3 | ✅ 6, 7, 11 | Navegação e organização |
| 4 | ✅ 5, 12, 13 | Segurança e controle |
| 5 | ✅ 10, 14, 15, 16 | Melhorias técnicas |

---

## Funcionalidades Recentes (Julho 2026)

### 18. Compartilhar relatório
- **Status:** ✅
- **Descrição:** Botões para compartilhar PDF/XLSX via Web Share API (WhatsApp, email, etc). Fallback para download se não suportado.
- **Uso:** Enviar relatório direto do celular para o gestor
- **Dependências:** 1, 2

### 19. Busca global de apartamentos
- **Status:** ✅
- **Descrição:** Barra de busca na tela principal que encontra apartamentos em todos os blocos de uma vez
- **Uso:** Achar rápido um apto sem saber em qual bloco está
- **Dependências:** Nenhuma

### 20. Filtro por data no dashboard
- **Status:** ✅
- **Descrição:** Filtro de data que muestra apenas os apartamentos com fotos naquela data
- **Uso:** Ver progresso por dia de leitura
- **Dependências:** Nenhuma

---

## Backlog (Futuro)

### 21. Comparação lado a lado (Antes vs Depois)
- **Status:** ⬜
- **Descrição:** Tela para ver fotos "Antes" e "Depois" do mesmo apartamento lado a lado
- **Uso:** Conferir visualmente se a troca foi feita corretamente
- **Dependências:** Nenhuma

### 22. Notas por foto
- **Status:** ✅
- **Descrição:** Campo de texto livre em cada foto (ex: "vazamento no piso", "torque ok")
- **Uso:** Registrar observações específicas sem precisar de outro sistema
- **Dependências:** Nenhuma

### 23. Modo escaneamento rápido
- **Status:** ✅
- **Descrição:** Toque no apto abre câmera direto (sem passar pelas categorias). Toggle na tela principal.
- **Uso:** Agilizar leitura no campo — tirar foto o mais rápido possível
- **Dependências:** Nenhuma

### 24. Fotos recentes
- **Status:** ✅
- **Descrição:** Seção horizontal com as últimas 10 fotos tiradas na tela principal
- **Uso:** Acesso rápido para revisar ou acessar aptos recentes
- **Dependências:** Nenhuma

### 25. Exportar por torre específica
- **Status:** ✅
- **Descrição:** Filtro de seleção de torres antes de gerar relatório (PDF/XLSX/CSV)
- **Uso:** Gerar relatório só de uma ou duas torres específicas
- **Dependências:** Nenhuma

### 26. Estatísticas por período
- **Status:** ✅
- **Descrição:** Gráfico de barras mostrando fotos por dia nos últimos 14 dias
- **Uso:** Visualizar produtividade ao longo do tempo
- **Dependências:** Nenhuma

### 27. Alerta de aptos esquecidos
- **Status:** ✅
- **Descrição:** Seção mostrando apartamentos sem foto há X dias (configurável)
- **Uso:** Identificar aptos que ficaram para trás
- **Dependências:** Nenhuma

### 28. Modo noturno/claro
- **Status:** ✅
- **Descrição:** Toggle de tema escuro/claro com persistência no localStorage
- **Uso:** Conforto visual em diferentes ambientes
- **Dependências:** Nenhuma

### 29. Swipe na galeria
- **Status:** ✅
- **Descrição:** Navegação por gestos (swipe) e setas no lightbox da galeria
- **Uso:** Navegar entre fotos no celular de forma intuitiva
- **Dependências:** Nenhuma

### 30. Notificações push
- **Status:** ⬜
- **Descrição:** Lembretes diários para tirar fotos (via Service Worker + Notification API)
- **Uso:** Manter rotina de leitura
- **Dependências:** Nenhuma

### 31. Modo offline total
- **Status:** ✅
- **Descrição:** Service Worker com cache network-first para API e cache-first para assets. App funciona 100% offline.
- **Uso:** Leitura em áreas sem sinal
- **Dependências:** Nenhuma

### 32. Dashboard de atrasados
- **Status:** ✅
- **Descrição:** Painel agrupado por torre mostrando aptos sem foto há X+ dias (configurável)
- **Uso:** Visão gerencial de atrasos
- **Dependências:** 27

### 33. Pull to refresh
- **Status:** ✅
- **Descrição:** Puxar pra baixo na tela principal para recarregar dados (indicador visual + refresh)
- **Uso:** Atualizar status sem botão
- **Dependências:** Nenhuma

### 34. Animação de sucesso
- **Status:** ✅
- **Descrição:** Confetti + check animado ao salvar foto no modo escaneamento
- **Uso:** Feedback visual de conclusão
- **Dependências:** 23

### 35. Backup / Restore
- **Status:** ✅
- **Descrição:** Exportar/importar todo o IndexedDB (fotos, sync, config) como JSON
- **Uso:** Trocar de celular, recuperar dados
- **Dependências:** Nenhuma

### 36. Versão do app
- **Status:** ✅
- **Descrição:** Número da versão no footer, indicador de status offline
- **Uso:** Controle de versão, diagnóstico
- **Dependências:** Nenhuma

### 37. Dashboard de atrasados — colapsável
- **Status:** ✅
- **Descrição:** Painel de aptos atrasados agora é colapsável (toggle no header). Mostra foto-count e threshold configurável no header compacto.
- **Uso:** Economizar espaço na tela principal
- **Dependências:** 32

### 38. Fotos online no CapturaScreen
- **Status:** ✅
- **Descrição:** CapturaScreen agora busca fotos online (Neon) do apartamento e exibe como thumbnails clicáveis, além das fotos locais do IndexedDB
- **Uso:** Ver fotos importadas ao abrir um apartamento
- **Dependências:** Nenhuma

### 39. Exportar fotos como ZIP
- **Status:** ✅
- **Descrição:** Download de todas as fotos online organizadas em pastas (Torre/Apartamento/) como arquivo .zip
- **Uso:** Backup das imagens para compartilhar com equipe
- **Dependências:** Nenhuma

### 40. Relatório PDF com fotos
- **Status:** ✅
- **Descrição:** PDF profissional que inclui as imagens reais de cada apartamento, organizado por torre, com status e label de cada foto
- **Uso:** Relatório visual para clientes/montadora
- **Dependências:** Nenhuma

### 41. Atalhos do app (Widget)
- **Status:** ✅
- **Descrição:** Shortcuts no manifest.json para "Abrir Câmera" e "Galeria" no ícone do app (Android)
- **Uso:** Acesso rápido à câmera e galeria sem abrir o app
- **Dependências:** Nenhuma

### 42. Verificar atualização
- **Status:** ✅
- **Descrição:** Service Worker compara versão com /api/version. Se houver atualização, mostra link "nova versão disponível" no footer
- **Uso:** Manter todos os dispositivos na mesma versão
- **Dependências:** Nenhuma

### 43. Sync automático em background
- **Status:** ✅
- **Descrição:** Sincronização dispara automaticamente quando a aba fica visível (visibilitychange) além do intervalo de 15s e do evento online
- **Uso:** Fotos são enviadas o mais rápido possível sem ação do usuário
- **Dependências:** Nenhuma

### 44. Estatísticas por torre
- **Status:** ✅
- **Descrição:** Dashboard individual por torre mostrando barra de progresso, concluídos/total e % — toggle "Por torre" ao lado de "Periodo"
- **Uso:** Visão granular de progresso por bloco
- **Dependências:** Nenhuma

### 45. Notas por foto
- **Status:** ✅
- **Descrição:** Campo de texto abaixo de cada thumbnail no CapturaScreen para adicionar observações (ex: "torneira com vazamento")
- **Uso:** Registrar detalhes importantes junto com a foto
- **Dependências:** Nenhuma

### 46. Onboarding interativo
- **Status:** ✅
- **Descrição:** Tour guiado de 5 passos na primeira vez que o usuário abre o app (explica dashboard, câmera, escaneamento, sync, exportação)
- **Uso:** Aprender a usar o app sem precisar de treinamento
- **Dependências:** Nenhuma

### 47. PWA install banner
- **Status:** ✅
- **Descrição:** Banner no topo da tela oferecendo instalar o app no aparelho, com botão "Instalar" e "Agora não"
- **Uso:** Instalar o app para acesso rápido e funcionamento offline completo
- **Dependências:** Nenhuma

### 48. Checar espaço IndexedDB
- **Status:** ✅
- **Descrição:** Monitora uso do storage a cada 60s. Alerta visual quando > 85% cheio. Mostra % no footer
- **Uso:** Evitar perda de fotos por falta de espaço
- **Dependências:** Nenhuma

### 49. Modo escaneamento contínuo
- **Status:** ✅
- **Descrição:** No modo escaneamento, ao salvar foto o botão "Concluir" vira "Próximo: {apto}" pulando direto pro próximo apto pendente
- **Uso:** Leitura rápida sem voltar pra lista
- **Dependências:** 23

### 50. Timer por apto
- **Status:** ✅
- **Descrição:** Cronômetro no header do CapturaScreen mostrando tempo gasto no apartamento (reinicia ao trocar de apto)
- **Uso:** Controle de produtividade
- **Dependências:** Nenhuma

### 51. Comparar antes/depois lado a lado
- **Status:** ✅
- **Descrição:** Modal com grid 2colunas mostrando foto "Antes" e "Depois" do mesmo apto (ícone no header quando ambas existem)
- **Uso:** Verificar qualidade da vistoria
- **Dependências:** Nenhuma

### 52. Compartilhar foto individual
- **Status:** ✅
- **Descrição:** Botão de compartilhar (ícone Share) em cada thumbnail — usa Web Share API no celular, download no desktop
- **Uso:** Enviar foto específica para cliente/equipe
- **Dependências:** Nenhuma

### 53. GPS nas fotos
- **Status:** ✅
- **Descrição:** Geolocalização automática capturada ao tirar foto (timeout 5s, máxima idade 60s). Dados salvos no FotoRecord
- **Uso:** Rastrear localização das fotos para auditoria
- **Dependências:** Nenhuma

### 54. Modo automático de tema
- **Status:** ✅
- **Descrição:** Toggle de tema agora cicla: Dark → Light → Auto. No modo auto, escuro das 18h às 6h, claro das 6h às 18h
- **Uso:** Conforto visual automático
- **Dependências:** 28

---

## v2.6.0 — Julho 2026

### 55. Painel de Relatório por Torre
- **Status:** ✅
- **Descrição:** Painel lateral (slide-in) ao clicar numa torre no dashboard. Mostra: cards de resumo (concluídos/em andamento/pendentes), barra de progresso animada, filtros de status, lista de aptos com badge, data última vistoria, contagem de fotos. Clique no apto navega para captura.
- **Uso:** Visão detalhada de cada torre sem sair do dashboard
- **Dependências:** Nenhuma

### 56. Tela de Configurações
- **Status:** ✅
- **Descrição:** Tela dedicada acessível pelo tab "Config" no BottomNav. Seções: Aparência (tema dark/light/auto), Captura (qualidade foto 50/75/90%, modo escaneamento), Dados (dias alerta +/-, itens por página, exportar/importar backup, limpar fotos, limpar tudo), Sobre (versão, armazenamento com barra, link GitHub).
- **Uso:** Configurar preferências do app de forma persistente
- **Dependências:** Nenhuma

### 57. Central de Notificações
- **Status:** ✅
- **Descrição:** Ícone de sino com badge no header. Dropdown com lista de notificações (sync, backup, update, storage, error, success). Auto-dismiss, mark read, clear all. State management pub/sub em `lib/notifications.ts`.
- **Uso:** Acompanhar status de sync, backups, atualizações
- **Dependências:** Nenhuma

---

## v2.7.0 — Julho 2026

### 58. Fila de Sync Avançada
- **Status:** ✅
- **Descrição:** Tela dedicada acessível clicando no SyncBanner. Lista de fotos com status individual (pending/uploading/success/failed), retry com backoff exponencial (1s→30s, máx 5 tentativas), filtros (Todos/Pendente/Enviando/Enviado/Falhou), barra de progresso geral, retry individual, retry todas as falhas, limpar enviadas, cancelar sync, status online/offline.
- **Uso:** Controle total sobre a sincronização de fotos
- **Dependências:** Nenhuma

---

## v2.8.0 — Julho 2026

### 59. Audit Log
- **Status:** ✅
- **Descrição:** Sistema de auditoria via IndexedDB. Registra ações: fotos capturadas/deletadas/anotadas/compartilhadas, sync iniciado/completado/falhou, exports (CSV/PDF/XLSX/ZIP/HTML), backup criado/restaurado, config alteradas, login/logout. Auto-trim para 500 registros, busca e filtros por tipo de ação.
- **Uso:** Rastreabilidade de todas as ações do usuário
- **Dependências:** Nenhuma

### 60. Scan Mode Pro
- **Status:** ✅
- **Descrição:** Feedback sonoro e de vibração via Web Audio API. Tons diferenciados por evento (foto, sync, erro, completo, próximo apto). Vibração patterns configuráveis. Toggles de áudio e vibração no settings.
- **Uso:** Feedback tátil durante escaneamento rápido
- **Dependências:** Nenhuma

### 61. HTML Report Export
- **Status:** ✅
- **Descrição:** Exportação de relatório HTML standalone com thumbs de fotos embutidos, stats por torre, progress bars, tema escuro. Interface `HtmlFoto` para mapeamento simplificado. Botão dedicado na seção de exportação.
- **Uso:** Relatório visual compartilhável sem precisar de PDF
- **Dependências:** Nenhuma

---

## v2.9.0 — Julho 2026

### 62. Exportação por Período
- **Status:** ✅
- **Descrição:** Filtro de período do dashboard agora afeta todas as exportações. Indicador visual na seção de exportação mostrando período ativo e contagem de aptos filtrados.
- **Uso:** Gerar relatórios de um período específico
- **Dependências:** Feature 41 (Date Range Filter)

### 63. Mapa de Progresso (Heatmap)
- **Status:** ✅
- **Descrição:** Grid colorido por torre onde cada célula = 1 apto. Verde (concluído), amarelo (em andamento), vermelho (pendente). Dot indicador de nota. Clicável — navega para o apto. Toggle na tela principal.
- **Uso:** Visão visual rápida do progresso geral
- **Dependências:** Nenhuma

---

## Notas
- Todas as funcionalidades são independentes (podem ser implementadas em qualquer ordem)
- Não dependem de novas APIs externas
- Mantêm o character offline-first do app
- Cada feature pode ser commitada e deployada separadamente
