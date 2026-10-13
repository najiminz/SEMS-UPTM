import { File, FileImage, FileSpreadsheet, FileText } from 'lucide-react';

const BY_EXTENSION = {
  pdf: { icon: FileText, tint: 'bg-red-100 text-red-600' },
  doc: { icon: FileText, tint: 'bg-blue-100 text-blue-600' },
  docx: { icon: FileText, tint: 'bg-blue-100 text-blue-600' },
  xls: { icon: FileSpreadsheet, tint: 'bg-green-100 text-green-600' },
  xlsx: { icon: FileSpreadsheet, tint: 'bg-green-100 text-green-600' },
  jpg: { icon: FileImage, tint: 'bg-purple-100 text-purple-600' },
  jpeg: { icon: FileImage, tint: 'bg-purple-100 text-purple-600' },
  png: { icon: FileImage, tint: 'bg-purple-100 text-purple-600' },
};

export function fileKind(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  return BY_EXTENSION[ext] || { icon: File, tint: 'bg-slate-100 text-slate-500' };
}

export default function DocumentCard({ name, meta, badge, badgeTone = 'green', children }) {
  const { icon: Icon, tint } = fileKind(name);
  const badgeClass = badgeTone === 'green' ? 'text-green-700 bg-green-100' : 'text-amber-800 bg-amber-100';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-200 rounded-lg bg-surface p-3.5">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tint}`} aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate" title={name}>{name}</p>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            {meta && <span>{meta}</span>}
            {badge && <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badge}</span>}
          </p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">{children}</div>}
    </div>
  );
}
