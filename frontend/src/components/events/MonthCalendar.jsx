import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { eventTypeStyle } from '../../constants/eventTypes';
import { WEEKDAYS, monthGrid, todayKey } from '../../utils/calendar';
import { formatTimeRange } from '../../utils/format';

const MAX_DOTS = 3;

export default function MonthCalendar({ events, onSelectEvent, compact = false }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState(null);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      if (!ev.event_date) continue;
      if (!map.has(ev.event_date)) map.set(ev.event_date, []);
      map.get(ev.event_date).push(ev);
    }
    return map;
  }, [events]);

  const weeks = monthGrid(cursor.year, cursor.month);
  const today = todayKey();
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const selectedEvents = selectedKey ? byDay.get(selectedKey) || [] : [];

  function shiftMonth(delta) {
    setSelectedKey(null);
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedKey(today);
  }

  const cellSize = compact ? 'h-9' : 'h-14 sm:h-24';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900" aria-live="polite">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToday}
            className="px-2 py-1 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-100"
          >
            Today
          </button>
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div role="grid" aria-label={monthLabel}>
        <div role="row" className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} role="columnheader" className="text-center text-xs font-medium text-slate-400 py-1">
              {compact ? d[0] : d}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div key={week[0].key} role="row" className="grid grid-cols-7">
            {week.map(({ date, key, inMonth }) => {
              const dayEvents = byDay.get(key) || [];
              const isToday = key === today;
              const isSelected = key === selectedKey;
              const label = `${date.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}${
                dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''
              }`;

              return (
                <div key={key} role="gridcell" className="p-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedKey(isSelected ? null : key)}
                    aria-label={label}
                    aria-pressed={isSelected}
                    className={`w-full ${cellSize} rounded-md flex flex-col items-center justify-start pt-1 text-sm transition-colors
                      ${isSelected ? 'bg-navy-700 text-white' : isToday ? 'ring-1 ring-brand-500 text-slate-900' : inMonth ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50'}`}
                  >
                    <span className={isToday && !isSelected ? 'font-semibold text-brand-600' : ''}>{date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className={`flex gap-0.5 mt-1 ${compact ? '' : 'sm:hidden'}`} aria-hidden="true">
                        {dayEvents.slice(0, MAX_DOTS).map((ev) => (
                          <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : eventTypeStyle(ev.event_type).dot}`} />
                        ))}
                      </span>
                    )}
                    {!compact && (
                      <span className="hidden sm:flex flex-col gap-0.5 w-full px-1 mt-1" aria-hidden="true">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <span
                            key={ev.id}
                            className={`block truncate text-[10px] leading-4 rounded px-1 text-left ${isSelected ? 'bg-white/20 text-white' : eventTypeStyle(ev.event_type).chip}`}
                          >
                            {ev.title}
                          </span>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className={`text-[10px] leading-4 text-left px-1 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selectedKey && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-400 mb-2">
            {new Date(`${selectedKey}T00:00:00`).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No events on this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="w-full text-left flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:border-navy-300 hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${eventTypeStyle(ev.event_type).dot}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{ev.title}</span>
                      <span className="block text-xs text-slate-500 truncate">
                        {[formatTimeRange(ev.event_time, ev.end_time), ev.venue].filter(Boolean).join(' · ') || ev.club_name}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
