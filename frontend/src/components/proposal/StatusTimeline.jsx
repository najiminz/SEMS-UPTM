import { useState } from 'react';
import { Check, Minus, X, AlertTriangle, MessageSquareQuote } from 'lucide-react';
import { ROLE_LABEL } from '../../constants/roles';
import { formatClock, formatDate, formatDateTime } from '../../utils/format';

const TONE = {
  default: { fill: 'bg-navy-700 border-navy-700 text-white', ring: 'ring-navy-100', text: 'text-navy-700' },
  success: { fill: 'bg-green-600 border-green-600 text-white', ring: 'ring-green-100', text: 'text-green-700' },
  danger: { fill: 'bg-red-600 border-red-600 text-white', ring: 'ring-red-100', text: 'text-red-700' },
  warning: { fill: 'bg-orange-500 border-orange-500 text-white', ring: 'ring-orange-100', text: 'text-orange-700' },
};

const STATE_LABEL = { done: 'Completed', current: 'Current stage', upcoming: 'Not reached yet', skipped: 'Skipped' };

function Node({ stage }) {
  const tone = TONE[stage.tone] || TONE.default;
  const base = 'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors';

  if (stage.state === 'done') {
    const Icon = stage.tone === 'danger' ? X : Check;
    return <span className={`${base} ${tone.fill}`}><Icon className="w-4 h-4" aria-hidden="true" /></span>;
  }
  if (stage.state === 'current') {
    const Icon = stage.tone === 'warning' ? AlertTriangle : null;
    return (
      <span className={`${base} bg-surface border-current ${tone.text} ring-4 ${tone.ring}`}>
        {Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : <span className="w-2.5 h-2.5 rounded-full bg-current" />}
      </span>
    );
  }
  if (stage.state === 'skipped') {
    return <span className={`${base} bg-surface border-dashed border-slate-300 text-slate-300`}><Minus className="w-4 h-4" aria-hidden="true" /></span>;
  }
  return <span className={`${base} bg-surface border-slate-300 text-slate-300`} />;
}

function StageMeta({ stage }) {
  if (stage.at) {
    return (
      <>
        <span className="block">{formatDate(stage.at)}</span>
        <span className="block">{formatClock(stage.at)}</span>
        {stage.user && <span className="block truncate">{stage.user}</span>}
      </>
    );
  }
  return <span className="block">{stage.state === 'skipped' ? 'Skipped' : 'Pending'}</span>;
}

function StageDetail({ stage }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h4 className="font-semibold text-slate-900">{stage.label}</h4>
        <span className="text-xs font-medium text-slate-500">{STATE_LABEL[stage.state]}</span>
      </div>

      <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="text-xs text-slate-400">When</dt>
          <dd className="text-slate-800">{stage.at ? formatDateTime(stage.at) : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">By</dt>
          <dd className="text-slate-800">{stage.user || '—'}</dd>
        </div>
      </dl>
      <p className="text-sm text-slate-600 mt-2">{stage.note}</p>

      {stage.events.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          {stage.events.map((ev) => (
            <li key={ev.id} className="text-sm">
              <p className="text-slate-800">
                <span className="font-medium">{ev.label}</span>
                <span className="text-slate-500">
                  {' '}· {formatDateTime(ev.at)}{ev.user ? ` · ${ev.user}` : ''}{ev.role ? ` (${ROLE_LABEL[ev.role] || ev.role})` : ''}
                </span>
              </p>
              {ev.remark && (
                <p className="mt-1 flex items-start gap-2 text-slate-600 bg-surface border border-slate-200 rounded-md px-3 py-2">
                  <MessageSquareQuote className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="whitespace-pre-wrap">{ev.remark}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StatusTimeline({ stages }) {
  const initial = stages.find((s) => s.state === 'current') || [...stages].reverse().find((s) => s.state === 'done') || stages[0];
  const [selectedKey, setSelectedKey] = useState(initial.key);
  const selected = stages.find((s) => s.key === selectedKey) || initial;

  return (
    <div>
      <ol className="md:flex" aria-label="Proposal status timeline">
        {stages.map((stage, index) => {
          const last = index === stages.length - 1;
          const next = stages[index + 1];
          const lineDone = stage.state === 'done' && next && next.state !== 'upcoming';
          const isSelected = stage.key === selected.key;

          return (
            <li key={stage.key} className="relative flex md:flex-1 md:flex-col md:items-center gap-3 pb-6 md:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className={`absolute left-4 top-8 bottom-0 w-0.5 -translate-x-1/2 md:left-1/2 md:right-auto md:top-4 md:bottom-auto md:h-0.5 md:w-full md:translate-x-0 md:-translate-y-1/2 ${
                    lineDone ? 'bg-navy-700' : 'bg-slate-200'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => setSelectedKey(stage.key)}
                aria-pressed={isSelected}
                aria-label={`${stage.label}: ${STATE_LABEL[stage.state]}`}
                className="relative z-10 flex md:flex-col items-start md:items-center gap-3 text-left md:text-center rounded-lg px-1 group"
              >
                <Node stage={stage} />
                <span className="min-w-0 md:mt-1">
                  <span className={`block text-sm font-medium ${isSelected ? 'text-slate-900 underline decoration-2 underline-offset-4 decoration-navy-300' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {stage.label}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 md:max-w-32">
                    <StageMeta stage={stage} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <StageDetail stage={selected} />
    </div>
  );
}
