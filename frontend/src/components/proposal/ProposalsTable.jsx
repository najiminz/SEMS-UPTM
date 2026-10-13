import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Plus, Route, Search, Trash2, ClipboardList } from 'lucide-react';
import client from '../../api/client';
import { EDITABLE_STATUSES, STATUS_FILTERS, matchesStatusFilter } from '../../constants/proposalStatus';
import { proposalCode } from '../../utils/proposalCode';
import { formatDate, formatMoney } from '../../utils/format';
import { Table, THead, TBody, Th, Td } from '../ui/Table';
import StatusBadge from '../ui/StatusBadge';
import Pagination from '../ui/Pagination';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import ConfirmModal from '../ui/ConfirmModal';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../EmptyState';

const SORTS = [
  { value: 'updated', label: 'Recently updated', compare: (a, b) => String(b.updated_at).localeCompare(String(a.updated_at)) },
  { value: 'newest', label: 'Newest first', compare: (a, b) => b.id - a.id },
  { value: 'date_asc', label: 'Event date (soonest)', compare: (a, b) => (a.event_date || '9999').localeCompare(b.event_date || '9999') },
  { value: 'date_desc', label: 'Event date (latest)', compare: (a, b) => (b.event_date || '').localeCompare(a.event_date || '') },
  { value: 'budget_desc', label: 'Budget (high to low)', compare: (a, b) => Number(b.budget_amount) - Number(a.budget_amount) },
  { value: 'budget_asc', label: 'Budget (low to high)', compare: (a, b) => Number(a.budget_amount) - Number(b.budget_amount) },
  { value: 'name_asc', label: 'Event name (A–Z)', compare: (a, b) => a.title.localeCompare(b.title) },
];

const controlClasses = 'bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900';
const selectClasses = `${controlClasses} lg:w-44 shrink-0`;

function IconAction({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors"
      {...props}
    >
      {children}
    </button>
  );
}

export default function ProposalsTable({ proposals, loading, pageSize = 10, onTrack, trackedId, onChanged }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || 'all';
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState('');

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
    setPage(1);
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const compare = SORTS.find((s) => s.value === sort).compare;
    return proposals
      .filter((p) => matchesStatusFilter(p.status, status))
      .filter((p) => !term || `${proposalCode(p)} ${p.title}`.toLowerCase().includes(term))
      .sort(compare);
  }, [proposals, q, status, sort]);

  const lastPage = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const safePage = Math.min(page, lastPage);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function confirmDelete() {
    setError('');
    try {
      await client.delete(`/proposals/${toDelete.id}`);
      setToDelete(null);
      onChanged?.();
    } catch (err) {
      setToDelete(null);
      setError(err.response?.data?.message || 'Could not delete the draft.');
    }
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-3 px-4 sm:px-6 pb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search by event name or proposal ID..."
            aria-label="Filter proposals by name or ID"
            className={`${controlClasses} w-full pl-9 placeholder:text-slate-400`}
          />
        </div>
        <label className="sr-only" htmlFor="status-filter">Filter by status</label>
        <select id="status-filter" value={status} onChange={(e) => setParam('status', e.target.value)} className={selectClasses}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sort-by">Sort proposals</label>
        <select id="sort-by" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={selectClasses}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="px-4 sm:px-6 pb-4"><Alert variant="error">{error}</Alert></div>}

      {loading ? (
        <div className="px-4 sm:px-6 pb-6 space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No proposals yet"
          subtitle="Create your first event proposal to get started."
          action={
            <Link to="/club/new">
              <Button><Plus className="w-4 h-4" /> Create Proposal</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No proposals match" subtitle="Try a different search or clear the status filter." />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>Proposal ID</Th>
                <Th>Event Name</Th>
                <Th>Event Date</Th>
                <Th className="text-right">Budget</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((p) => (
                <tr key={p.id} className={`transition-colors hover:bg-slate-50 ${trackedId === p.id ? 'bg-slate-100/70' : ''}`}>
                  <Td className="whitespace-nowrap text-slate-500 font-mono text-xs">{proposalCode(p)}</Td>
                  <Td className="min-w-44 max-w-64">
                    <Link to={`/club/proposals/${p.id}`} className="font-medium text-slate-900 hover:text-navy-700 hover:underline line-clamp-2">
                      {p.title}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDate(p.event_date) || '—'}</Td>
                  <Td className="whitespace-nowrap text-right text-slate-600 tabular-nums">{formatMoney(p.budget_amount)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDate(p.submitted_at) || '—'}</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-0.5">
                      <Link to={`/club/proposals/${p.id}`} aria-label={`View ${p.title}`} title="View" className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {EDITABLE_STATUSES.includes(p.status) && (
                        <Link to={`/club/proposals/${p.id}/edit`} aria-label={`Edit ${p.title}`} title="Edit" className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                      {onTrack && (
                        <IconAction label={`Track ${p.title}`} onClick={() => onTrack(p)}>
                          <Route className="w-4 h-4" />
                        </IconAction>
                      )}
                      {p.status === 'draft' && (
                        <IconAction label={`Delete draft ${p.title}`} onClick={() => setToDelete(p)}>
                          <Trash2 className="w-4 h-4" />
                        </IconAction>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
          <Pagination page={safePage} limit={pageSize} total={filtered.length} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete draft"
        message={`“${toDelete?.title}” and its uploaded files will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete draft"
        danger
      />
    </div>
  );
}
