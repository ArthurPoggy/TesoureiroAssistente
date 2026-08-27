import { describe, it, expect } from 'vitest';
import { formatDate } from '../utils/formatters';

describe('formatDate', () => {
  it('formata uma data ISO válida no padrão pt-BR (dd/mm/aaaa)', () => {
    expect(formatDate('2026-08-09')).toBe('09/08/2026');
  });

  it("retorna '-' para valor vazio", () => {
    expect(formatDate('')).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });

  it("retorna '-' para valor inválido", () => {
    expect(formatDate('data-invalida')).toBe('-');
  });
});
