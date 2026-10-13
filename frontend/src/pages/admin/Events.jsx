import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CalendarDays, Ban, Eye, Trash2 } from 'lucide-react';
import client from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Alert from '../../components/ui/Alert';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { CardListSkeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table';
import { EVENT_TYPES, EVENT_TYPE_LABEL } from '../../constants/eventTypes';
import { formatDate } from '../../utils/format';

const ARCHIVE_DELETE_AFTER_DAYS = 30;

function daysRemainingInArchive(cancelledAt) {
  const eligibleAt = new Date(cancelledAt).getTime() + ARCHIVE_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return Math.ceil((eligibleAt - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const limit = 15;

  function load() {
    setLoading(true);
    const params = { page, limit, status: statusFilter || 'approved,cancelled' };
    if (search) params.search = search;
    if (eventType) params.event_type = eventType;
    if (from) params.from = from;
    if (to) params.to = to;
    client.get('/proposals', { params }).then((res) => {
      setEvents(res.data.proposals);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [search, eventType, statusFilter, from, to, page]);

  function updateFilter(setter) {
    return (e) => {
      setPage(1);
      setter(e.target.value);
    };
  }

  async function handleCancel(reason) {
    setError('');
    try {
      await client.post(`/proposals/${cancelTarget.id}/cancel`, { reason });
      setCancelTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel event');
    }
  }

  async function handleDelete() {
    setError('');
    try {
      await client.delete(`/proposals/${deleteTarget.id}/archive`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete event');
      setDeleteTarget(null);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Event Management"
        subtitle="Approved events on the campus calendar, and the cancelled-event archive."
      />

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={updateFilter(setSearch)}
            placeholder="Search events..."
            className="w-full bg-surface border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-400"
          />
        </div>
        <select value={eventType} onChange={updateFilter(setEventType)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface">
          <option value="">All Categories</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={updateFilter(setStatusFilter)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface">
          <option value="">Active + Archive</option>
          <option value="approved">Active only</option>
          <option value="cancelled">Archive (Cancelled) only</option>
        </select>
        <input type="date" value={from} onChange={updateFilter(setFrom)} className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm" title="From date" />
        <input type="date" value={to} onChange={updateFilter(setTo)} className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm" title="To date" />
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-6">
            <CardListSkeleton rows={6} />
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No events found" subtitle="Approved proposals will appear here as HEPA approves them." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Date</Th>
                  <Th>Venue</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <TBody>
                {events.map((ev) => {
                  const remaining = ev.status === 'cancelled' ? daysRemainingInArchive(ev.cancelled_at) : null;
                  const deletable = remaining !== null && remaining <= 0;
                  return (
                    <tr key={ev.id}>
                      <Td className="font-medium text-slate-900">{ev.title}</Td>
                      <Td className="text-slate-600">{EVENT_TYPE_LABEL[ev.event_type] || 'Other'}</Td>
                      <Td className="text-slate-600 whitespace-nowrap">{formatDate(ev.event_date)}</Td>
                      <Td className="text-slate-600">{ev.venue || '—'}</Td>
                      <Td><StatusBadge status={ev.status} /></Td>
                      <Td>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <Link to={`/admin/proposals/${ev.id}`} className="text-sm text-navy-700 hover:underline flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          {ev.status === 'approved' && (
                            <button
                              onClick={() => setCancelTarget(ev)}
                              className="text-sm text-red-600 hover:underline flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" /> Cancel
                            </button>
                          )}
                          {ev.status === 'cancelled' && (
                            <button
                              onClick={() => deletable && setDeleteTarget(ev)}
                              disabled={!deletable}
                              title={deletable ? undefined : `Available in ${remaining} more day${remaining === 1 ? '' : 's'} (30-day archive period)`}
                              className="text-sm text-brand-700 hover:underline flex items-center gap-1 disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {deletable ? 'Delete' : `Delete in ${remaining}d`}
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} limit={limit} total={total} onChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Event"
        message={`This will remove "${cancelTarget?.title}" from the public calendar. This is an administrative override — HEPA's original approval stays on record. A reason is required.`}
        confirmLabel="Cancel Event"
        reasonLabel="Reason for Cancellation"
        danger
        requireReason
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Event"
        message={`"${deleteTarget?.title}" has been in the cancelled archive for over 30 days. Permanently deleting it removes the proposal and its documents — the audit log entries for its approval and cancellation remain. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </DashboardLayout>
  );
}
