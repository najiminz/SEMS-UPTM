import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import { EVENT_TYPES, EVENT_TYPE_LABEL } from '../../constants/eventTypes';
import { WEEKDAYS, dateKey, monthGrid, todayKey } from '../../utils/calendar';
import { formatTime, formatTimeRange } from '../../utils/format';
import Button from '../ui/Button';
import EmptyState from '../EmptyState';
import EventSlideOver from './EventSlideOver';

const VIEWS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'list', label: 'List' },
];
const MAX_PER_CELL = 3;
const control = 'bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900';

const parseKey = (key) => new Date(`${key}T00:00:00`);
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const mondayOf = (date) => addDays(date, -((date.getDay() + 6) % 7));
const longDay = (key) => parseKey(key).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function EventChip({ ev, onOpen, past, roomy = false }) {
  const time = formatTime(ev.event_time);
  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className={`w-full text-left rounded-md border-l-[3px] border-navy-600 dark:border-navy-300 bg-slate-100/70 hover:bg-slate-200/70 transition-colors px-2 py-1 ${past ? 'opacity-60' : ''}`}
      aria-label={`${ev.title}, ${time || 'time to be announced'}, ${ev.club_name}`}
    >
      <span className="block text-xs font-medium text-slate-900 truncate">{ev.title}</span>
      <span className="block text-[11px] leading-4 text-slate-500 truncate">
        {time ? `${time} · ` : ''}{ev.club_name}
      </span>
      {roomy && (
        <span className="block text-[11px] leading-4 text-slate-400 truncate">
          {EVENT_TYPE_LABEL[ev.event_type] || 'Other'}{ev.venue ? ` · ${ev.venue}` : ''}
        </span>
      )}
    </button>
  );
}

