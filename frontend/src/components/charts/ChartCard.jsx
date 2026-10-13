import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import Card from '../ui/Card';

export default function ChartCard({ title, subtitle, series = [], table, empty, emptyLabel = 'No data in this period.', children }) {
  const [view, setView] = useState('chart');

  return (
    <Card as="section" aria-label={title}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {table && !empty && (
          <button
            type="button"
            onClick={() => setView((v) => (v === 'chart' ? 'table' : 'chart'))}
            aria-pressed={view === 'table'}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 no-print"
          >
            {view === 'chart' ? <Table2 className="w-3.5 h-3.5" aria-hidden="true" /> : <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />}
            {view === 'chart' ? 'Table view' : 'Chart view'}
          </button>
        )}
      </div>

      {empty ? (
        <p className="text-sm text-slate-400 py-10 text-center">{emptyLabel}</p>
      ) : view === 'table' && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                {table.columns.map((c, i) => (
                  <th key={c} scope="col" className={`pb-2 pr-3 font-medium ${i > 0 ? 'text-right' : ''}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((value, i) => (
                    <td key={`${row[0]}-${i}`} className={`py-2 pr-3 ${i > 0 ? 'text-right tabular-nums text-slate-700' : 'text-slate-800'}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {series.length > 1 && (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3" aria-label="Legend">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-sm ${s.swatchClass}`} aria-hidden="true" />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
          {children}
        </>
      )}
    </Card>
  );
}
