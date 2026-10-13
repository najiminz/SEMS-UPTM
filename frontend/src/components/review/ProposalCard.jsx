import { CalendarDays, Clock, Users, Wallet } from 'lucide-react';
import { formatDate, formatMoney } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import { proposalPriority } from '../../utils/priority';
import StatusBadge from '../ui/StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function ProposalCard({ proposal, onOpen, selected = false }) {
  const priority = proposalPriority(proposal);
  const accent = priority?.level === 'high' ? 'border-l-red-500' : priority?.level === 'medium' ? 'border-l-amber-500' : 'border-l-slate-200';

  return (
    <article
      className={`group relative flex flex-col bg-surface border border-slate-200 border-l-4 ${accent} rounded-lg p-4 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus-within:border-navy-400
        ${selected ? 'ring-2 ring-navy-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-mono text-slate-400">{proposalCode(proposal)}</p>
        <StatusBadge status={proposal.status} />
      </div>

      <h3 className="mt-1.5 font-semibold text-slate-900 leading-snug line-clamp-2">{proposal.title}</h3>
      <p className="mt-0.5 text-sm text-slate-500 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{proposal.club_name}</span>
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="sr-only">Event date</dt>
          <dd className="flex items-center gap-1.5 text-slate-700">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {formatDate(proposal.event_date) || 'No date'}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Requested budget</dt>
          <dd className="flex items-center gap-1.5 text-slate-700 tabular-nums">
            <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {formatMoney(proposal.budget_amount)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="sr-only">Submitted</dt>
          <dd className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            Submitted {formatDate(proposal.submitted_at)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-2">
        <PriorityBadge proposal={proposal} />
        <button
          type="button"
          onClick={() => onOpen(proposal)}
          aria-label={`Review proposal: ${proposal.title}`}
          className="ml-auto text-sm font-medium text-navy-700 dark:text-navy-300 group-hover:underline after:absolute after:inset-0 after:rounded-lg"
        >
          Review Proposal
        </button>
      </div>
    </article>
  );
}
