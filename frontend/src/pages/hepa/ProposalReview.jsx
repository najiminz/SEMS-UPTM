import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Clock, MessageCircleQuestion, Search, XCircle } from 'lucide-react';
import { useReviewQueue } from '../../hooks/useReviewQueue';
import { IN_REVIEW_STATUSES } from '../../constants/proposalStatus';
import { proposalPriority } from '../../utils/priority';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import ProposalCard from '../../components/review/ProposalCard';
import ReviewPanel from '../../components/review/ReviewPanel';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All in queue' },
  { value: 'pending', label: 'Awaiting my review' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resubmitted', label: 'Resubmitted' },
  { value: 'queries', label: 'Queried (with committee)' },
];

const BUDGET_OPTIONS = [
  { value: 'any', label: 'Any budget' },
  { value: 'lt500', label: 'Under RM 500', max: 500 },
  { value: 'b500', label: 'RM 500 – 2,000', min: 500, max: 2000 },
  { value: 'b2000', label: 'RM 2,000 – 5,000', min: 2000, max: 5000 },
  { value: 'gt5000', label: 'RM 5,000 and above', min: 5000 },
];

const SORTS = [
  { value: 'priority', label: 'Most urgent first', compare: (a, b) => (proposalPriority(a)?.rank ?? 9) - (proposalPriority(b)?.rank ?? 9) || String(a.submitted_at).localeCompare(String(b.submitted_at)) },
  { value: 'oldest', label: 'Oldest submission', compare: (a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)) },
  { value: 'event', label: 'Event date (soonest)', compare: (a, b) => (a.event_date || '9999').localeCompare(b.event_date || '9999') },
  { value: 'budget', label: 'Budget (high to low)', compare: (a, b) => Number(b.budget_amount) - Number(a.budget_amount) },
];

const control = 'bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900';

function matchesStatus(p, status) {
  if (status === 'all') return true;
  if (status === 'pending') return IN_REVIEW_STATUSES.includes(p.status);
  return p.status === status;
}

export default function ProposalReview() {
  const { proposals, truncated, stats, loading, error, reload } = useReviewQueue();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || 'pending';
  const openId = Number(params.get('open')) || null;

  const [budget, setBudget] = useState('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('priority');

  function setParam(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  }

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const band = BUDGET_OPTIONS.find((b) => b.value === budget);
    const compare = SORTS.find((s) => s.value === sort).compare;
    return proposals
      .filter((p) => matchesStatus(p, status))
      .filter((p) => !term || `${p.title} ${p.club_name}`.toLowerCase().includes(term))
      .filter((p) => !from || (p.event_date && p.event_date.slice(0, 10) >= from))
      .filter((p) => !to || (p.event_date && p.event_date.slice(0, 10) <= to))
      .filter((p) => (band.min === undefined || Number(p.budget_amount) >= band.min) && (band.max === undefined || Number(p.budget_amount) < band.max))
      .sort(compare);
  }, [proposals, q, status, budget, from, to, sort]);

  const filtersActive = q || status !== 'pending' || budget !== 'any' || from || to;
  const openIndex = visible.findIndex((p) => p.id === openId);

  function clearFilters() {
    setBudget('any');
    setFrom('');
    setTo('');
    setParams(new URLSearchParams(), { replace: true });
  }

  function moveTo(index) {
    if (visible[index]) setParam({ open: visible[index].id });
  }

  function handleDecided() {
    const next = visible[openIndex + 1] || visible[openIndex - 1] || null;
    setParam({ open: next?.id || '' });
    reload();
  }

  return (
    <DashboardLayout>
      <PageHeader title="Proposal Review" subtitle="Work through the proposals waiting on a HEPA decision." />

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} label="Pending Review" tone="amber" value={stats ? stats.pending : '–'} active={status === 'pending'} onClick={() => setParam({ status: status === 'pending' ? 'all' : '' })} />
        <StatCard icon={MessageCircleQuestion} label="Queried" tone="orange" value={stats ? stats.queried : '–'} active={status === 'queries'} onClick={() => setParam({ status: status === 'queries' ? 'all' : 'queries' })} />
        <StatCard icon={CheckCircle2} label="Approved This Month" tone="green" value={stats ? stats.approvedThisMonth : '–'} />
        <StatCard icon={XCircle} label="Rejected This Month" tone="red" value={stats ? stats.rejectedThisMonth : '–'} />
      </div>

      <section aria-label="Filters" className="bg-surface border border-slate-200 rounded-lg p-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-12">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setParam({ q: e.target.value })}
              placeholder="Search event or club..."
              aria-label="Search proposals by event or club"
              className={`${control} w-full pl-9 placeholder:text-slate-400`}
            />
          </div>
          <div className="lg:col-span-4">
            <label htmlFor="f-status" className="sr-only">Status</label>
            <select id="f-status" value={status} onChange={(e) => setParam({ status: e.target.value === 'pending' ? '' : e.target.value })} className={`${control} w-full`}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="lg:col-span-4">
            <label htmlFor="f-budget" className="sr-only">Budget</label>
            <select id="f-budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={`${control} w-full`}>
              {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="f-sort" className="sr-only">Sort</label>
            <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value)} className={`${control} w-full`}>
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-12 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm text-slate-500">Event date</span>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={control} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={control} />
            </label>
            {filtersActive && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        </div>
      </section>

      {!loading && (
        <p className="text-sm text-slate-500 mb-3" role="status" aria-live="polite">
          Showing {visible.length} of {proposals.length} proposal{proposals.length === 1 ? '' : 's'} in the queue
          {truncated && ' (the first 100 — narrow the filters to see the rest)'}
        </p>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={proposals.length === 0 ? 'Nothing to review' : 'No proposals match these filters'}
          subtitle={proposals.length === 0 ? 'New and resubmitted proposals from club committees will show up here.' : 'Try widening the filters.'}
          action={filtersActive && proposals.length > 0 ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p) => (
            <ProposalCard key={p.id} proposal={p} selected={p.id === openId} onOpen={(proposal) => setParam({ open: proposal.id })} />
          ))}
        </div>
      )}

      {openId && (
        <ReviewPanel
          proposalId={openId}
          position={openIndex >= 0 ? `${openIndex + 1} of ${visible.length}` : undefined}
          onClose={() => setParam({ open: '' })}
          onPrev={openIndex > 0 ? () => moveTo(openIndex - 1) : undefined}
          onNext={openIndex >= 0 && openIndex < visible.length - 1 ? () => moveTo(openIndex + 1) : undefined}
          onStarted={reload}
          onDecided={handleDecided}
        />
      )}
    </DashboardLayout>
  );
}
