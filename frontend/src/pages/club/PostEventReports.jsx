import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardCheck } from 'lucide-react';
import client from '../../api/client';
import { useMyProposals } from '../../hooks/useMyProposals';
import { formatDate } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import SlideOver from '../../components/ui/SlideOver';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import PostEventReportForm from '../../components/proposal/PostEventReportForm';
import { todayKey } from '../../utils/calendar';

export default function PostEventReports() {
  const { proposals, loading, error, reload } = useMyProposals();
  const [active, setActive] = useState(null);
  const [loadingReport, setLoadingReport] = useState(null);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState('');

  const events = proposals.filter((p) => p.status === 'approved');
  const pending = events.filter((p) => !p.has_report);
  const filed = events.filter((p) => p.has_report);

  async function open(proposal) {
    setFormError('');
    setDone('');
    if (!proposal.has_report) {
      setActive({ proposal, report: null });
      return;
    }
    setLoadingReport(proposal.id);
    try {
      const res = await client.get(`/reports/${proposal.id}`);
      setActive({ proposal, report: res.data.report });
    } catch {
      setFormError('Could not load that report. Please try again.');
    } finally {
      setLoadingReport(null);
    }
  }

  function renderRow(p, label) {
    const past = p.event_date && p.event_date < todayKey();
    return (
      <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4">
        <div className="min-w-0 flex-1">
          <Link to={`/club/proposals/${p.id}`} className="font-medium text-slate-900 hover:text-navy-700 hover:underline">{p.title}</Link>
          <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="font-mono text-xs">{proposalCode(p)}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> {formatDate(p.event_date)}</span>
            {!p.has_report && (
              <span className={`text-xs font-medium ${past ? 'text-amber-700' : 'text-slate-400'}`}>
                {past ? 'Event has taken place — report due' : 'Event upcoming'}
              </span>
            )}
          </p>
        </div>
        <Button variant={p.has_report ? 'secondary' : 'primary'} size="sm" onClick={() => open(p)} disabled={loadingReport === p.id}>
          {label}
        </Button>
      </li>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Post-Event Report" subtitle="After an approved event, record who came and what was spent." />

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}
      {formError && <Alert variant="error" className="mb-6">{formError}</Alert>}
      {done && <Alert variant="success" className="mb-6">{done}</Alert>}

      <Card padded={false} className="mb-6">
        <div className="p-6 pb-2">
          <CardHeader title="Reports to submit" subtitle="Approved events without a report yet" />
        </div>
        {loading ? (
          <div className="p-6 pt-2"><Skeleton className="h-16 rounded-lg" /></div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={events.length === 0 ? 'No approved events yet' : 'All caught up'}
            subtitle={events.length === 0 ? "Once HEPA approves one of your club's proposals, you can file its report here." : 'Every approved event has a report on file.'}
          />
        ) : (
          <ul className="divide-y divide-slate-100">{pending.map((p) => renderRow(p, 'Submit report'))}</ul>
        )}
      </Card>

      {filed.length > 0 && (
        <Card padded={false}>
          <div className="p-6 pb-2">
            <CardHeader title="Submitted reports" subtitle="Open one to review or update it" />
          </div>
          <ul className="divide-y divide-slate-100">
            {filed.map((p) => renderRow(p, 'View / update'))}
          </ul>
        </Card>
      )}

      <SlideOver
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.report ? 'Update report' : 'Post-event report'}
        subtitle={active?.proposal.title}
      >
        {active && (
          <>
            {active.report && (
              <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> A report is already on file. Saving will update it.
              </p>
            )}
            <PostEventReportForm
              proposalId={active.proposal.id}
              report={active.report}
              onCancel={() => setActive(null)}
              onDone={() => {
                setDone(`Report for “${active.proposal.title}” saved.`);
                setActive(null);
                reload();
              }}
            />
          </>
        )}
      </SlideOver>
    </DashboardLayout>
  );
}
