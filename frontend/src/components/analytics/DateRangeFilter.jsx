import { useId } from 'react';
import { CalendarRange } from 'lucide-react';
import { RANGE_PRESETS, presetRange } from '../../utils/dateRange';
import { todayKey } from '../../utils/calendar';

const control = 'bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900';

export function initialRange(preset = '6m') {
  return { preset, ...presetRange(preset) };
}

export default function DateRangeFilter({ value, onChange }) {
  const id = useId();

  function choosePreset(preset) {
    onChange(preset === 'custom' ? { ...value, preset } : { preset, ...presetRange(preset) });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <label htmlFor={`${id}-preset`} className="sr-only">Date range</label>
      <div className="relative">
        <CalendarRange className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        <select id={`${id}-preset`} value={value.preset} onChange={(e) => choosePreset(e.target.value)} className={`${control} pl-9`}>
          {RANGE_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {value.preset === 'custom' && (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            From
            <input type="date" value={value.from} max={value.to || todayKey()} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} className={control} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            To
            <input type="date" value={value.to} min={value.from} max={todayKey()} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} className={control} />
          </label>
        </>
      )}
    </div>
  );
}