function MonthView({ cursor, byDay, today, onOpen, onShowWeek }) {
  const weeks = monthGrid(cursor.getFullYear(), cursor.getMonth());
  return (
    <div role="grid" aria-label="Month calendar" className="border border-slate-200 rounded-lg overflow-hidden">
      <div role="row" className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="py-2 text-center text-xs font-medium text-slate-500">{d}</div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0].key} role="row" className="grid grid-cols-7 border-b border-slate-200 last:border-b-0">
          {week.map(({ date, key, inMonth }) => {
            const events = byDay.get(key) || [];
            const isToday = key === today;
            return (
              <div
                key={key}
                role="gridcell"
                className={`min-h-28 p-1.5 border-r border-slate-200 last:border-r-0 ${inMonth ? 'bg-surface' : 'bg-slate-50/60'}`}
              >
                <p className={`text-xs mb-1 ${isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white font-semibold' : inMonth ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                  {date.getDate()}
                  {isToday && <span className="sr-only"> (today)</span>}
                </p>
                <div className="space-y-1">
                  {events.slice(0, MAX_PER_CELL).map((ev) => (
                    <EventChip key={ev.id} ev={ev} onOpen={onOpen} past={key < today} />
                  ))}
                  {events.length > MAX_PER_CELL && (
                    <button
                      type="button"
                      onClick={() => onShowWeek(date)}
                      className="w-full text-left text-[11px] font-medium text-navy-700 dark:text-navy-300 hover:underline px-1"
                    >
                      +{events.length - MAX_PER_CELL} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekView({ cursor, byDay, today, onOpen }) {
  const start = mondayOf(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 border border-slate-200 rounded-lg overflow-hidden">
      {days.map((date) => {
        const key = dateKey(date);
        const events = byDay.get(key) || [];
        const isToday = key === today;
        return (
          <section
            key={key}
            aria-label={longDay(key)}
            className={`p-2.5 border-b sm:border-b-0 sm:border-r border-slate-200 last:border-0 min-h-24 sm:min-h-72 ${isToday ? 'bg-navy-50/40 dark:bg-slate-100/40' : 'bg-surface'}`}
          >
            <p className="text-xs text-slate-500 mb-2">
              {date.toLocaleDateString('en-MY', { weekday: 'short' })}{' '}
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold ${isToday ? 'bg-brand-600 text-white' : 'text-slate-900'}`}>
                {date.getDate()}
              </span>
              {isToday && <span className="sr-only"> (today)</span>}
            </p>
            <div className="space-y-1.5">
              {events.length === 0 ? (
                <p className="text-xs text-slate-300 sm:hidden">No events</p>
              ) : (
                events.map((ev) => <EventChip key={ev.id} ev={ev} onOpen={onOpen} past={key < today} roomy />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ListView({ events, today, onOpen }) {
  const groups = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.key === ev.event_date) last.items.push(ev);
    else groups.push({ key: ev.event_date, items: [ev] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} aria-label={longDay(g.key)}>
          <h3 className={`text-sm font-semibold mb-2 ${g.key === today ? 'text-brand-600' : 'text-slate-700'}`}>
            {longDay(g.key)}{g.key === today && ' · Today'}
          </h3>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-surface">
            {g.items.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onOpen(ev)}
                  className={`w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${g.key < today ? 'opacity-60' : ''}`}
                >
                  <span className="w-28 shrink-0 text-sm text-slate-500 tabular-nums">{formatTimeRange(ev.event_time, ev.end_time) || 'Time TBA'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900 truncate">{ev.title}</span>
                    <span className="block text-sm text-slate-500 truncate">
                      {ev.club_name}
                      {ev.venue && <> · <MapPin className="inline w-3 h-3 -mt-0.5" aria-hidden="true" /> {ev.venue}</>}
                    </span>
                  </span>
                  <span className="hidden sm:block shrink-0 text-xs text-slate-500">{EVENT_TYPE_LABEL[ev.event_type] || 'Other'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function EventCalendar({ events }) {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.value === params.get('view')) ? params.get('view') : 'month';
  const q = params.get('q') || '';
  const club = params.get('club') || '';
  const category = params.get('category') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const today = todayKey();
  const cursor = parseKey(/^\d{4}-\d{2}-\d{2}$/.test(params.get('d') || '') ? params.get('d') : today);
  const openId = params.get('event');

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  }

  const clubs = useMemo(() => [...new Set(events.map((e) => e.club_name).filter(Boolean))].sort(), [events]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter((ev) => {
      if (club && ev.club_name !== club) return false;
      if (category && ev.event_type !== category) return false;
      if (from && ev.event_date < from) return false;
      if (to && ev.event_date > to) return false;
      if (!term) return true;
      return [ev.title, ev.club_name, ev.venue].some((v) => (v || '').toLowerCase().includes(term));
    });
  }, [events, q, club, category, from, to]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const ev of filtered) {
      if (!map.has(ev.event_date)) map.set(ev.event_date, []);
      map.get(ev.event_date).push(ev);
    }
    return map;
  }, [filtered]);

  const listEvents = useMemo(() => {
    if (from || to) return filtered;
    const prefix = dateKey(cursor).slice(0, 7);
    return filtered.filter((ev) => ev.event_date.startsWith(prefix));
  }, [filtered, from, to, cursor]);

  const rangeActive = Boolean(from || to);
  const monthName = cursor.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const weekStart = mondayOf(cursor);
  const weekEnd = addDays(weekStart, 6);
  const title = view === 'week'
    ? `${weekStart.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : view === 'list' && rangeActive ? 'Filtered range' : monthName;

  function shift(direction) {
    const next = view === 'week'
      ? addDays(cursor, 7 * direction)
      : new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
    update({ d: dateKey(next) });
  }

  const filtersActive = q || club || category || from || to;
  const selected = events.find((e) => String(e.id) === openId) || null;
  const nothingToShow = view === 'list' ? listEvents.length === 0 : filtered.length === 0;

  return (
    <div>
      <section aria-label="Filters" className="bg-surface border border-slate-200 rounded-lg p-4 mb-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-12">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search events, clubs or venues..." aria-label="Search events" className={`${control} w-full pl-9 placeholder:text-slate-400`} />
          </div>
          <div className="lg:col-span-3">
            <label htmlFor="cal-club" className="sr-only">Club</label>
            <select id="cal-club" value={club} onChange={(e) => update({ club: e.target.value })} className={`${control} w-full`}>
              <option value="">All clubs</option>
              {clubs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="lg:col-span-3">
            <label htmlFor="cal-category" className="sr-only">Category</label>
            <select id="cal-category" value={category} onChange={(e) => update({ category: e.target.value })} className={`${control} w-full`}>
              <option value="">All categories</option>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <label className="lg:col-span-3 flex items-center gap-2 text-sm text-slate-600">
            From <input type="date" value={from} onChange={(e) => update({ from: e.target.value, d: e.target.value || params.get('d') })} className={`${control} flex-1 min-w-0`} />
          </label>
          <label className="lg:col-span-3 flex items-center gap-2 text-sm text-slate-600">
            To <input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} className={`${control} flex-1 min-w-0`} />
          </label>
        </div>
        {filtersActive && (
          <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
            <span role="status">{filtered.length} of {events.length} events match</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => update({ q: '', club: '', category: '', from: '', to: '' })}>Clear filters</Button>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} aria-label={`Previous ${view === 'week' ? 'week' : 'month'}`} className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label={`Next ${view === 'week' ? 'week' : 'month'}`} className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <Button type="button" variant="secondary" size="sm" onClick={() => update({ d: '' })}>Today</Button>
          <h2 className="ml-2 text-lg font-semibold text-slate-900" aria-live="polite">{title}</h2>
        </div>

        <div role="group" aria-label="Calendar view" className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => update({ view: v.value === 'month' ? '' : v.value })}
              aria-pressed={view === v.value}
              className={`px-3.5 py-1.5 text-sm font-medium transition-colors border-r border-slate-300 last:border-r-0 ${view === v.value ? 'bg-navy-700 text-white' : 'bg-surface text-slate-600 hover:bg-slate-50'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {nothingToShow && view === 'list' ? (
        <EmptyState icon={CalendarDays} title="No events to list" subtitle={filtersActive ? 'Nothing matches the current filters.' : 'No approved events fall in this month.'} />
      ) : view === 'month' ? (
        <>
          <div className="hidden sm:block">
            <MonthView cursor={cursor} byDay={byDay} today={today} onOpen={(ev) => update({ event: ev.id })} onShowWeek={(date) => update({ view: 'week', d: dateKey(date) })} />
          </div>
          <div className="sm:hidden">
            {listEvents.length === 0
              ? <EmptyState icon={CalendarDays} title="No events this month" />
              : <ListView events={listEvents} today={today} onOpen={(ev) => update({ event: ev.id })} />}
          </div>
        </>
      ) : view === 'week' ? (
        <WeekView cursor={cursor} byDay={byDay} today={today} onOpen={(ev) => update({ event: ev.id })} />
      ) : (
        <ListView events={listEvents} today={today} onOpen={(ev) => update({ event: ev.id })} />
      )}

      <EventSlideOver event={selected} onClose={() => update({ event: '' })} />
    </div>
  );
}
