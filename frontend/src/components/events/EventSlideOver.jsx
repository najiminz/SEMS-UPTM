import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Download, Eye, Info, Loader2, MapPin, Target, UserCircle, Users, Wallet } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import SlideOver from '../ui/SlideOver';
import Button from '../ui/Button';
import DocumentCard from '../proposal/DocumentCard';
import { EVENT_TYPE_LABEL, eventTypeStyle } from '../../constants/eventTypes';
import { todayKey } from '../../utils/calendar';
import { formatDate, formatFileSize, formatMoney, formatTimeRange } from '../../utils/format';

function Row({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className="text-sm text-slate-800 whitespace-pre-wrap break-words">{children}</dd>
      </div>
    </div>
  );
}

function longDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function whenLabel(dateStr) {
  const today = todayKey();
  if (dateStr === today) return 'Happening today';
  if (dateStr < today) return 'This event has ended';
  const days = Math.round((new Date(`${dateStr}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86_400_000);
  return days === 1 ? 'Tomorrow' : `In ${days} days`;
}

const DETAIL_PATH = {
  hepa_officer: (id) => `/hepa/proposals/${id}`,
  admin: (id) => `/admin/proposals/${id}`,
  club_committee: (id) => `/club/proposals/${id}`,
};

export default function EventSlideOver({ event, onClose }) {
  const { user } = useAuth();
  const style = event ? eventTypeStyle(event.event_type) : null;
  const privileged = Boolean(event) && event.budget_amount != null;
  const [documents, setDocuments] = useState(null);
  const { openDocument, downloadDocument, busyId, error: docError } = useDocumentActions();

  useEffect(() => {
    setDocuments(null);
    if (!privileged) return undefined;
    let cancelled = false;
    client
      .get(`/proposals/${event.id}`)
      .then((res) => !cancelled && setDocuments(res.data.documents))
      .catch(() => !cancelled && setDocuments([]));
    return () => {
      cancelled = true;
    };
  }, [event?.id, privileged]);

  const detailPath = privileged ? DETAIL_PATH[user?.role]?.(event?.id) : null;

  return (
    <SlideOver
      open={!!event}
      onClose={onClose}
      title={event?.title}
      subtitle={event?.club_name}
      footer={
        detailPath && (
          <Link to={detailPath}>
            <Button type="button" className="w-full">View Full Details</Button>
          </Link>
        )
      }
    >
      {event && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.chip}`}>
              {EVENT_TYPE_LABEL[event.event_type] || 'Other'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {whenLabel(event.event_date)}
            </span>
          </div>

          <dl className="space-y-4">
            <Row icon={Users} label="Club">{event.club_name}</Row>
            <Row icon={CalendarDays} label="Date">{longDate(event.event_date)}</Row>
            <Row icon={Clock} label="Time">{formatTimeRange(event.event_time, event.end_time)}</Row>
            <Row icon={MapPin} label="Venue">{event.venue}</Row>
            <Row icon={UserCircle} label="Organizer">{event.contact_person}</Row>
            {privileged && <Row icon={Wallet} label="Approved budget"><strong className="tabular-nums">{formatMoney(event.budget_amount)}</strong></Row>}
          </dl>

          {event.description && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Description</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</p>
            </section>
          )}

          {event.objective && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Objective</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.objective}</p>
            </section>
          )}

          {(event.target_participants || event.estimated_participants) && (
            <dl className="space-y-4 border-t border-slate-100 pt-4">
              <Row icon={Target} label="Who it's for">{event.target_participants}</Row>
              <Row icon={Users} label="Expected participants">
                {event.estimated_participants ? `About ${event.estimated_participants}` : null}
              </Row>
            </dl>
          )}

          {!event.description && !event.objective && (
            <p className="flex items-start gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2.5">
              <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              The organisers haven't added a description for this event yet.
            </p>
          )}

          {privileged && (
            <section aria-labelledby="slide-docs">
              <h3 id="slide-docs" className="text-sm font-semibold text-slate-900 mb-2">Documents</h3>
              {docError && <p role="alert" className="text-sm text-red-600 mb-2">{docError}</p>}
              {documents === null ? (
                <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents were uploaded with this proposal.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((d) => (
                    <li key={d.id}>
                      <DocumentCard name={d.original_name} meta={`${formatFileSize(d.file_size)} · uploaded ${formatDate(d.uploaded_at)}`}>
                        <Button type="button" variant="secondary" size="sm" onClick={() => openDocument(d)} disabled={busyId === d.id}>
                          <Eye className="w-4 h-4" /> Preview
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => downloadDocument(d)} disabled={busyId === d.id}>
                          <Download className="w-4 h-4" /> Download
                        </Button>
                      </DocumentCard>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </SlideOver>
  );
}
