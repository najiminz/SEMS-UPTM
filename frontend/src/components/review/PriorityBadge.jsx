import { ArrowDown, ChevronsUp, Equal } from 'lucide-react';
import { proposalPriority } from '../../utils/priority';

const STYLE = {
  high: { icon: ChevronsUp, className: 'bg-red-100 text-red-800' },
  medium: { icon: Equal, className: 'bg-amber-100 text-amber-800' },
  normal: { icon: ArrowDown, className: 'bg-slate-100 text-slate-600' },
};

export default function PriorityBadge({ proposal }) {
  const priority = proposalPriority(proposal);
  if (!priority) return null;
  const { icon: Icon, className } = STYLE[priority.level];

  return (
    <span
      title={priority.reason}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {priority.label} priority
      <span className="sr-only">: {priority.reason}</span>
    </span>
  );
}
