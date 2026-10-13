import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ClipboardList } from 'lucide-react';
import client from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { CardListSkeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table';
import { formatDate } from '../../utils/format';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'queries', label: 'Query (changes requested)' },
  { value: 'resubmitted', label: 'Resubmitted' },
  { value: 'approved', label: 'Approved by HEPA' },
  { value: 'rejected', label: 'Rejected by HEPA' },
  { value: 'cancelled', label: 'Cancelled by Admin' },
];

export default function AdminProposals() {
  const [proposals, setProposals] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [clubId, setClubId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  function load() {
    setLoading(true);
    const params = { page, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    if (clubId) params.club_id = clubId;
    if (from) params.from = from;
    if (to) params.to = to;
    client.get('/proposals', { params }).then((res) => {
      setProposals(res.data.proposals);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [search, status, clubId, from, to, page]);
  useEffect(() => {
    client.get('/clubs').then((res) => setClubs(res.data.clubs));
  }, []);

  function updateFilter(setter) {
    return (e) => {
      setPage(1);
      setter(e.target.value);
    };
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Proposal Monitoring"
        subtitle="Read-only oversight of every proposal — approval decisions belong to HEPA."
      />

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={updateFilter(setSearch)}
            placeholder="Search by proposal title..."
            className="w-full bg-surface border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-400"
          />
        </div>
        <select value={status} onChange={updateFilter(setStatus)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={clubId} onChange={updateFilter(setClubId)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface">
          <option value="">All Clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={updateFilter(setFrom)} className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm" title="From date" />
        <input type="date" value={to} onChange={updateFilter(setTo)} className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm" title="To date" />
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-6">
            <CardListSkeleton rows={6} />
          </div>
        ) : proposals.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No proposals found" subtitle="Try a different search or filter." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Title</Th>
                  <Th>Club</Th>
                  <Th>Event Date</Th>
                  <Th>Status</Th>
                  <Th>Decision By</Th>
                </tr>
              </THead>
              <TBody>
                {proposals.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium text-slate-900">
                      <Link to={`/admin/proposals/${p.id}`} className="hover:underline">{p.title}</Link>
                    </Td>
                    <Td className="text-slate-600">{p.club_name || p.submitted_by_name}</Td>
                    <Td className="text-slate-600 whitespace-nowrap">{formatDate(p.event_date)}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td className="text-slate-500">{p.reviewed_by_name || '—'}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} limit={limit} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
