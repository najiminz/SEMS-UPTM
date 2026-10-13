import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Clock, Inbox, MessageCircleQuestion, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useReviewQueue } from '../../hooks/useReviewQueue';
import { IN_REVIEW_STATUSES } from '../../constants/proposalStatus';
import { firstName, greeting } from '../../utils/greeting';
import { formatDate } from '../../utils/format';
import { proposalPriority } from '../../utils/priority';
import { proposalCode } from '../../utils/proposalCode';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import ProposalCard from '../../components/review/ProposalCard';

const ATTENTION_SHOWN = 3;

export default function HepaDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { proposals, stats, loading, error } = useReviewQueue();

  const attention = useMemo(
    () =>
      proposals
        .filter((p) => IN_REVIEW_STATUSES.includes(p.status))
        .sort((a, b) => (proposalPriority(a)?.rank ?? 9) - (proposalPriority(b)?.rank ?? 9) || String(a.submitted_at).localeCompare(String(b.submitted_at)))
        .slice(0, ATTENTION_SHOWN),
    [proposals]
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={`${greeting()}, ${firstName(user?.name)} 👋`}
        subtitle="Here's where the review queue stands today."
        actions={<Link to="/hepa/review"><Button size="lg">Open Proposal Review</Button></Link>}
      />

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} label="Pending Review" tone="amber" value={stats ? stats.pending : '–'} onClick={() => navigate('/hepa/review')} />
        <StatCard icon={MessageCircleQuestion} label="Queried" tone="orange" value={stats ? stats.queried : '–'} onClick={() => navigate('/hepa/review?status=queries')} />
        <StatCard icon={CheckCircle2} label="Approved This Month" tone="green" value={stats ? stats.approvedThisMonth : '–'} onClick={() => navigate('/hepa/events')} />
        <StatCard icon={XCircle} label="Rejected This Month" tone="red" value={stats ? stats.rejectedThisMonth : '–'} />
      </div>

      <section aria-labelledby="attention-heading" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 id="attention-heading" className="text-base font-semibold text-slate-900">Needs your attention</h2>
          <Link to="/hepa/review" className="text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">See the full queue</Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}</div>
        ) : attention.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="You're all caught up" subtitle="Nothing is waiting on a HEPA decision right now." /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {attention.map((p) => (
              <ProposalCard key={p.id} proposal={p} onOpen={(proposal) => navigate(`/hepa/review?open=${proposal.id}`)} />
            ))}
          </div>
        )}
      </section>

      <Card padded={false} as="section" aria-label="Recent submissions">
        <div className="p-6 pb-2">
          <CardHeader title="Recent submissions" subtitle="Latest proposal activity across all statuses" />
        </div>
        {loading ? (
          <div className="p-6 pt-2"><Skeleton className="h-16 rounded-lg" /></div>
        ) : !stats || stats.recent.length === 0 ? (
          <EmptyState icon={Inbox} title="No submissions yet" subtitle="Proposals from club committees will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.recent.map((p) => (
              <li key={p.id}>
                <Link to={`/hepa/proposals/${p.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors group">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900 truncate">{p.title}</span>
                    <span className="block text-sm text-slate-500 truncate">
                      {proposalCode(p)} · {p.submitted_by_name} · {formatDate(p.event_date) || 'No date'}
                    </span>
                  </span>
                  <StatusBadge status={p.status} />
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}
