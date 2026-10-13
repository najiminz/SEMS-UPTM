import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Eye, ExternalLink, FileText, Loader2, MessageCircleQuestion, XCircle,
} from 'lucide-react';
import client from '../../api/client';
import { EVENT_TYPE_LABEL } from '../../constants/eventTypes';
import { IN_REVIEW_STATUSES } from '../../constants/proposalStatus';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { useProposalDetail } from '../../hooks/useProposalDetail';
import { formatDate, formatDateTime, formatFileSize, formatMoney, formatTimeRange } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import { reviewHistory } from '../../utils/timeline';
import SlideOver from '../ui/SlideOver';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import StatusBadge from '../ui/StatusBadge';
import DocumentCard from '../proposal/DocumentCard';
import PriorityBadge from './PriorityBadge';
import ReviewDialog from './ReviewDialog';

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 break-words">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
      {children}
    </section>
  );
}

export default function ReviewPanel({ proposalId, position, onClose, onPrev, onNext, onStarted, onDecided }) {
  const { data, error, reload } = useProposalDetail(proposalId);
  const { openDocument, downloadDocument, busyId, error: docError } = useDocumentActions();
  const [dialog, setDialog] = useState(null);
  const startedFor = useRef(null);

  useEffect(() => {
    const status = data?.proposal.status;
    if (!status || startedFor.current === `${proposalId}:${status}`) return;
    if (status === 'submitted' || status === 'resubmitted') {
      startedFor.current = `${proposalId}:${status}`;
      client.post(`/proposals/${proposalId}/start-review`).then(() => { reload(); onStarted?.(); }).catch(() => {});
    }
  }, [data, proposalId, reload, onStarted]);

  const proposal = data?.proposal;
  const canDecide = proposal && IN_REVIEW_STATUSES.includes(proposal.status);
  const history = data ? reviewHistory(data.activity, data.remarks).slice(-4).reverse() : [];

  const nav = (
    <>
      {position && <span className="hidden sm:inline text-xs text-slate-400 mr-1" aria-live="polite">{position}</span>}
      <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous proposal" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next proposal" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );

  return (
    <>
      <SlideOver
        open
        onClose={onClose}
        title={proposal?.title || 'Loading proposal…'}
        subtitle={proposal ? `${proposalCode(proposal)} · ${proposal.club_name}` : undefined}
        widthClass="max-w-xl sm:max-w-2xl"
        headerActions={nav}
        footer={
          proposal && (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <Link to={`/hepa/proposals/${proposal.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">
                  <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open full page
                </Link>
                <Link to={`/hepa/proposals/${proposal.id}/form`} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">
                  <FileText className="w-4 h-4" aria-hidden="true" /> Generate form
                </Link>
              </div>
              {canDecide ? (
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button variant="secondary" onClick={() => setDialog('query')}><MessageCircleQuestion className="w-4 h-4" /> Query</Button>
                  <Button variant="danger" onClick={() => setDialog('reject')}><XCircle className="w-4 h-4" /> Reject</Button>
                  <Button variant="success" onClick={() => setDialog('approve')}><CheckCircle2 className="w-4 h-4" /> Approve</Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No decision needed right now.</p>
              )}
            </div>
          )
        }
      >
        {error && <Alert variant="error">{error}</Alert>}
        {!data && !error && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading proposal" />
          </div>
        )}

        {data && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge status={proposal.status} />
              <PriorityBadge proposal={{ ...proposal, submitted_at: data.activity.find((a) => a.action === 'PROPOSAL_SUBMITTED')?.created_at }} />
            </div>

            {proposal.status === 'queries' && (
              <Alert variant="warning" className="mb-4">You've asked the committee for changes. This returns to your queue when they resubmit.</Alert>
            )}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              <Fact label="Event date">{formatDate(proposal.event_date)}</Fact>
              <Fact label="Time">{formatTimeRange(proposal.event_time, proposal.end_time)}</Fact>
              <Fact label="Venue">{proposal.venue}</Fact>
              <Fact label="Event type">{EVENT_TYPE_LABEL[proposal.event_type]}</Fact>
              <Fact label="Requested budget"><strong className="tabular-nums">{formatMoney(proposal.budget_amount)}</strong></Fact>
              <Fact label="Estimated participants">{proposal.estimated_participants}</Fact>
              <Fact label="Applicant">{[proposal.contact_person, proposal.applicant_position].filter(Boolean).join(' · ')}</Fact>
              <Fact label="Phone">{proposal.contact_info}</Fact>
              <Fact label="Student ID">{proposal.applicant_id_number}</Fact>
              <Fact label="Submitted by">{proposal.submitted_by_name}</Fact>
            </dl>

            {proposal.objective && (
              <Block title="Objective"><p className="text-sm text-slate-700 whitespace-pre-wrap">{proposal.objective}</p></Block>
            )}
            {proposal.description && (
              <Block title="Description"><p className="text-sm text-slate-700 whitespace-pre-wrap">{proposal.description}</p></Block>
            )}
            {proposal.target_participants && (
              <Block title="Target participants"><p className="text-sm text-slate-700">{proposal.target_participants}</p></Block>
            )}

            <Block title="Budget">
              {data.budget_items.length === 0 ? (
                <p className="text-sm text-slate-500">No itemised breakdown. Total requested: {formatMoney(proposal.budget_amount)}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[24rem]">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th scope="col" className="pb-1.5 pr-3 font-medium">Item</th>
                        <th scope="col" className="pb-1.5 pr-3 font-medium text-right">Qty</th>
                        <th scope="col" className="pb-1.5 pr-3 font-medium text-right">Unit</th>
                        <th scope="col" className="pb-1.5 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.budget_items.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 pr-3 text-slate-800">{i.item}{i.description && <span className="block text-xs text-slate-500">{i.description}</span>}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{Number(i.quantity)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(i.unit_price)}</td>
                          <td className="py-2 text-right tabular-nums">{formatMoney(Number(i.quantity) * Number(i.unit_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
                        <th scope="row" colSpan={3} className="pt-2 pr-3 text-right">Total</th>
                        <td className="pt-2 text-right tabular-nums">{formatMoney(proposal.budget_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Block>

            <Block title="Documents">
              {docError && <Alert variant="error" className="mb-2">{docError}</Alert>}
              {data.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents were uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {data.documents.map((d) => (
                    <li key={d.id}>
                      <DocumentCard name={d.original_name} meta={`${d.document_type} · ${formatFileSize(d.file_size)}`}>
                        <Button type="button" variant="secondary" size="sm" onClick={() => openDocument(d)} disabled={busyId === d.id}>
                          {busyId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                        </Button>
                      </DocumentCard>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            {history.length > 0 && (
              <Block title="Review history">
                <ol className="space-y-3">
                  {history.map((ev) => (
                    <li key={ev.id} className="text-sm">
                      <p className="text-slate-800"><span className="font-medium">{ev.label}</span><span className="text-slate-500"> · {ev.user} · {formatDateTime(ev.at)}</span></p>
                      {ev.remark && <p className="mt-1 text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 whitespace-pre-wrap">{ev.remark}</p>}
                    </li>
                  ))}
                </ol>
              </Block>
            )}
          </div>
        )}
      </SlideOver>

      <ReviewDialog
        action={dialog}
        proposal={proposal}
        onClose={() => setDialog(null)}
        onDone={(action) => { setDialog(null); onDecided?.(action); }}
      />
    </>
  );
}
