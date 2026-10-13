import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, bar: 'bg-green-500', icon_c: 'text-green-600' },
  error: { icon: XCircle, bar: 'bg-red-500', icon_c: 'text-red-600' },
  warning: { icon: AlertTriangle, bar: 'bg-amber-500', icon_c: 'text-amber-600' },
  info: { icon: Info, bar: 'bg-navy-500', icon_c: 'text-navy-600' },
};

const DURATION_MS = { success: 5000, info: 5000, warning: 7000, error: 8000 };

function Toast({ toast, onDismiss }) {
  const { icon: Icon, bar, icon_c: iconColor } = VARIANTS[toast.variant];
  const timer = useRef(null);

  const start = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onDismiss(toast.id), DURATION_MS[toast.variant]);
  }, [onDismiss, toast.id, toast.variant]);

  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={start}
      className="fade-in relative flex items-start gap-3 w-full bg-surface border border-slate-200 rounded-lg shadow-lg pl-5 pr-3 py-3 overflow-hidden"
    >
      <span className={`absolute left-0 inset-y-0 w-1.5 ${bar}`} aria-hidden="true" />
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{toast.message}</p>
        {toast.description && <p className="text-sm text-slate-500 mt-0.5">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((variant, message, description) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((list) => [...list.slice(-3), { id, variant, message, description }]);
    return id;
  }, []);

  const api = useRef({
    success: (m, d) => push('success', m, d),
    error: (m, d) => push('error', m, d),
    warning: (m, d) => push('warning', m, d),
    info: (m, d) => push('info', m, d),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
