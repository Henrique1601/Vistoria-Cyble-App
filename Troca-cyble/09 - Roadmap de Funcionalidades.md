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

## v3.0.0 — Julho 2026

### 64. Modo Multi-Foto
- **Status:** ✅
- **Descrição:** Botão "Manter na câmera" (ícone Repeat) no header do CapturaScreen. Quando ativado em categorias multi-foto, mantém a câmera aberta após salvar, permitindo capturar múltiplas fotos sem reabrir. Auto-reabre câmera 300ms após salvar.
- **Uso:** Captura rápida de múltiplas fotos por categoria
- **Dependências:** Feature 18 (Multi-foto)

### 65. Compartilhar Relatório
- **Status:** ✅
- **Descrição:** Botão "Compartilhar Link" na seção de exportação. Upload do HTML para Vercel Blob (público, 7 dias, max 20 reports). Copia link para clipboard. Endpoint `/api/share-report`.
- **Uso:** Compartilhar relatório visual com gestores via link
- **Dependências:** Feature 61 (HTML Report Export)

### 66. Backup Agendado
- **Status:** ✅
- **Descrição:** Backup periódico em background via setInterval. Configurações: toggle automático + intervalo (30min, 1h, 6h, 24h). Toast de confirmação. Settings na tela de configurações.
- **Uso:** Backup automático sem intervenção manual
- **Dependências:** Nenhuma

### 67. Timer de Escaneamento
- **Status:** ✅
- **Descrição:** Cálculo de tempo por apto baseado nos timestamps das fotos. `lib/timer.ts` com funções `calcularTempoApto()`, `calcularTempoPorTorre()`, `formatarTempo()`. Coluna "Tempo" em CSV/PDF/XLSX. Cor do heatmap reflete velocidade.
- **Uso:** Medir eficiência da equipe de vistoria
- **Dependências:** Feature 63 (Heatmap)

---

## Notas
- Todas as funcionalidades são independentes (podem ser implementadas em qualquer ordem)
- Não dependem de novas APIs externas
- Mantêm o character offline-first do app
- Cada feature pode ser commitada e deployada separadamente
🤖 IA e Automação
1. Descrição automática por IA
- Tirou foto → IA descreve o que vê (ex: "Cyble instalado, conexão OK, sem vazamentos")
- Reduz tempo de anotação, padroniza relatórios
2. Detecção automática de problemas
- IA analisa foto e alerta: "Possível vazamento", "Conexão frouxa", "Cyble danificado"
- Checklist automático baseado na imagem
3. Relatório por voz
- Falar em vez de digitar: "Apto 123, cyble antes OK, depois com vazamento"
- Speech-to-text gera notas automaticamente

📋 Checklists e Padronização
4. Checklist por categoria
- Template: "Verificar conexão, verificar vazamento, verificarFixação"
- Marcar items como OK/NOK/NA durante a captura
5. Condição do Cyble (rating)
- Escala: Ótimo / Bom / Regular / Ruim / Crítico
- Estatísticas de condição por bloco
6. Comparar com vistoria anterior
- Mostrar foto da última vistoria do mesmo apto
- Highlight das diferenças (antes vs depois vs agora)

