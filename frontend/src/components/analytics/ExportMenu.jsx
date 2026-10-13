import { useCallback, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useDismiss } from '../../hooks/useDismiss';
import Button from '../ui/Button';

export default function ExportMenu({ items, busy = false }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative no-print">
      <Button type="button" variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" disabled={busy}>
        <Download className="w-4 h-4" aria-hidden="true" /> {busy ? 'Preparing...' : 'Export'} <ChevronDown className="w-4 h-4" aria-hidden="true" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 bg-surface border border-slate-200 rounded-lg shadow-lg z-40 py-1">
          {items.map(({ label, description, icon: Icon = FileText, onSelect }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => { close(); onSelect(); }}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <Icon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span>
                <span className="block text-sm text-slate-800">{label}</span>
                {description && <span className="block text-xs text-slate-500">{description}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const EXPORT_ICONS = { csv: FileSpreadsheet, print: Printer };
