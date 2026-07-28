import { describe, it, expect, beforeEach } from 'vitest';
import { getAuthHeaders } from '@/lib/api';

beforeEach(() => {
  localStorage.clear();
});

describe('getAuthHeaders', () => {
  it('retorna objeto vazio quando nao ha PIN', () => {
    expect(getAuthHeaders()).toEqual({});
  });

  it('retorna header com PIN quando salvo', () => {
    localStorage.setItem('vistoria_pin', '4821');
    expect(getAuthHeaders()).toEqual({ 'x-app-pin': '4821' });
  });

  it('retorna header com PIN do viewer', () => {
    localStorage.setItem('vistoria_pin', '1234');
    expect(getAuthHeaders()).toEqual({ 'x-app-pin': '1234' });
  });
});
