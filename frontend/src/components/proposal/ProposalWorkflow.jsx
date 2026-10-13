import { useState } from 'react';
import { Download, Eye, Loader2, MessageSquareQuote } from 'lucide-react';
import { EVENT_TYPE_LABEL } from '../../constants/eventTypes';
import { ROLE_LABEL } from '../../constants/roles';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { formatDate, formatDateTime, formatFileSize, formatMoney, formatTimeRange } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import { allActivity, buildTimeline, reviewHistory } from '../../utils/timeline';
import Card, { CardHeader } from '../ui/Card';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import DocumentCard from './DocumentCard';
import StatusTimeline from './StatusTimeline';

const DOC_TYPE_LABEL = {
  proposal: 'Proposal Document',
  budget: 'Budget Document',
  supporting: 'Supporting Document',
  post_event_report: 'Post-Event Report',
};

export const SECTIONS = [
  { id: 'event-information', label: 'Event Information' },
  { id: 'organizer-information', label: 'Organizer Information' },
  { id: 'schedule-venue', label: 'Schedule & Venue' },
  { id: 'budget', label: 'Budget' },
  { id: 'documents', label: 'Documents' },
  { id: 'review-history', label: 'Review History' },
  { id: 'audit-activity', label: 'Audit Activity' },
];

function Field({ label, children, wide = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 whitespace-pre-wrap break-words">
        {children || <span className="text-slate-400">Not provided</span>}
      </dd>
    </div>
  );
}

