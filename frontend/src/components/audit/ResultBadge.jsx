import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';

const STYLE = {
  success: { label: 'Success', icon: CheckCircle2, className: 'bg-green-100 text-green-800' },
  failure: { label: 'Failed', icon: XCircle, className: 'bg-amber-100 text-amber-800' },
  blocked: { label: 'Blocked', icon: ShieldAlert, className: 'bg-red-100 text-red-800' },
};

export default function ResultBadge({ result }) {
  const { label, icon: Icon, className } = STYLE[result] || STYLE.success;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${className}`}>
      <Icon className="w-3 h-3" aria-hidden="true" /> {label}
    </span>
  );
}
