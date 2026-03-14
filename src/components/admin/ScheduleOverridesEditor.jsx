import { Clock } from "lucide-react";

const DIAS = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
];

/**
 * Editor de horários diferenciados por dia da semana.
 *
 * Props:
 * - overrides: Array de { day_of_week, due_time, skip_day }
 * - defaultDueTime: string "HH:MM" — horário padrão do template
 * - onChange: (newOverrides: Array) => void
 */
export default function ScheduleOverridesEditor({ overrides = [], defaultDueTime, onChange }) {
  // Normaliza due_time do override (pode vir como "HH:MM:SS" do DB)
  function normalizeTime(time) {
    if (!time) return '';
    return time.slice(0, 5); // "17:00:00" → "17:00"
  }

  // Horário efetivo para o dia: override ou padrão
  function getTimeForDay(dayOfWeek) {
    const ov = overrides.find(o => o.day_of_week === dayOfWeek);
    if (ov && ov.skip_day) return '';
    if (ov && ov.due_time) return normalizeTime(ov.due_time);
    return normalizeTime(defaultDueTime) || '';
  }

  function isSkipped(dayOfWeek) {
    const ov = overrides.find(o => o.day_of_week === dayOfWeek);
    return !!ov?.skip_day;
  }

  function handleTimeChange(dayOfWeek, newTime) {
    const normalDefault = normalizeTime(defaultDueTime);

    // Se voltou ao padrão, remove o override
    if (newTime === normalDefault) {
      const filtered = overrides.filter(o => o.day_of_week !== dayOfWeek);
      onChange(filtered);
      return;
    }

    // Adiciona/atualiza override
    const existing = overrides.find(o => o.day_of_week === dayOfWeek);
    if (existing) {
      const updated = overrides.map(o =>
        o.day_of_week === dayOfWeek ? { ...o, due_time: newTime, skip_day: false } : o
      );
      onChange(updated);
    } else {
      onChange([...overrides, { day_of_week: dayOfWeek, due_time: newTime, skip_day: false }]);
    }
  }

  function handleSkipToggle(dayOfWeek) {
    const existing = overrides.find(o => o.day_of_week === dayOfWeek);
    if (existing) {
      if (existing.skip_day) {
        // Desmarcar skip → remove override
        const filtered = overrides.filter(o => o.day_of_week !== dayOfWeek);
        onChange(filtered);
      } else {
        // Marcar como skip
        const updated = overrides.map(o =>
          o.day_of_week === dayOfWeek ? { ...o, skip_day: true, due_time: null } : o
        );
        onChange(updated);
      }
    } else {
      // Novo override: pular dia
      onChange([...overrides, { day_of_week: dayOfWeek, due_time: null, skip_day: true }]);
    }
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
      <p className="text-xs font-bold text-indigo-700 uppercase mb-2 flex items-center gap-1.5">
        <Clock size={13} /> Horários por Dia
      </p>
      <div className="space-y-1.5">
        {DIAS.map(dia => {
          const skipped = isSkipped(dia.value);
          const timeValue = getTimeForDay(dia.value);
          const isCustom = overrides.some(o => o.day_of_week === dia.value && !o.skip_day);

          return (
            <div key={dia.value} className="flex items-center gap-2">
              <span className={`text-xs font-bold w-8 ${skipped ? 'text-slate-400 line-through' : isCustom ? 'text-indigo-700' : 'text-slate-600'}`}>
                {dia.short}
              </span>
              <input
                type="time"
                className={`border rounded px-2 py-1 text-sm flex-1 max-w-[120px] ${skipped ? 'bg-slate-100 text-slate-400' : isCustom ? 'bg-indigo-100 border-indigo-300 font-bold text-indigo-800' : 'bg-white border-slate-200'}`}
                value={skipped ? '' : timeValue}
                onChange={e => handleTimeChange(dia.value, e.target.value)}
                disabled={skipped}
              />
              <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipped}
                  onChange={() => handleSkipToggle(dia.value)}
                  className="accent-red-500"
                />
                Pular
              </label>
            </div>
          );
        })}
      </div>
      {overrides.length > 0 && (
        <p className="text-[10px] text-indigo-500 mt-2">
          {overrides.filter(o => !o.skip_day).length} dia(s) com horário diferente
          {overrides.filter(o => o.skip_day).length > 0 && `, ${overrides.filter(o => o.skip_day).length} dia(s) pulado(s)`}
        </p>
      )}
    </div>
  );
}
