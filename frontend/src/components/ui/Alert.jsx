import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'bg-green-50 text-green-800 border-green-200' },
  error: { icon: XCircle, className: 'bg-red-50 text-red-800 border-red-200' },
  warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-800 border-amber-200' },
  info: { icon: Info, className: 'bg-blue-50 text-blue-800 border-blue-200' },
};

export default function Alert({ variant = 'info', children, className = '' }) {
  const { icon: Icon, className: variantClass } = VARIANTS[variant];
  return (
    <div className={`flex items-start gap-2.5 border rounded-lg px-4 py-3 text-sm ${variantClass} ${className}`} role="alert">
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
