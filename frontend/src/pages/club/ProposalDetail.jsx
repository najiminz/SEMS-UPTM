import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil } from 'lucide-react';
import { useProposalDetail } from '../../hooks/useProposalDetail';
import { formatDateTime } from '../../utils/format';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card, { CardHeader } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ProposalWorkflow from '../../components/proposal/ProposalWorkflow';
import QueryBanner from '../../components/proposal/QueryBanner';
import PostEventReportForm from '../../components/proposal/PostEventReportForm';

export default function ProposalDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { data, error, reload } = useProposalDetail(id);
  const [editingReport, setEditingReport] = useState(false);

  const back = (
    <Link to="/club/proposals" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
      <ArrowLeft className="w-3.5 h-3.5" /> Back to Club Proposals
    </Link>
  );

  if (error) {
    return (
      <DashboardLayout>
        {back}
        <Alert variant="error" className="max-w-xl">{error}</Alert>
      </DashboardLayout>
    );
  }
  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading proposal" />
        </div>
      </DashboardLayout>
    );
  }

  const { proposal, remarks, report } = data;
  const lastRemark = remarks[remarks.length - 1];
  const successMessage = location.state?.success;

  const banner = (
    <>
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {proposal.status === 'draft' && (
        <Alert variant="info">
          <p className="font-medium">This proposal is still a draft</p>
          <p className="mt-0.5">Only you can see it. Finish it and submit it to HEPA when you're ready.</p>
        </Alert>
      )}

      {proposal.status === 'queries' && <QueryBanner proposalId={proposal.id} queries={remarks} />}

      {proposal.status === 'rejected' && lastRemark && (
        <Alert variant="error">
          <p className="font-medium">Reason for rejection</p>
          <p className="mt-0.5 whitespace-pre-wrap">{lastRemark.remark}</p>
          <p className="text-xs text-red-700/80 mt-1">{lastRemark.hepa_officer_name} · {formatDateTime(lastRemark.created_at)}</p>
        </Alert>
      )}

      {proposal.status === 'cancelled' && (
        <Alert variant="error">
          <p className="font-medium">This event was cancelled by an administrator</p>
          {proposal.cancel_reason && <p className="mt-0.5">{proposal.cancel_reason}</p>}
          {proposal.cancelled_at && (
            <p className="text-xs text-red-700/80 mt-1">{proposal.cancelled_by_name} · {formatDateTime(proposal.cancelled_at)}</p>
          )}
        </Alert>
      )}
    </>
  );

  const headerActions = ['draft', 'queries'].includes(proposal.status) ? (
    <Link to={`/club/proposals/${proposal.id}/edit`}>
      <Button><Pencil className="w-4 h-4" /> {proposal.status === 'draft' ? 'Continue editing' : 'Edit Proposal'}</Button>
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <ProposalWorkflow data={data} back={back} banner={banner} headerActions={headerActions}>
        {proposal.status === 'approved' && (
          <Card as="section" id="post-event-report" className="scroll-mt-20">
            <CardHeader
              title="Post-Event Report"
              subtitle={report ? 'Filed — you can update it if something changes' : 'Submit this once the event has taken place'}
            />
            {report && !editingReport ? (
              <div className="space-y-3">
                <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-xs text-slate-400">Attendance</dt><dd className="text-slate-800">{report.attendance_count}</dd></div>
                  <div><dt className="text-xs text-slate-400">Actual spending</dt><dd className="text-slate-800">RM {Number(report.actual_spending).toFixed(2)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Summary</dt><dd className="text-slate-800 whitespace-pre-wrap">{report.summary}</dd></div>
                </dl>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingReport(true)}>Update report</Button>
              </div>
            ) : (
              <PostEventReportForm
                proposalId={proposal.id}
                report={report}
                onDone={() => { setEditingReport(false); reload(); }}
                onCancel={report ? () => setEditingReport(false) : undefined}
              />
            )}
          </Card>
        )}
      </ProposalWorkflow>
    </DashboardLayout>
  );
}
