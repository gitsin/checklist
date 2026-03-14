import { describe, it, expect } from 'vitest';
import { resolveOverridesForDay, DIAS_SEMANA } from '../scheduleOverrides';

describe('resolveOverridesForDay', () => {
  const baseOverrides = [
    { day_of_week: 1, due_time: '08:00:00', skip_day: false }, // Seg
    { day_of_week: 6, due_time: '10:00:00', skip_day: false }, // Sáb
    { day_of_week: 7, due_time: null, skip_day: true },        // Dom — pular
  ];

  describe('Resolução de horário', () => {
    it('retorna override de segunda-feira (day_of_week=1)', () => {
      // 2026-03-16 é segunda-feira
      const result = resolveOverridesForDay(baseOverrides, '2026-03-16');
      expect(result).toEqual({ due_time: '08:00:00', skip: false });
    });

    it('retorna override de sábado (day_of_week=6)', () => {
      // 2026-03-14 é sábado
      const result = resolveOverridesForDay(baseOverrides, '2026-03-14');
      expect(result).toEqual({ due_time: '10:00:00', skip: false });
    });

    it('retorna skip=true para domingo (day_of_week=7)', () => {
      // 2026-03-15 é domingo
      const result = resolveOverridesForDay(baseOverrides, '2026-03-15');
      expect(result).toEqual({ due_time: null, skip: true });
    });

    it('retorna null quando não há override para o dia', () => {
      // 2026-03-17 é terça-feira (day_of_week=2), sem override
      const result = resolveOverridesForDay(baseOverrides, '2026-03-17');
      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('retorna null para overrides vazio', () => {
      const result = resolveOverridesForDay([], '2026-03-16');
      expect(result).toBeNull();
    });

    it('retorna null para overrides null/undefined', () => {
      expect(resolveOverridesForDay(null, '2026-03-16')).toBeNull();
      expect(resolveOverridesForDay(undefined, '2026-03-16')).toBeNull();
    });

    it('retorna null para data inválida', () => {
      const result = resolveOverridesForDay(baseOverrides, 'invalid');
      expect(result).toBeNull();
    });
  });
});

describe('DIAS_SEMANA', () => {
  it('mapeia 1=Seg até 7=Dom (convenção ISO/TaskWizard)', () => {
    expect(DIAS_SEMANA[1]).toBe('Segunda');
    expect(DIAS_SEMANA[2]).toBe('Terça');
    expect(DIAS_SEMANA[3]).toBe('Quarta');
    expect(DIAS_SEMANA[4]).toBe('Quinta');
    expect(DIAS_SEMANA[5]).toBe('Sexta');
    expect(DIAS_SEMANA[6]).toBe('Sábado');
    expect(DIAS_SEMANA[7]).toBe('Domingo');
  });
});
