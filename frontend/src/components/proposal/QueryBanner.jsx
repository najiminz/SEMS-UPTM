import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, MessageSquareQuote, Pencil, Send } from 'lucide-react';
import { formatDateTime } from '../../utils/format';
import Button from '../ui/Button';
import SlideOver from '../ui/SlideOver';

export default function QueryBanner({ proposalId, queries }) {
  const [open, setOpen] = useState(false);
  const latest = queries[queries.length - 1];

  return (
    <>
      <section
        aria-labelledby="action-required-title"
        className="rounded-lg border-2 border-orange-300 bg-orange-50 p-5 text-orange-950"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="action-required-title" className="font-semibold">Action Required</h2>
            {latest ? (
              <>
                <p className="mt-1 whitespace-pre-wrap">{latest.remark}</p>
                <p className="mt-1 text-xs text-orange-800/80">
                  {latest.hepa_officer_name} · {formatDateTime(latest.created_at)}
                </p>
              </>
            ) : (
              <p className="mt-1">HEPA has asked for changes to this proposal.</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
                <MessageSquareQuote className="w-4 h-4" /> View Query
              </Button>
              <Link to={`/club/proposals/${proposalId}/edit`}>
                <Button type="button" variant="secondary" size="sm"><Pencil className="w-4 h-4" /> Edit Proposal</Button>
              </Link>
              <Link to={`/club/proposals/${proposalId}/edit?step=review`}>
                <Button type="button" size="sm"><Send className="w-4 h-4" /> Resubmit</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="HEPA's query"
        subtitle={queries.length > 1 ? `${queries.length} requests so far, newest first` : 'What HEPA needs from you'}
        footer={
          <div className="flex flex-wrap gap-2">
            <Link to={`/club/proposals/${proposalId}/edit`}><Button type="button" size="sm"><Pencil className="w-4 h-4" /> Edit Proposal</Button></Link>
          </div>
        }
      >
        <ol className="space-y-5">
          {[...queries].reverse().map((q) => (
            <li key={q.id}>
              <p className="text-xs text-slate-500">{q.hepa_officer_name} · {formatDateTime(q.created_at)}</p>
              <p className="mt-1.5 text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3">
                {q.remark}
              </p>
            </li>
          ))}
        </ol>
      </SlideOver>
    </>
  );
}
