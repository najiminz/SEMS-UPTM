import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Loader2, MessageCircleQuestion, XCircle } from 'lucide-react';
import client from '../../api/client';
import { IN_REVIEW_STATUSES } from '../../constants/proposalStatus';
import { formatDateTime } from '../../utils/format';
import { useProposalDetail } from '../../hooks/useProposalDetail';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ProposalWorkflow from '../../components/proposal/ProposalWorkflow';
import ReviewDialog from '../../components/review/ReviewDialog';

export default function ReviewProposal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error: loadError, reload } = useProposalDetail(id);
  const [dialog, setDialog] = useState(null);
  const startedFor = useRef(null);

  useEffect(() => {
    const status = data?.proposal.status;
    if (!status || startedFor.current === `${id}:${status}`) return;
    if (status === 'submitted' || status === 'resubmitted') {
      startedFor.current = `${id}:${status}`;
      client.post(`/proposals/${id}/start-review`).then(reload).catch(() => {});
    }
  }, [data, id, reload]);

  const back = (
    <Link to="/hepa/review" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
      <ArrowLeft className="w-3.5 h-3.5" /> Back to Proposal Review
    </Link>
  );

  if (loadError) {
    return (
      <DashboardLayout>
        {back}
        <Alert variant="error" className="max-w-xl">{loadError}</Alert>
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

  const { proposal, remarks } = data;
  const canDecide = IN_REVIEW_STATUSES.includes(proposal.status);
  const lastRemark = remarks[remarks.length - 1];

  const banner = (
    <>
      {proposal.status === 'queries' && (
        <Alert variant="warning">
          <p className="font-medium">Waiting for the committee</p>
          <p className="mt-0.5">You asked for changes{lastRemark ? `: “${lastRemark.remark}”` : '.'} It will return to your queue once they resubmit.</p>
        </Alert>
      )}
      {['approved', 'rejected', 'cancelled'].includes(proposal.status) && (
        <Alert variant={proposal.status === 'approved' ? 'success' : 'info'}>
          This proposal has already been {proposal.status === 'cancelled' ? 'approved and later cancelled by an administrator' : proposal.status}
          {proposal.reviewed_by_name ? ` by ${proposal.reviewed_by_name}` : ''}.
          {proposal.status === 'cancelled' && proposal.cancelled_at && <> Cancelled {formatDateTime(proposal.cancelled_at)}.</>}
          {proposal.signoff_at && <> Signatures (Penasihat/BHEP, Setiausaha ATAP Kolej, Pengarah) confirmed by {proposal.signoff_by_name || 'HEPA'} on {formatDateTime(proposal.signoff_at)}.</>}
        </Alert>
      )}
    </>
  );

  return (
    <DashboardLayout>
      <ProposalWorkflow
        data={data}
        back={back}
        banner={banner}
        headerActions={
          <Link
            to={`/hepa/proposals/${proposal.id}/form`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="w-4 h-4" aria-hidden="true" /> Generate form
          </Link>
        }
      >
        {canDecide && (
          <Card className="sticky bottom-4 shadow-lg border-navy-200 z-10" as="section" aria-label="Review decision">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Your decision</p>
                <p className="text-sm text-slate-500">Approve it, reject it, or ask the committee for changes.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => setDialog('query')}>
                  <MessageCircleQuestion className="w-4 h-4" /> Query
                </Button>
                <Button variant="danger" onClick={() => setDialog('reject')}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button variant="success" onClick={() => setDialog('approve')}>
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
              </div>
            </div>
          </Card>
        )}
      </ProposalWorkflow>

      <ReviewDialog
        action={dialog}
        proposal={proposal}
        onClose={() => setDialog(null)}
        onDone={() => navigate('/hepa/review')}
      />
    </DashboardLayout>
  );
}
