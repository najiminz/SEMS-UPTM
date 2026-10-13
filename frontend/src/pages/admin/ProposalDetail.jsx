import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Loader2, ShieldAlert } from 'lucide-react';
import client from '../../api/client';
import { useProposalDetail } from '../../hooks/useProposalDetail';
import { formatDateTime } from '../../utils/format';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ProposalWorkflow from '../../components/proposal/ProposalWorkflow';

const DECISION_LABEL = {
  approved: 'Approved by HEPA',
  rejected: 'Rejected by HEPA',
  cancelled: 'Cancelled by Admin (previously approved by HEPA)',
};

export default function AdminProposalDetail() {
  const { id } = useParams();
  const { data, error: loadError, reload } = useProposalDetail(id);
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);

  async function handleCancel(reason) {
    setError('');
    try {
      await client.post(`/proposals/${id}/cancel`, { reason });
      setCancelOpen(false);
      reload();
    } catch (err) {
      setCancelOpen(false);
      setError(err.response?.data?.message || 'Could not cancel event');
    }
  }

  const back = (
    <Link to="/admin/proposals" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
      <ArrowLeft className="w-3.5 h-3.5" /> Back to Proposal Monitoring
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

  const { proposal } = data;

  const banner = (
    <>
      <Alert variant="info">
        <ShieldAlert className="w-4 h-4 inline -mt-0.5 mr-1" aria-hidden="true" />
        Approval decisions belong to HEPA. Admin has read-only visibility here, with a separate
        override to cancel an already-approved event when necessary.
      </Alert>

      {DECISION_LABEL[proposal.status] && (
        <Card className="bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            {DECISION_LABEL[proposal.status]}
            {proposal.reviewed_by_name && proposal.status !== 'cancelled' && ` — ${proposal.reviewed_by_name}`}
          </p>
          {proposal.status === 'cancelled' && (
            <>
              <p className="text-sm text-slate-600 mt-1">{proposal.cancel_reason}</p>
              <p className="text-xs text-slate-400 mt-1">{proposal.cancelled_by_name} · {formatDateTime(proposal.cancelled_at)}</p>
            </>
          )}
        </Card>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </>
  );

  return (
    <DashboardLayout>
      <ProposalWorkflow data={data} back={back} banner={banner}>
        {proposal.status === 'approved' && (
          <Card as="section" aria-label="Administrative override">
            <CardHeader title="Administrative Override" subtitle="Cancel this event without altering HEPA's original decision" />
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              <Ban className="w-4 h-4" /> Cancel Event
            </Button>
          </Card>
        )}
      </ProposalWorkflow>

      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Event"
        message="This is an administrative override — it will not change HEPA's approval decision on record, but the event will be removed from the public calendar. A reason is required and will be logged."
        confirmLabel="Cancel Event"
        reasonLabel="Reason for Cancellation"
        danger
        requireReason
      />
    </DashboardLayout>
  );
}
