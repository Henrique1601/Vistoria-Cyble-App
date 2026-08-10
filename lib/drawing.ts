export type Ferramenta = 'caneta' | 'seta' | 'texto' | 'borracha' | 'marcador' | 'retangulo' | 'circulo';

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

export interface AcaoMarcador {
  tipo: 'marcador';
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

export interface AcaoRetangulo {
  tipo: 'retangulo';
  inicio: Ponto;
  fim: Ponto;
  cor: string;
  espessura: number;
}

export interface AcaoCirculo {
  tipo: 'circulo';
  centro: Ponto;
  raio: number;
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

export type AcaoDesenho = AcaoCaneta | AcaoMarcador | AcaoSeta | AcaoRetangulo | AcaoCirculo | AcaoTexto;

export interface EstadoEditor {
  imagem: HTMLImageElement | null;
  acoes: AcaoDesenho[];
  acoesDesfeitas: AcaoDesenho[];
  ferramenta: Ferramenta;
  cor: string;
  espessura: number;
  tamanhoTexto: number;
  desenhando: boolean;
  pontoAtual: Ponto | null;
  textoPendente: { posicao: Ponto; texto: string } | null;
  offset: Ponto;
  escala: number;
  zoom: number;
}

export function criarEstadoInicial(): EstadoEditor {
  return {
    imagem: null,
    acoes: [],
    acoesDesfeitas: [],
    ferramenta: 'caneta',
    cor: '#FF0000',
    espessura: 3,
    tamanhoTexto: 32,
    desenhando: false,
    pontoAtual: null,
    textoPendente: null,
    offset: { x: 0, y: 0 },
    escala: 1,
    zoom: 1,
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

export function desenharMarcador(
  ctx: CanvasRenderingContext2D,
  acao: AcaoMarcador
) {
  if (acao.pontos.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.strokeStyle = acao.cor;
  ctx.lineWidth = acao.espessura * 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(acao.pontos[0].x, acao.pontos[0].y);
  for (let i = 1; i < acao.pontos.length; i++) {
    ctx.lineTo(acao.pontos[i].x, acao.pontos[i].y);
  }
  ctx.stroke();
  ctx.restore();
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

export function desenharRetangulo(
  ctx: CanvasRenderingContext2D,
  acao: AcaoRetangulo
) {
  const x = Math.min(acao.inicio.x, acao.fim.x);
  const y = Math.min(acao.inicio.y, acao.fim.y);
  const w = Math.abs(acao.fim.x - acao.inicio.x);
  const h = Math.abs(acao.fim.y - acao.inicio.y);

  ctx.beginPath();
  ctx.strokeStyle = acao.cor;
  ctx.lineWidth = acao.espessura;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeRect(x, y, w, h);
}

export function desenharCirculo(
  ctx: CanvasRenderingContext2D,
  acao: AcaoCirculo
) {
  ctx.beginPath();
  ctx.strokeStyle = acao.cor;
  ctx.lineWidth = acao.espessura;
  ctx.arc(acao.centro.x, acao.centro.y, acao.raio, 0, Math.PI * 2);
  ctx.stroke();
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
  ctx.scale(estado.escala * estado.zoom, estado.escala * estado.zoom);

  if (estado.imagem) {
    ctx.drawImage(estado.imagem, 0, 0);
  }

  for (const acao of estado.acoes) {
    switch (acao.tipo) {
      case 'caneta':
        desenharCaneta(ctx, acao);
        break;
      case 'marcador':
        desenharMarcador(ctx, acao);
        break;
      case 'seta':
        desenharSeta(ctx, acao);
        break;
      case 'retangulo':
        desenharRetangulo(ctx, acao);
        break;
      case 'circulo':
        desenharCirculo(ctx, acao);
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
  const x = (clientX - rect.left - estado.offset.x) / (estado.escala * estado.zoom);
  const y = (clientY - rect.top - estado.offset.y) / (estado.escala * estado.zoom);
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

/** Find the topmost annotation near a point (for eraser) */
export function encontrarAcaoProxima(
  acoes: AcaoDesenho[],
  ponto: Ponto,
  raio: number = 20
): number {
  for (let i = acoes.length - 1; i >= 0; i--) {
    const acao = acoes[i];
    switch (acao.tipo) {
      case 'caneta':
      case 'marcador':
        for (const p of acao.pontos) {
          if (distancia(p, ponto) < raio) return i;
        }
        break;
      case 'seta':
      case 'retangulo':
        if (distancia(acao.inicio, ponto) < raio || distancia(acao.fim, ponto) < raio) return i;
        break;
      case 'circulo':
        if (distancia(acao.centro, ponto) < raio) return i;
        break;
      case 'texto':
        if (distancia(acao.posicao, ponto) < raio * 2) return i;
        break;
    }
  }
  return -1;
}

function distancia(a: Ponto, b: Ponto): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