👥 Equipe e Multi-usuário|
7. Multi-usuário com papéis
- Administrador, Vistoriador, Supervisor
- Cada um vê só seus aptos ou todos
8. Atribuição de aptos
- "João vistoria blocos A-C, Maria vistoria D-F"
- Dashboard de produtividade por pessoa
9. Aprovação de vistoria
- Supervisor aprova/rejeita vistoria antes de fechar
- Status: Pendente → Aprovada → Concluída
📊 Analytics Avançados
10. Tempo médio por apto (por dia)
- Gráfico mostrando se a equipe está mais rápida ou devagar
- Meta de X aptos por hora
11. Taxa de conclusão em tempo real
- "% do dia concluído" barra animada
- Previsão de conclusão baseada na velocidade
12. Mapa de calor de problemas
- Quais aptos têm mais "Cyble ruim"?
- Identificar blocos com mais defeitos
🔧 Funcionalidades Práticas
13. Timer de sessão
- "Você já trabalhou 4h30, tire um café ☕"
- Alerta de pausa obrigatória (NR-17)
14. Modo noturno com flash
- Flash automático em ambientes escuros
- Ajuste de brilho/contraste na hora
15. Medição por foto
- Medir distância/tamanho usando a câmera
- Útil para documentar danos
16. QR Code por apto
- Gerar QR code que abre direto na captura
- Colocar na porta do apto para facilitar
📱 Integrações
17. WhatsApp automático
- Enviar foto + resumo pro síndico ao concluir apto
- Template: "Apto 123 concluído, 3 fotos, status OK"
18. Calendário do Google
- Sincronizar vistorias agendadas
- Lembrete automático no dia
19. Exportar para sistema do condomínio
- API para enviar dados para sistemas existentes
- JSON/XML formatado
🎮 Gamificação
20. Ranking de vistoriadores
- "X aptos hoje, Y esta semana, Z este mês"
- Conquistas: "100 aptos", "Sem erros", "Veloz"
21. Streak de dias
- "5 dias seguidos completando meta"
- Notificação de parabéns
💡 Quick Wins (fáceis de implementar)
#	Feature	Esforço
22	Exportar só aptos pendentes	Baixo
23	Foto de capa do apto (1ª foto = thumbnail)	Baixo
24	Ordenar fotos por categoria (Antes/Depois/Doc)	Baixo
25	Backup automático para Google Drive	Médio
26	Modo avião (forçar offline)	Baixo
🏆 Prioridades (Quick Wins)
#	Feature	Impacto	Esforço
1	Toast premium com progress bar	Alto	Baixo
2	Long press para ações	Alto	Médio
3	Glassmorphism nos cards	Alto	Baixo
4	Header colapsável	Médio	Médio
5	Badge animado no BottomNav	Alto	Baixo
6	Empty states ilustrados	Médio	Médio
7	Modo campo (compacto)	Alto	Médio
8	Confetti maior por conquista	Médio	Baixo
🎨 Visual e Design
1. Microinterações com Framer Motion
- Botões com spring bounce ao tocar (não só scale)
- Cards que flutuam ao arrastar (shadow dinâmico)
- Transições de página com shared layout animation (hero image voa de uma tela pra outra)
2. Glassmorphism nos cards
- backdrop-blur + bg-base-raised/60 nos cards principais
- Efeito de vidro fosco no BottomNav e headers
- Funciona bem no dark e light theme
3. Gradientes temáticos por status
- Aptos concluídos: gradiente subtle verde → transparente
- Aptos pendentes: gradiente vermelho → transparente
- Em andamento: gradiente amarelo → transparente
4. Skeleton loading premium
- Shimmer com gradiente animado (já tem, pode melhorar)
- Skeletons com formato real (não só retângulos)
- Skeleton do card = mini versão do card final
5. Ícones animados
- Ícone de sync girando enquanto sincroniza
- Check que "desenha" ao completar
- Sino que toca (balança) ao receber notificação
6. Modo compacto
- Toggle "Modo campo" → cards menores, mais informação visível
- Ícones menores, fonte reduzida, mais aptos por tela
- Útil quando a pessoa já conhece o app 
🖐️ Touch e Gestos
7. Long press para ações rápidas
- Segurar no apto → menu contextual (Abrir / Excluir / Compartilhar)
- Segurar na foto → opções (Editar / Excluir / Compartilhar)
- Vibração de confirmação ao abrir menu
8. Swipe actions nos cards
- Arrastar card do apto pra direita → abrir câmera direto
- Arrastar pra esquerda → marcar como concluído
- Feedback visual com cor durante o swipe
9. Pull-to-refresh com animação
- Já tem, pode melhorar: animação de "engrenagem girando"
- Barra de progresso animada no refresh
10. Double tap para favoritar
- Duplo clique no apto → marcar como "favorito"
- Aptos favoritos aparecem primeiro na lista
- Ícone de estrela discreto
📱 Navegação e Layout
11. BottomNav com badge animado
- Badge de pendências com pulse animation
- Número que "pula" ao atualizar
- Cor do badge muda conforme urgência
12. Header colapsável
- Ao scrollar pra baixo, header encolhe (só ícone + título)
- Ao scrollar pra cima, header expande (mostra filtros)
- Transição suave com Framer Motion
13. Sticky filters
- Filtros de bloco/data ficam fixos no topo ao scrollar
- Barra de busca sempre visível
- Fecha automaticamente ao selecionar resultado
14. Tab groups animados
- Abas com indicator que desliza (já tem no BottomNav)
- Pode aplicar em outras abas (Fotos/Notas/Histórico)
- Transição de conteúdo com crossfade
15. Empty states ilustrados
- Ilustrações SVG animadas quando não tem dados
- "Nenhuma foto ainda" → câmera animada
- "Busca sem resultados" → lupa com "?"
📊 Feedback Visual
16. Toast notifications premium
- Toasts com slide-in + auto-dismiss com progress bar
- Cores diferentes por tipo (sucesso/erro/info)
- Posição: topo no mobile, canto no desktop
17. Progress indicator global
- Barra fina no topo mostrando % de conclusão do dia
- Muda de cor conforme avança (vermelho → amarelo → verde)
- Anima suavemente ao atualizar
18. Confetti contextuais
- Já tem confetti ao salvar, pode ter:
- Confetti maior ao completar bloco inteiro
- Confetti dourado ao completar 100%
- Confetti de parabéns ao atingir meta diária
19. Skeleton shimmer mais realista
- Adicionar "pulsing" além do shimmer
- Skeletons que "resolvem" de cima pra baixo
- Transição suave do skeleton pro conteúdo real
20. Status dots com glow
- Bolinhas de status com box-shadow animado
- Pulse suave nas bolinhas pendentes
- Glow mais forte nas concluídas
…
🌙 Temas e Personalização
25. Temas personalizáveis
- 3-4 paletas de cores além do dark/light
- Ex: "Azul profissional", "Verde natureza", "Laranja vibrante"
- Usuário escolhe no settings
26. Modo alto contraste
- Para sol forte no campo
- Bordas mais grossas, cores mais saturadas
- Fonte um pouco maior automaticamente
27. Modo uma mão
- Botões importantes no canto inferior direito
- Navegação por gestos (swipe pra voltar)
- BottomNav mais compacto
28. Widgets do celular
- Widget 2x2: "Aptos pendentes hoje"
- Widget 4x2: "Progresso por bloco"
- Atalho rápido pra câmera