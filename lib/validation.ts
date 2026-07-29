/**
 * Input validation and sanitization for API routes.
 * Prevents injection attacks and ensures data integrity.
 */

/** Bloco must be a short string like "Torre A", "A", "Bloco 1" */
const BLOCO_REGEX = /^[\w\s\-\.]{1,50}$/;

/** Apartamento must be numeric (possibly with leading zeros) like "0077", "101" */
const APTO_REGEX = /^\d{1,10}$/;

/** Data must be YYYY-MM-DD */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Hora must be HH:MM (optional) */
const TIME_REGEX = /^\d{2}:\d{2}$/;

/** Max lengths */
const MAX_BLOCO = 50;
const MAX_APTO = 10;
const MAX_TEXTO = 5000;
const MAX_AUTOR = 100;
const MAX_OBSERVACAO = 2000;
const MAX_NOME = 200;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateBloco(bloco: unknown): string | ValidationError {
  if (typeof bloco !== 'string' || !bloco.trim()) {
    return { field: 'bloco', message: 'Bloco e obrigatorio' };
  }
  const trimmed = bloco.trim();
  if (trimmed.length > MAX_BLOCO) {
    return { field: 'bloco', message: `Bloco muito longo (max ${MAX_BLOCO} caracteres)` };
  }
  if (!BLOCO_REGEX.test(trimmed)) {
    return { field: 'bloco', message: 'Bloco contem caracteres invalidos' };
  }
  return trimmed;
}

export function validateApartamento(apto: unknown): string | ValidationError {
  if (typeof apto !== 'string' || !apto.trim()) {
    return { field: 'apartamento', message: 'Apartamento e obrigatorio' };
  }
  const trimmed = apto.trim();
  if (trimmed.length > MAX_APTO) {
    return { field: 'apartamento', message: `Apartamento muito longo (max ${MAX_APTO} caracteres)` };
  }
  if (!APTO_REGEX.test(trimmed)) {
    return { field: 'apartamento', message: 'Apartamento deve ser numerico' };
  }
  return trimmed;
}

export function validateData(data: unknown): string | ValidationError {
  if (typeof data !== 'string' || !data.trim()) {
    return { field: 'data', message: 'Data e obrigatoria' };
  }
  if (!DATE_REGEX.test(data.trim())) {
    return { field: 'data', message: 'Formato de data invalido (use AAAA-MM-DD)' };
  }
  return data.trim();
}

export function validateHora(hora: unknown): string | null | ValidationError {
  if (hora === null || hora === undefined || hora === '') return null;
  if (typeof hora !== 'string') {
    return { field: 'hora', message: 'Hora invalida' };
  }
  if (!TIME_REGEX.test(hora.trim())) {
    return { field: 'hora', message: 'Formato de hora invalido (use HH:MM)' };
  }
  return hora.trim();
}

export function validateCategoria(cat: unknown): string | ValidationError {
  const valid = ['cyble_antes', 'cyble_depois', 'documento'];
  if (typeof cat !== 'string' || !valid.includes(cat)) {
    return { field: 'categoria', message: `Categoria deve ser: ${valid.join(', ')}` };
  }
  return cat;
}

export function validateId(id: unknown): number | ValidationError {
  const num = typeof id === 'number' ? id : typeof id === 'string' ? parseInt(id, 10) : NaN;
  if (isNaN(num) || num <= 0) {
    return { field: 'id', message: 'ID invalido' };
  }
  return num;
}

export function validateTexto(texto: unknown, maxLength = MAX_TEXTO): string | ValidationError {
  if (typeof texto !== 'string') {
    return { field: 'texto', message: 'Texto invalido' };
  }
  if (texto.length > maxLength) {
    return { field: 'texto', message: `Texto muito longo (max ${maxLength} caracteres)` };
  }
  return texto;
}

export function validateAutor(autor: unknown): string | ValidationError {
  if (typeof autor !== 'string' || !autor.trim()) {
    return { field: 'autor', message: 'Autor e obrigatorio' };
  }
  if (autor.trim().length > MAX_AUTOR) {
    return { field: 'autor', message: `Autor muito longo (max ${MAX_AUTOR} caracteres)` };
  }
  return autor.trim();
}

export function validateObservacao(obs: unknown): string | null | ValidationError {
  if (obs === null || obs === undefined || obs === '') return null;
  if (typeof obs !== 'string') {
    return { field: 'observacao', message: 'Observacao invalida' };
  }
  if (obs.length > MAX_OBSERVACAO) {
    return { field: 'observacao', message: `Observacao muito longa (max ${MAX_OBSERVACAO} caracteres)` };
  }
  return obs;
}

export function validateNome(nome: unknown): string | ValidationError {
  if (typeof nome !== 'string' || !nome.trim()) {
    return { field: 'nome', message: 'Nome e obrigatorio' };
  }
  if (nome.trim().length > MAX_NOME) {
    return { field: 'nome', message: `Nome muito longo (max ${MAX_NOME} caracteres)` };
  }
  return nome.trim();
}

/**
 * Check if a validation result is an error.
 */
export function isValidationError(result: unknown): result is ValidationError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'field' in result &&
    'message' in result
  );
}

/**
 * Sanitize string input: trim, remove null bytes, limit length.
 */
export function sanitize(input: string, maxLength = 1000): string {
  return input
    .replace(/\0/g, '') // remove null bytes
    .trim()
    .slice(0, maxLength);
}
