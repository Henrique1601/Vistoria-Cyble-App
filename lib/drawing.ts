export type Ferramenta = 'caneta' | 'seta' | 'texto';

export interface Ponto {
  x: number;
  y: number;
}

export interface AcaoCaneta {
  tipo: 'caneta';
  pontos: Ponto[];
  cor: string;
  espessura: number;
}

export interface AcaoSeta {
  tipo: 'seta';
  inicio: Ponto;
  fim: Ponto;
  cor: string;
  espessura: number;
}

export interface AcaoTexto {
  tipo: 'texto';
  posicao: Ponto;
  texto: string;
  cor: string;
  tamanho: number;
}

export type AcaoDesenho = AcaoCaneta | AcaoSeta | AcaoTexto;

export interface EstadoEditor {
  imagem: HTMLImageElement | null;
  acoes: AcaoDesenho[];
  acoesDesfeitas: AcaoDesenho[];
  ferramenta: Ferramenta;
  cor: string;
  espessura: number;
  desenhando: boolean;
  pontoAtual: Ponto | null;
  textoPendente: { posicao: Ponto; texto: string } | null;
  offset: Ponto;
  escala: number;
}

export function criarEstadoInicial(): EstadoEditor {
  return {
    imagem: null,
    acoes: [],
    acoesDesfeitas: [],
    ferramenta: 'caneta',
    cor: '#FF0000',
    espessura: 3,
    desenhando: false,
    pontoAtual: null,
    textoPendente: null,
    offset: { x: 0, y: 0 },
    escala: 1,
  };
}

export function desenharCaneta(
  ctx: CanvasRenderingContext2D,
  acao: AcaoCaneta
) {
  if (acao.pontos.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = acao.cor;
  ctx.lineWidth = acao.espessura;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(acao.pontos[0].x, acao.pontos[0].y);
  for (let i = 1; i < acao.pontos.length; i++) {
    ctx.lineTo(acao.pontos[i].x, acao.pontos[i].y);
  }
  ctx.stroke();
}

export function desenharSeta(
  ctx: CanvasRenderingContext2D,
  acao: AcaoSeta
) {
  const { inicio, fim } = acao;
  const angulo = Math.atan2(fim.y - inicio.y, fim.x - inicio.x);
  const tamanhoCabeca = 15 + acao.espessura * 2;

  ctx.beginPath();
  ctx.strokeStyle = acao.cor;
  ctx.fillStyle = acao.cor;
  ctx.lineWidth = acao.espessura;
  ctx.lineCap = 'round';

  ctx.moveTo(inicio.x, inicio.y);
  ctx.lineTo(fim.x, fim.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(fim.x, fim.y);
  ctx.lineTo(
    fim.x - tamanhoCabeca * Math.cos(angulo - Math.PI / 6),
    fim.y - tamanhoCabeca * Math.sin(angulo - Math.PI / 6)
  );
  ctx.lineTo(
    fim.x - tamanhoCabeca * Math.cos(angulo + Math.PI / 6),
    fim.y - tamanhoCabeca * Math.sin(angulo + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

export function desenharTexto(
  ctx: CanvasRenderingContext2D,
  acao: AcaoTexto
) {
  ctx.font = `bold ${acao.tamanho}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillStyle = acao.cor;
  ctx.textBaseline = 'top';

  const padding = 4;
  const metricas = ctx.measureText(acao.texto);
  const altura = acao.tamanho * 1.2;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(
    acao.posicao.x - padding,
    acao.posicao.y - padding,
    metricas.width + padding * 2,
    altura + padding * 2
  );

  ctx.fillStyle = acao.cor;
  ctx.fillText(acao.texto, acao.posicao.x, acao.posicao.y);
}

export function renderizarCanvas(
  canvas: HTMLCanvasElement,
  estado: EstadoEditor
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(estado.offset.x, estado.offset.y);
  ctx.scale(estado.escala, estado.escala);

  if (estado.imagem) {
    ctx.drawImage(estado.imagem, 0, 0);
  }

  for (const acao of estado.acoes) {
    switch (acao.tipo) {
      case 'caneta':
        desenharCaneta(ctx, acao);
        break;
      case 'seta':
        desenharSeta(ctx, acao);
        break;
      case 'texto':
        desenharTexto(ctx, acao);
        break;
    }
  }

  ctx.restore();
}

export function obterPontoCanvas(
  canvas: HTMLCanvasElement,
  estado: EstadoEditor,
  clientX: number,
  clientY: number
): Ponto {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - estado.offset.x) / estado.escala;
  const y = (clientY - rect.top - estado.offset.y) / estado.escala;
  return { x, y };
}

export function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao converter canvas para blob'));
      },
      'image/jpeg',
      0.85
    );
  });
}