function Section({ id, title, subtitle, children }) {
  return (
    <Card as="section" id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function BudgetTable({ proposal, items }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Total requested: <strong className="text-slate-900">{formatMoney(proposal.budget_amount)}</strong>
        <span className="block text-slate-400 mt-1">No itemised breakdown was provided with this proposal.</span>
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[32rem]">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th scope="col" className="pb-2 pr-3 font-medium">Item</th>
            <th scope="col" className="pb-2 pr-3 font-medium">Description</th>
            <th scope="col" className="pb-2 pr-3 font-medium text-right">Qty</th>
            <th scope="col" className="pb-2 pr-3 font-medium text-right">Unit price</th>
            <th scope="col" className="pb-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((i) => (
            <tr key={i.id}>
              <td className="py-2.5 pr-3 font-medium text-slate-800">{i.item}</td>
              <td className="py-2.5 pr-3 text-slate-600">{i.description || '—'}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{Number(i.quantity)}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(i.unit_price)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatMoney(Number(i.quantity) * Number(i.unit_price))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
            <th scope="row" colSpan={4} className="pt-3 pr-3 text-right">Total Requested Budget</th>
            <td className="pt-3 text-right tabular-nums">{formatMoney(proposal.budget_amount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function EventList({ events, empty, showRemark = true }) {
  if (events.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ol className="space-y-4">
      {events.map((ev) => (
        <li key={ev.id} className="flex gap-3">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-navy-300 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-slate-800">
              <span className="font-medium">{ev.label}</span>
              {ev.user && (
                <span className="text-slate-500"> · {ev.user}{ev.role ? ` (${ROLE_LABEL[ev.role] || ev.role})` : ''}</span>
              )}
            </p>
            <p className="text-xs text-slate-400">{formatDateTime(ev.at)}</p>
            {showRemark && ev.remark && (
              <p className="mt-1.5 flex items-start gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <MessageSquareQuote className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="whitespace-pre-wrap">{ev.remark}</span>
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ProposalWorkflow({ data, back, banner, headerActions, children }) {
  const { proposal, documents, budget_items: budgetItems, remarks, activity } = data;
  const { openDocument, downloadDocument, busyId, error: docError } = useDocumentActions();
  const [showAllActivity, setShowAllActivity] = useState(false);

  const stages = buildTimeline(proposal, activity);
  const history = reviewHistory(activity, remarks);
  const audit = allActivity(activity).reverse();
  const auditShown = showAllActivity ? audit : audit.slice(0, 8);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        {back}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-mono text-slate-500">{proposalCode(proposal)}</p>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-0.5">{proposal.title}</h1>
          </div>
          {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
        </div>

        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-surface border border-slate-200 rounded-lg p-4">
          <div>
            <dt className="text-xs text-slate-400">Proposal ID</dt>
            <dd className="text-sm font-medium text-slate-900 font-mono">{proposalCode(proposal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Event Name</dt>
            <dd className="text-sm font-medium text-slate-900">{proposal.title}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Club</dt>
            <dd className="text-sm font-medium text-slate-900">{proposal.club_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Status</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              <StatusBadge status={proposal.status} />
              {proposal.version > 1 && <span className="text-xs text-slate-400">v{proposal.version}</span>}
            </dd>
          </div>
        </dl>
      </header>

      {banner}

      <Card as="section" aria-labelledby="timeline-title">
        <CardHeader title="Status Timeline" subtitle="Select a stage for the full detail" />
        <h2 id="timeline-title" className="sr-only">Status timeline</h2>
        <StatusTimeline key={`${proposal.id}-${proposal.status}`} stages={stages} />
      </Card>

      <nav aria-label="Jump to section" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-sm border border-slate-300 bg-surface text-slate-600 hover:bg-slate-50 hover:border-navy-300 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Section id="event-information" title="Event Information">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Event type">{EVENT_TYPE_LABEL[proposal.event_type]}</Field>
          <Field label="Target participants">{proposal.target_participants}</Field>
          <Field label="Estimated participants">{proposal.estimated_participants}</Field>
          <Field label="Objective" wide>{proposal.objective}</Field>
          <Field label="Description" wide>{proposal.description}</Field>
        </dl>
      </Section>

      <Section id="organizer-information" title="Organizer Information">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Club / organisation">{proposal.club_name}</Field>
          <Field label="Submitted by">{proposal.submitted_by_name}</Field>
          <Field label="Submitter email">{proposal.submitted_by_email}</Field>
          <Field label="Organiser">{proposal.organizer_name || proposal.club_name}</Field>
          <Field label="Applicant name">{proposal.contact_person}</Field>
          <Field label="Phone number">{proposal.contact_info}</Field>
          <Field label="Position in club">{proposal.applicant_position}</Field>
          <Field label="Student ID">{proposal.applicant_id_number}</Field>
          <Field label="Applicant IC number">{proposal.applicant_ic_number}</Field>
        </dl>
      </Section>

      <Section id="schedule-venue" title="Schedule & Venue">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Date">{formatDate(proposal.event_date)}</Field>
          <Field label="Time">{formatTimeRange(proposal.event_time, proposal.end_time)}</Field>
          <Field label="Venue" wide>{proposal.venue}</Field>
        </dl>
      </Section>

      <Section id="budget" title="Budget" subtitle="What the club is asking to spend">
        <BudgetTable proposal={proposal} items={budgetItems} />
      </Section>

      <Section id="documents" title="Documents">
        {docError && <Alert variant="error" className="mb-3">{docError}</Alert>}
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents were uploaded.</p>
        ) : (
          <ul className="space-y-2.5">
            {documents.map((d) => (
              <li key={d.id}>
                <DocumentCard
                  name={d.original_name}
                  meta={`${DOC_TYPE_LABEL[d.document_type] || 'Document'} · ${formatFileSize(d.file_size)} · uploaded ${formatDate(d.uploaded_at)}`}
                >
                  <Button type="button" variant="secondary" size="sm" onClick={() => openDocument(d)} disabled={busyId === d.id}>
                    {busyId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => downloadDocument(d)} disabled={busyId === d.id}>
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </DocumentCard>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="review-history" title="Review History" subtitle="HEPA's decisions and the committee's responses">
        <EventList events={history} empty="Nothing to show yet. HEPA hasn't started reviewing this proposal." />
      </Section>

      <Section id="audit-activity" title="Audit Activity" subtitle="Every recorded action on this proposal, newest first">
        <EventList events={auditShown} empty="No activity has been recorded." showRemark={false} />
        {audit.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllActivity((v) => !v)}
            className="mt-4 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline"
          >
            {showAllActivity ? 'Show fewer' : `Show all ${audit.length} entries`}
          </button>
        )}
      </Section>

      {children}
    </div>
  );
}
