import { Link } from 'react-router-dom';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABEL } from '../../constants/roles';
import { shortLabel } from '../../utils/activityLabels';
import SlideOver from '../ui/SlideOver';
import Button from '../ui/Button';
import ResultBadge from './ResultBadge';

function Group({ title, children }) {
  return (
    <section className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</h3>
      <dl className="rounded-lg border border-slate-200 divide-y divide-slate-100">{children}</dl>
    </section>
  );
}

function Row({ label, children, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-sm text-slate-500 shrink-0">{label}</dt>
      <dd className={`text-sm text-slate-900 text-right break-all min-w-0 ${mono ? 'font-mono text-xs' : ''}`}>
        {children || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

export default function AuditDetailPanel({ entry, onClose }) {
  const toast = useToast();
  if (!entry) return null;

  const when = new Date(entry.created_at);
  const targetLink = entry.target_type === 'proposal' && entry.target_detail !== 'No longer exists'
    ? `/admin/proposals/${entry.target_id}`
    : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      toast.success('Entry copied.', 'The full audit record is on your clipboard as JSON.');
    } catch {
      toast.error('Could not copy to the clipboard.');
    }
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title={shortLabel(entry.action)}
      subtitle={`Audit entry #${entry.id}`}
      widthClass="max-w-xl"
      footer={
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          <Copy className="w-4 h-4" /> Copy as JSON
        </Button>
      }
    >
      <div className="mb-5"><ResultBadge result={entry.result} /></div>

      <Group title="When">
        <Row label="Date">{when.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Row>
        <Row label="Time">{when.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</Row>
      </Group>

      <Group title="Who">
        <Row label="User">{entry.user_name || 'System (no signed-in user)'}</Row>
        <Row label="Email">{entry.user_email}</Row>
        <Row label="Role">{ROLE_LABEL[entry.user_role]}</Row>
        <Row label="User ID" mono>{entry.user_id}</Row>
      </Group>

      <Group title="What">
        <Row label="Action" mono>{entry.action}</Row>
        <Row label="Module">{entry.module}</Row>
        <Row label="Result">{entry.result}</Row>
      </Group>

      <Group title="Target">
        <Row label="Affected">
          {entry.target_label !== '—' ? entry.target_label : null}
          {entry.target_detail && <span className="block text-xs text-slate-500">{entry.target_detail}</span>}
        </Row>
        <Row label="Type" mono>{entry.target_type}</Row>
        <Row label="ID" mono>{entry.target_id}</Row>
        {targetLink && (
          <div className="px-3.5 py-2.5">
            <Link to={targetLink} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">
              <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open this proposal
            </Link>
          </div>
        )}
      </Group>

      <Group title="Where">
        <Row label="IP address" mono>{entry.ip_address}</Row>
        <Row label="Browser" mono>{entry.user_agent}</Row>
      </Group>
      {!entry.ip_address && (
        <p className="-mt-3 mb-6 text-xs text-slate-400">
          The IP address and browser were only recorded from the point this feature was added, so older entries show —.
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Details</h3>
        {entry.details ? (
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-slate-400">No extra details were recorded for this action.</p>
        )}
      </section>
    </SlideOver>
  );
}
