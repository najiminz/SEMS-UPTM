import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Search } from 'lucide-react';
import client from '../../api/client';
import { formatDate, formatMoney, formatTimeRange } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table';

const LIMIT = 15;
const control = 'bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900';
const STATUSES = [
  { value: 'approved,cancelled', label: 'Approved and cancelled' },
  { value: 'approved', label: 'Approved only' },
  { value: 'cancelled', label: 'Cancelled by admin' },
];

export default function ApprovedEvents() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('approved,cancelled');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { status, page, limit: LIMIT };
    if (search.trim()) params.search = search.trim();
    if (from) params.from = from;
    if (to) params.to = to;
    const timer = setTimeout(() => {
      client
        .get('/proposals', { params })
        .then((res) => {
          if (cancelled) return;
          setEvents(res.data.proposals);
          setTotal(res.data.total);
          setError('');
        })
        .catch(() => !cancelled && setError('Could not load events. Please try again.'))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, status, from, to, page]);

  const reset = (setter) => (e) => { setPage(1); setter(e.target.value); };

  return (
    <DashboardLayout>
      <PageHeader title="Approved Events" subtitle="Events HEPA has approved, newest first." />

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input type="search" value={search} onChange={reset(setSearch)} placeholder="Search by event name..." aria-label="Search approved events" className={`${control} w-full pl-9 placeholder:text-slate-400`} />
        </div>
        <label className="sr-only" htmlFor="ev-status">Status</label>
        <select id="ev-status" value={status} onChange={reset(setStatus)} className={control}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">From <input type="date" value={from} onChange={reset(setFrom)} className={control} /></label>
        <label className="flex items-center gap-2 text-sm text-slate-600">To <input type="date" value={to} min={from || undefined} onChange={reset(setTo)} className={control} /></label>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No events found" subtitle="Approved events appear here once you approve a proposal." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Proposal ID</Th>
                  <Th>Event</Th>
                  <Th>Club</Th>
                  <Th>Date &amp; time</Th>
                  <Th>Venue</Th>
                  <Th className="text-right">Budget</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <TBody>
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <Td className="whitespace-nowrap font-mono text-xs text-slate-500">{proposalCode(ev)}</Td>
                    <Td className="min-w-48 max-w-72">
                      <Link to={`/hepa/proposals/${ev.id}`} className="font-medium text-slate-900 hover:text-navy-700 hover:underline line-clamp-2">{ev.title}</Link>
                    </Td>
                    <Td className="text-slate-600">{ev.club_name}</Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {formatDate(ev.event_date)}
                      {formatTimeRange(ev.event_time, ev.end_time) && <span className="block text-xs text-slate-400">{formatTimeRange(ev.event_time, ev.end_time)}</span>}
                    </Td>
                    <Td className="text-slate-600">{ev.venue || '—'}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums text-slate-600">{formatMoney(ev.budget_amount)}</Td>
                    <Td><StatusBadge status={ev.status} /></Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
