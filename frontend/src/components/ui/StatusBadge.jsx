export const STATUS_MAP = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', className: 'bg-amber-100 text-amber-800' },
  queries: { label: 'Query', className: 'bg-orange-100 text-orange-800' },
  resubmitted: { label: 'Resubmitted', className: 'bg-indigo-100 text-indigo-800' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-200 text-slate-700' },
};

export default function StatusBadge({ status, className = '' }) {
  const entry = STATUS_MAP[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${entry.className} ${className}`}
    >
      {entry.label}
    </span>
  );
}
