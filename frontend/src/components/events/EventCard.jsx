import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { EVENT_TYPE_LABEL, eventTypeStyle } from '../../constants/eventTypes';
import { formatDate, formatTimeRange } from '../../utils/format';

export default function EventCard({ event, onOpen }) {
  const time = formatTimeRange(event.event_time, event.end_time);
  const style = eventTypeStyle(event.event_type);

  return (
    <article className="group relative flex flex-col bg-surface border border-slate-200 rounded-lg p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-navy-300 focus-within:border-navy-400">
      <span className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${style.chip}`}>
        {EVENT_TYPE_LABEL[event.event_type] || 'Other'}
      </span>

      <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{event.title}</h3>
      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{event.club_name}</span>
      </p>

      <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Date</dt>
          <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <dd>{formatDate(event.event_date)}</dd>
        </div>
        {time && (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Time</dt>
            <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <dd>{time}</dd>
          </div>
        )}
        {event.venue && (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Venue</dt>
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <dd className="truncate">{event.venue}</dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        onClick={() => onOpen(event)}
        aria-label={`View event: ${event.title}`}
        className="mt-4 self-start text-sm font-medium text-navy-700 dark:text-navy-300 group-hover:underline after:absolute after:inset-0 after:rounded-lg"
      >
        View Event
      </button>
    </article>
  );
}
