import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScheduleOverridesEditor from '../ScheduleOverridesEditor';

describe('ScheduleOverridesEditor', () => {
  const defaultProps = {
    overrides: [],
    defaultDueTime: '17:00',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização inicial', () => {
    it('renderiza o título da seção', () => {
      render(<ScheduleOverridesEditor {...defaultProps} />);
      expect(screen.getByText(/Horários por Dia/i)).toBeInTheDocument();
    });

    it('mostra os 7 dias da semana', () => {
      render(<ScheduleOverridesEditor {...defaultProps} />);
      ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].forEach(dia => {
        expect(screen.getByText(dia)).toBeInTheDocument();
      });
    });

    it('mostra horário padrão quando não há overrides', () => {
      render(<ScheduleOverridesEditor {...defaultProps} defaultDueTime="17:00" />);
      // Todos os 7 dias devem mostrar o horário padrão
      const timeInputs = screen.getAllByDisplayValue('17:00');
      expect(timeInputs.length).toBe(7);
    });
  });

  describe('Overrides existentes', () => {
    it('exibe horário customizado para dia com override', () => {
      const overrides = [
        { day_of_week: 6, due_time: '10:00:00', skip_day: false },
      ];
      render(<ScheduleOverridesEditor {...defaultProps} overrides={overrides} defaultDueTime="17:00" />);
      // Sábado deve mostrar 10:00
      const sabadoInput = screen.getByDisplayValue('10:00');
      expect(sabadoInput).toBeTruthy();
      // Outros dias devem mostrar 17:00 (padrão)
      const defaultInputs = screen.getAllByDisplayValue('17:00');
      expect(defaultInputs.length).toBe(6); // 7 dias - 1 override = 6
    });

    it('marca dia como pulado quando skip_day=true', () => {
      const overrides = [
        { day_of_week: 7, due_time: null, skip_day: true },
      ];
      render(<ScheduleOverridesEditor {...defaultProps} overrides={overrides} />);
      // O checkbox de "pular" do domingo deve estar marcado
      const checkboxes = screen.getAllByRole('checkbox');
      const domingoCheckbox = checkboxes[checkboxes.length - 1]; // último = domingo
      expect(domingoCheckbox.checked).toBe(true);
    });
  });

  describe('Interações', () => {
    it('chama onChange ao alterar horário de um dia', () => {
      const onChange = vi.fn();
      render(<ScheduleOverridesEditor {...defaultProps} onChange={onChange} defaultDueTime="17:00" />);
      const timeInputs = screen.getAllByDisplayValue('17:00');
      fireEvent.change(timeInputs[0], { target: { value: '08:00' } });
      expect(onChange).toHaveBeenCalled();
      const newOverrides = onChange.mock.calls[0][0];
      expect(newOverrides).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ day_of_week: 1, due_time: '08:00' })
        ])
      );
    });

    it('chama onChange ao marcar dia como pulado', () => {
      const onChange = vi.fn();
      render(<ScheduleOverridesEditor {...defaultProps} onChange={onChange} defaultDueTime="17:00" />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[6]); // Domingo
      expect(onChange).toHaveBeenCalled();
      const newOverrides = onChange.mock.calls[0][0];
      expect(newOverrides).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ day_of_week: 7, skip_day: true })
        ])
      );
    });

    it('remove override ao voltar para horário padrão', () => {
      const overrides = [
        { day_of_week: 1, due_time: '08:00:00', skip_day: false },
      ];
      const onChange = vi.fn();
      render(<ScheduleOverridesEditor {...defaultProps} overrides={overrides} onChange={onChange} defaultDueTime="17:00" />);
      // Alterar segunda de volta para 17:00 (padrão)
      const segInput = screen.getByDisplayValue('08:00');
      fireEvent.change(segInput, { target: { value: '17:00' } });
      expect(onChange).toHaveBeenCalled();
      const newOverrides = onChange.mock.calls[0][0];
      // Override de segunda deve ser removido (voltou ao padrão)
      expect(newOverrides.find(o => o.day_of_week === 1)).toBeUndefined();
    });
  });
});
