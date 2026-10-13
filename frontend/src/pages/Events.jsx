import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Search } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { todayKey } from '../utils/calendar';
import { EVENT_TYPES } from '../constants/eventTypes';
import DashboardLayout from '../components/layout/DashboardLayout';
import PageHeader from '../components/ui/PageHeader';
import Alert from '../components/ui/Alert';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/EmptyState';
import EventCard from '../components/events/EventCard';
import EventSlideOver from '../components/events/EventSlideOver';

export default function Events() {
  const { events, loading, error } = useEvents();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || 'all';
  const showPast = params.get('past') === '1';
  const openId = params.get('event');

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value == null || value === 'all') next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const today = todayKey();
    const term = q.trim().toLowerCase();
    return events.filter((ev) => {
      if (!showPast && ev.event_date < today) return false;
      if (category !== 'all' && ev.event_type !== category) return false;
      if (!term) return true;
      return [ev.title, ev.venue, ev.club_name].some((v) => (v || '').toLowerCase().includes(term));
    });
  }, [events, q, category, showPast]);

  const selected = events.find((ev) => String(ev.id) === openId) || null;

  return (
    <DashboardLayout>
      <PageHeader title="Events" subtitle="Browse HEPA-approved events happening around UPTM." />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search by event, club or venue..."
            aria-label="Search events"
            className="w-full bg-surface border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-400"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => update({ past: e.target.checked ? '1' : '' })}
            className="w-4 h-4 rounded border-slate-300 accent-brand-600"
          />
          Show past events
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by category">
        {[{ value: 'all', label: 'All Events' }, ...EVENT_TYPES].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update({ category: t.value })}
            aria-pressed={category === t.value}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === t.value
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-surface border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={events.length === 0 ? 'No events yet' : 'No events match your search'}
          subtitle={
            events.length === 0
              ? 'Approved events from club committees will appear here once HEPA signs off on them.'
              : 'Try a different keyword or category, or include past events.'
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} onOpen={(e) => update({ event: String(e.id) })} />
          ))}
        </div>
      )}

      <EventSlideOver event={selected} onClose={() => update({ event: '' })} />
    </DashboardLayout>
  );
}
