import { describe, it, expect } from 'vitest';
import { getEffectiveDueTime } from '../scheduleOverrides';

describe('getEffectiveDueTime', () => {
  describe('Prioridade de campos', () => {
    it('retorna effective_due_time do checklist_item quando presente', () => {
      const item = {
        effective_due_time: '10:00:00',
        template: { due_time: '17:00:00' },
      };
      expect(getEffectiveDueTime(item)).toBe('10:00:00');
    });

    it('faz fallback para template.due_time quando effective_due_time é null', () => {
      const item = {
        effective_due_time: null,
        template: { due_time: '17:00:00' },
      };
      expect(getEffectiveDueTime(item)).toBe('17:00:00');
    });

    it('faz fallback para template.due_time quando effective_due_time não existe', () => {
      const item = {
        template: { due_time: '08:30:00' },
      };
      expect(getEffectiveDueTime(item)).toBe('08:30:00');
    });

    it('retorna null quando nem effective_due_time nem template.due_time existem', () => {
      const item = { template: {} };
      expect(getEffectiveDueTime(item)).toBeNull();
    });

    it('retorna null quando template é null', () => {
      const item = { template: null };
      expect(getEffectiveDueTime(item)).toBeNull();
    });

    it('retorna null quando item é null/undefined', () => {
      expect(getEffectiveDueTime(null)).toBeNull();
      expect(getEffectiveDueTime(undefined)).toBeNull();
    });
  });

  describe('Valores edge case', () => {
    it('retorna effective_due_time mesmo sendo "00:00:00" (meia-noite)', () => {
      const item = {
        effective_due_time: '00:00:00',
        template: { due_time: '17:00:00' },
      };
      expect(getEffectiveDueTime(item)).toBe('00:00:00');
    });

    it('ignora effective_due_time vazia (string vazia)', () => {
      const item = {
        effective_due_time: '',
        template: { due_time: '17:00:00' },
      };
      expect(getEffectiveDueTime(item)).toBe('17:00:00');
    });
  });
});
