import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, FileEdit, MessageCircleQuestion, Plus, XCircle } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useMyProposals } from '../../hooks/useMyProposals';
import { IN_REVIEW_STATUSES } from '../../constants/proposalStatus';
import { firstName } from '../../utils/greeting';
import { buildTimeline } from '../../utils/timeline';
import { proposalCode } from '../../utils/proposalCode';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import ProposalsTable from '../../components/proposal/ProposalsTable';
import StatusTimeline from '../../components/proposal/StatusTimeline';

const STATS = [
  { key: 'draft', label: 'Draft', icon: FileEdit, tone: 'neutral', filter: 'draft', match: ['draft'] },
  { key: 'review', label: 'Under Review', icon: Clock, tone: 'amber', filter: 'in_review', match: IN_REVIEW_STATUSES },
  { key: 'changes', label: 'Requires Changes', icon: MessageCircleQuestion, tone: 'orange', filter: 'queries', match: ['queries'] },
  { key: 'approved', label: 'Approved', icon: CheckCircle2, tone: 'green', filter: 'approved', match: ['approved'] },
  { key: 'rejected', label: 'Rejected', icon: XCircle, tone: 'red', filter: 'rejected', match: ['rejected'] },
];

function useProposalTracking(proposals) {
  const [trackedId, setTrackedId] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const activeId = trackedId ?? proposals[0]?.id ?? null;

  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    setData(null);
    setError('');
    client
      .get(`/proposals/${activeId}`)
      .then((res) => !cancelled && setData(res.data))
      .catch(() => !cancelled && setError('Could not load this proposal\'s history.'));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  return { trackedId: activeId, setTrackedId, data, error };
}

export default function ClubDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { proposals, loading, error, reload } = useMyProposals();
  const tracking = useProposalTracking(proposals);
  const trackingRef = useRef(null);

  const counts = Object.fromEntries(STATS.map((s) => [s.key, proposals.filter((p) => s.match.includes(p.status)).length]));
  const activeFilter = params.get('status') || 'all';
  const successMessage = location.state?.success;
  const tracked = proposals.find((p) => p.id === tracking.trackedId);

  function toggleFilter(filter) {
    const next = new URLSearchParams(params);
    if (activeFilter === filter) next.delete('status');
    else next.set('status', filter);
    setParams(next, { replace: true });
  }

  function track(p) {
    tracking.setTrackedId(p.id);
    trackingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${firstName(user?.name)} 👋`}
        subtitle={user?.club_name ? `Managing proposals for ${user.club_name}.` : "Track your club's event proposals and their review status."}
        actions={
          <Link to="/club/new">
            <Button size="lg"><Plus className="w-4 h-4" /> Create Proposal</Button>
          </Link>
        }
      />

      {successMessage && <Alert variant="success" className="mb-6">{successMessage}</Alert>}
      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {STATS.map((s) => (
          <StatCard
            key={s.key}
            icon={s.icon}
            label={s.label}
            tone={s.tone}
            value={loading ? '–' : counts[s.key]}
            active={activeFilter === s.filter}
            onClick={() => toggleFilter(s.filter)}
          />
        ))}
      </div>

      <Card padded={false} as="section" aria-labelledby="my-proposals-heading" className="mb-6">
        <div className="p-4 sm:p-6 pb-4">
          <CardHeader
            title="Club Proposals"
            subtitle="Search, filter and sort everything your club has submitted"
            actions={<Link to="/club/proposals" className="text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">View all</Link>}
          />
        </div>
        <ProposalsTable
          proposals={proposals}
          loading={loading}
          pageSize={5}
          onTrack={track}
          trackedId={tracking.trackedId}
          onChanged={reload}
        />
      </Card>

      <div ref={trackingRef} className="scroll-mt-20">
        <Card as="section" aria-labelledby="tracking-heading">
          <CardHeader
            title="Proposal Tracking"
            subtitle="Select a stage to see exactly when it happened and who did it"
            actions={
              tracked && (
                <Link to={`/club/proposals/${tracked.id}`} className="text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">
                  Open details
                </Link>
              )
            }
          />

          {proposals.length === 0 ? (
            <p className="text-sm text-slate-500">Once you create a proposal, its progress will be tracked here.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <label htmlFor="track-select" className="text-sm text-slate-600">Tracking</label>
                <select
                  id="track-select"
                  value={tracking.trackedId ?? ''}
                  onChange={(e) => tracking.setTrackedId(Number(e.target.value))}
                  className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 max-w-full"
                >
                  {proposals.map((p) => (
                    <option key={p.id} value={p.id}>{proposalCode(p)} — {p.title}</option>
                  ))}
                </select>
                {tracked && <StatusBadge status={tracked.status} />}
              </div>

              {tracking.error ? (
                <Alert variant="error">{tracking.error}</Alert>
              ) : !tracking.data ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : (
                <StatusTimeline
                  key={tracking.data.proposal.id}
                  stages={buildTimeline(tracking.data.proposal, tracking.data.activity, { showOptionalRevision: true })}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
