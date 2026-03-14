/**
 * Schedule Overrides — Horários diferenciados por dia da semana
 *
 * Convenção de dia: 1=Seg..7=Dom (ISO 8601 / ISODOW), mesma do TaskWizard.
 */

export const DIAS_SEMANA = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo',
};

/**
 * Retorna o horário efetivo de uma tarefa (checklist_item).
 * Prioridade: effective_due_time (stampado pelo cron) > template.due_time (padrão)
 *
 * @param {Object|null} item - checklist_item com possível effective_due_time e template.due_time
 * @returns {string|null} horário no formato "HH:MM:SS" ou null
 */
export function getEffectiveDueTime(item) {
  if (!item) return null;

  // effective_due_time tem prioridade (stampado pelo cron com override resolvido)
  // "00:00:00" é um valor válido (meia-noite), mas string vazia não é
  if (item.effective_due_time != null && item.effective_due_time !== '') {
    return item.effective_due_time;
  }

  // Fallback para due_time do template
  return item.template?.due_time ?? null;
}

/**
 * Resolve o override aplicável para uma data específica.
 *
 * @param {Array|null} overrides - lista de task_schedule_overrides
 * @param {string} dateStr - data no formato "YYYY-MM-DD"
 * @returns {{ due_time: string|null, skip: boolean }|null} override encontrado ou null
 */
export function resolveOverridesForDay(overrides, dateStr) {
  if (!overrides || !Array.isArray(overrides) || overrides.length === 0) {
    return null;
  }

  const date = new Date(dateStr + 'T12:00:00'); // meio-dia para evitar problemas de timezone
  if (isNaN(date.getTime())) return null;

  // getDay() retorna 0=Dom..6=Sáb; converter para ISO 1=Seg..7=Dom
  const jsDay = date.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const match = overrides.find(o => o.day_of_week === isoDay);
  if (!match) return null;

  return {
    due_time: match.due_time ?? null,
    skip: !!match.skip_day,
  };
}
