import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, MessageCircleQuestion, TriangleAlert, XCircle } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatMoney } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { TextareaField } from '../ui/FormField';

const MIN_REASON = 10;

const SIGNOFF = [
  { key: 'advisor', label: 'Penasihat / BHEP (Advisor)' },
  { key: 'secretary', label: 'Setiausaha ATAP Kolej' },
  { key: 'director', label: 'Pengarah (Director)' },
];
const NO_SIGNOFF = { advisor: false, secretary: false, director: false };

const CONFIG = {
  query: {
    title: 'Query Proposal',
    endpoint: 'query',
    label: 'Required changes',
    placeholder: 'Please explain what changes are required.',
    confirm: 'Send Query',
    busy: 'Sending...',
    variant: 'primary',
    icon: MessageCircleQuestion,
    emptyError: 'Explain what the committee needs to change.',
    success: (p) => ({ message: 'Query sent successfully.', description: `${p.club_name || 'The committee'} has been asked to revise “${p.title}”.` }),
  },
  reject: {
    title: 'Reject Proposal?',
    endpoint: 'reject',
    label: 'Reason for rejection',
    placeholder: 'Explain why this proposal is being rejected.',
    confirm: 'Reject Proposal',
    busy: 'Rejecting...',
    variant: 'danger',
    icon: XCircle,
    emptyError: 'Give a reason so the committee understands the decision.',
    success: (p) => ({ message: 'Proposal rejected.', description: `“${p.title}” was rejected and the committee can see your reason.` }),
  },
  approve: {
    title: 'Approve Proposal?',
    endpoint: 'approve',
    confirm: 'Approve Proposal',
    busy: 'Approving...',
    variant: 'success',
    icon: CheckCircle2,
    success: (p) => ({ message: 'Proposal approved successfully.', description: `“${p.title}” is now on the campus calendar.` }),
  },
};

function Summary({ rows }) {
  return (
    <dl className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
          <dt className="text-slate-500 shrink-0">{label}</dt>
          <dd className="text-slate-900 font-medium text-right break-words min-w-0">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ReviewDialog({ action, proposal, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signoff, setSignoff] = useState(NO_SIGNOFF);

  useEffect(() => {
    setSignoff(NO_SIGNOFF);
    setReason('');
    setTouched(false);
    setError('');
  }, [action, proposal?.id]);

  if (!action || !proposal) return null;
  const cfg = CONFIG[action];
  const needsReason = action !== 'approve';
  const reasonError = needsReason && touched
    ? (!reason.trim() ? cfg.emptyError : reason.trim().length < MIN_REASON ? `Add a little more detail (at least ${MIN_REASON} characters).` : undefined)
    : undefined;

  const signoffComplete = SIGNOFF.every((s) => signoff[s.key]);

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (needsReason && reason.trim().length < MIN_REASON) return;
    if (action === 'approve' && !signoffComplete) return;

    setBusy(true);
    try {
      await client.post(`/proposals/${proposal.id}/${cfg.endpoint}`, needsReason ? { remark: reason.trim() } : { signoff });
      const { message, description } = cfg.success(proposal);
      toast.success(message, description);
      onDone?.(action);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const Icon = cfg.icon;

  return (
    <Modal open onClose={() => !busy && onClose()} title={cfg.title}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {action === 'approve' ? (
          <>
            <Summary
              rows={[
                ['Event name', proposal.title],
                ['Date', formatDate(proposal.event_date)],
                ['Venue', proposal.venue],
                ['Requested budget', formatMoney(proposal.budget_amount)],
              ]}
            />
            <fieldset className="rounded-lg border border-slate-200 p-3.5">
              <legend className="px-1 text-sm font-semibold text-slate-900">Signatures on the printed form</legend>
              <p className="text-sm text-slate-600 mb-2.5">
                I confirm I have received the signed form and that each of these people has endorsed this event:
              </p>
              <div className="space-y-2">
                {SIGNOFF.map((s) => (
                  <label key={s.key} className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-green-600"
                      checked={signoff[s.key]}
                      onChange={(e) => setSignoff((v) => ({ ...v, [s.key]: e.target.checked }))}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
              <Link
                to={`/hepa/proposals/${proposal.id}/form`}
                target="_blank"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline"
              >
                <FileText className="w-4 h-4" aria-hidden="true" /> Open the printable form
              </Link>
            </fieldset>
            <Alert variant="warning">
              <p>Approving marks the event as approved and puts it on the campus calendar. Your confirmation is recorded in the audit log.</p>
            </Alert>
          </>
        ) : (
          <>
            {action === 'query' && (
              <Summary rows={[['Proposal', proposal.title], ['Club', proposal.club_name], ['Proposal ID', proposalCode(proposal)]]} />
            )}
            {action === 'reject' && (
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
                <span>
                  “{proposal.title}” will be marked as rejected and the committee will see your reason. This ends the review.
                </span>
              </p>
            )}
            <TextareaField
              id="review-reason"
              label={cfg.label}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              error={reasonError}
              placeholder={cfg.placeholder}
              rows={5}
              autoFocus
              required
            />
          </>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={cfg.variant} disabled={busy || (action === 'approve' && !signoffComplete)}>
            <Icon className="w-4 h-4" aria-hidden="true" /> {busy ? cfg.busy : cfg.confirm}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
