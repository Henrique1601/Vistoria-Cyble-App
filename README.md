# Vistoria Cyble — app de celular (PWA)

App instalável no celular pra registrar as fotos da troca de Cyble (antes/depois)
e dos documentos de cada apartamento, organizados por bloco. Funciona **offline**:
as fotos ficam guardadas no próprio celular (IndexedDB) até ter sinal, e aí
sincronizam sozinhas.

## Deploy na Vercel

1. Suba esse projeto pra um repositório no GitHub (ou `npx vercel` direto da pasta).
2. Na Vercel, importe o repositório.
3. **Ative o Vercel Blob** (armazenamento das fotos):
   - No projeto na Vercel: **Storage -> Create Database -> Blob**.
   - Isso já cria automaticamente a variável `BLOB_READ_WRITE_TOKEN`.
4. Em **Settings -> Environment Variables**, adicione também:
   - `APP_PIN` = um PIN numérico de sua escolha (ex: `4821`) — é a senha de
     acesso ao app, já que ele vai ficar num link público da Vercel e as fotos
     de documento podem ter dado pessoal dos moradores.
5. Deploy.

## Instalando no celular

1. Abra o link do app no navegador do celular (Chrome/Safari).
2. Digite o PIN configurado.
3. No menu do navegador, escolha **"Adicionar à tela inicial"** (Android) ou
   **"Adicionar à Tela de Início"** (iPhone, no botão de compartilhar).
4. Agora ele abre como um app normal, com ícone próprio.

## Primeira configuração

Na primeira vez que abrir, ele pede pra cadastrar os apartamentos de cada
bloco (cole a lista, um apartamento por linha). Isso fica salvo no celular —
só precisa fazer uma vez (ou quando quiser corrigir a lista, tem o botão
"Editar lista de apartamentos" na tela inicial).

## Como funciona o dia a dia

1. Escolhe o bloco -> escolhe o apartamento (dá pra buscar pelo número).
2. Tira as fotos: Cyble Antes, Cyble Depois, Documento (pode tirar vários
   documentos, um de cada vez).
3. Fecha e volta pra lista — o apartamento aparece com as bolinhas verdes
   preenchidas conforme o que já foi feito.
4. Se estiver sem sinal (subsolo, casa de máquinas), as fotos ficam guardadas
   no celular normalmente — aparece um aviso "sem internet" no rodapé. Assim
   que o sinal voltar, ele sincroniza sozinho em segundo plano.
5. As fotos sobem organizadas assim no armazenamento:
   `vistorias/bloco-<bloco>/apto-<apartamento>/<categoria>-<timestamp>.jpg`

## Limitações da versão atual (bom saber)

- Se o celular for trocado ou o app for desinstalado antes de sincronizar
  tudo, as fotos ainda não enviadas se perdem — por isso vale de vez em
  quando checar o aviso de "pendentes" e garantir que chegou a zero antes de
  encerrar o dia (com internet).
- O reconhecimento de "apartamento concluído" (as 3 bolinhas verdes) é só
  local, no seu celular — se você usar em mais de um aparelho, cada um tem
  seu próprio progresso. Como você me disse que só você vai usar, isso não é
  problema agora, mas se no futuro quiser que outra pessoa use também, aí
  precisaríamos de um progresso compartilhado (banco de dados central em vez
  de só IndexedDB local) — é uma evolução natural do projeto, é só pedir.
- Sem paginação na lista de apartamentos — com ~180 por bloco funciona bem;
  se algum bloco tiver muito mais que isso, pode valer otimizar depois.
