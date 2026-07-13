# Roadmap de Funcionalidades

## Status
- ⬜ Pendente
- 🟡 Em andamento
- ✅ Concluído

---

## Relatórios e Dados

### 1. Exportar progresso em PDF
- **Status:** ⬜
- **Descrição:** Gerar PDF com lista de apartamentos concluídos/pendentes por torre, com data e hora
- **Uso:** Enviar para o gestor no final do dia/semana
- **Dependências:** Nenhuma

### 2. Exportar em Excel/CSV
- **Status:** ⬜
- **Descrição:** Gerar arquivo .csv com colunas: Torre, Apto, Status Cyble Antes, Status Cyble Depois, Qtd Documentos, Última atualização
- **Uso:** Abrir no computador para planilhas e filtros
- **Dependências:** Nenhuma

### 3. Dashboard resumido
- **Status:** ⬜
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
- **Status:** ⬜
- **Descrição:** Terceiro estado visual (bolinha amarela) para aptos onde já começou a vistoria mas não terminou
- **Uso:** Saber quais aptos estão pela metade
- **Dependências:** Nenhuma

### 6. Ordenar aptos por status
- **Status:** ⬜
- **Descrição:** Opção de ordenação: pendentes primeiro, concluídos no final (ou vice-versa)
- **Uso:** Focar nos que ainda faltam
- **Dependências:** Nenhuma

### 7. Botão voltar flutuante
- **Status:** ⬜
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
- **Status:** ⬜
- **Descrição:** Mostrar thumbnail com link para a URL do Blob nas fotos já sincronizadas
- **Uso:** Conferir se a foto subiu corretamente
- **Dependências:** Nenhuma

### 11. Ordem cronológica das fotos
- **Status:** ⬜
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
- **Status:** ⬜
- **Descrição:** Botão de sair que limpa o PIN do localStorage e volta para a tela de login
- **Uso:** Empréstimo do celular, troca de turno
- **Dependências:** Nenhuma

### 13. Timeout automático
- **Status:** ⬜
- **Descrição:** Deslogar após 30 minutos sem uso (configurável)
- **Uso:** Segurança em caso de celular perdido/roubado
- **Dependências:** Opção 12 (Logout explícito)

### 14. Histórico de sincronização
- **Status:** ⬜
- **Descrição:** Log com data/hora de cada upload realizado, acessível numa tela de "Atividade"
- **Uso:** Conferir se tudo foi enviado, rastrear erros
- **Dependências:** Nenhuma

---

## Performance

### 15. Compressão de imagem
- **Status:** ⬜
- **Descrição:** Reduzir resolução/qualidade da foto antes de salvar no IndexedDB e enviar
- **Uso:** Economizar espaço no celular e加快 upload
- **Dependências:** Nenhuma

### 16. Upload em background
- **Status:** ⬜
- **Descrição:** Sincronizar fotos sem bloquear a UI (mostrar progresso sutil no canto)
- **Uso:** Continuar tirando fotos enquanto envia as anteriores
- **Dependências:** Nenhuma

---

## Ordem de Implementação Sugerida

| Fase | Funcionalidades | Justificativa |
|------|----------------|---------------|
| 1 | 4, 8, 9 | Melhoram diretamente a experiência no campo (mais uso) |
| 2 | 1, 2, 3 | Relatórios para gestão |
| 3 | 6, 7, 11 | Navegação e organização |
| 4 | 5, 12, 13 | Segurança e controle |
| 5 | 10, 14, 15, 16 | Melhorias técnicas |

---

## Notas
- Todas as funcionalidades são independentes (podem ser implementadas em qualquer ordem)
- Não dependem de novas APIs externas
- Mantêm o character offline-first do app
- Cada feature pode ser commitada e deployada separadamente
