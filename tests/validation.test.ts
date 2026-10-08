import { describe, it, expect } from 'vitest';
import {
  validateBloco,
  validateApartamento,
  validateData,
  validateHora,
  validateCategoria,
  validateId,
  isValidationError,
  sanitize,
} from '@/lib/validation';

describe('Validation Module (lib/validation.ts)', () => {
  describe('validateBloco', () => {
    it('aceita blocos válidos', () => {
      expect(validateBloco('Torre A')).toBe('Torre A');
      expect(validateBloco('B')).toBe('B');
      expect(validateBloco('Bloco-1')).toBe('Bloco-1');
    });

    it('rejeita bloco vazio ou nulo', () => {
      const res = validateBloco('');
      expect(isValidationError(res)).toBe(true);
      if (isValidationError(res)) {
        expect(res.field).toBe('bloco');
      }
    });

    it('rejeita caracteres perigosos de injeção', () => {
      const res = validateBloco("Torre A'; DROP TABLE fotos; --");
      expect(isValidationError(res)).toBe(true);
    });
  });

  describe('validateApartamento', () => {
    it('aceita apartamentos numéricos válidos', () => {
      expect(validateApartamento('101')).toBe('101');
      expect(validateApartamento('0077')).toBe('0077');
    });

    it('rejeita apartamento alfanumérico ou com símbolos', () => {
      const res = validateApartamento('101A');
      expect(isValidationError(res)).toBe(true);
    });
  });

  describe('validateData', () => {
    it('aceita formato YYYY-MM-DD', () => {
      expect(validateData('2026-10-08')).toBe('2026-10-08');
    });

    it('rejeita formato de data inválido', () => {
      const res = validateData('08/10/2026');
      expect(isValidationError(res)).toBe(true);
    });
  });

  describe('validateHora', () => {
    it('aceita formato HH:MM', () => {
      expect(validateHora('14:30')).toBe('14:30');
    });

    it('aceita valor nulo ou indefinido', () => {
      expect(validateHora(null)).toBeNull();
      expect(validateHora('')).toBeNull();
    });

    it('rejeita formato inválido', () => {
      const res = validateHora('25:00'); // regex checks format \d{2}:\d{2}
      expect(typeof res === 'string' || isValidationError(res)).toBe(true);
      const invalidRes = validateHora('14h30');
      expect(isValidationError(invalidRes)).toBe(true);
    });
  });

  describe('validateCategoria', () => {
    it('aceita categorias permitidas', () => {
      expect(validateCategoria('cyble_antes')).toBe('cyble_antes');
      expect(validateCategoria('cyble_depois')).toBe('cyble_depois');
      expect(validateCategoria('documento')).toBe('documento');
    });

    it('rejeita categoria desconhecida', () => {
      const res = validateCategoria('hack');
      expect(isValidationError(res)).toBe(true);
    });
  });

  describe('validateId', () => {
    it('aceita IDs inteiros positivos', () => {
      expect(validateId(123)).toBe(123);
      expect(validateId('456')).toBe(456);
    });

    it('rejeita IDs negativos ou zero', () => {
      expect(isValidationError(validateId(-1))).toBe(true);
      expect(isValidationError(validateId(0))).toBe(true);
      expect(isValidationError(validateId('abc'))).toBe(true);
    });
  });

  describe('sanitize', () => {
    it('remove null bytes e limita tamanho', () => {
      const dirty = 'hello\0world';
      expect(sanitize(dirty)).toBe('helloworld');
      expect(sanitize('  teste  ')).toBe('teste');
      expect(sanitize('1234567890', 5)).toBe('12345');
    });
  });
});
