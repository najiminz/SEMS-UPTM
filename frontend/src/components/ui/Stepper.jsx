import { Check, AlertCircle } from 'lucide-react';

export default function Stepper({ steps, current, states, onStepClick, canVisit = () => true }) {
  return (
    <nav aria-label="Proposal steps">
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const state = states[index];
          const isCurrent = index === current;
          const clickable = canVisit(index) && !isCurrent;
          const circle =
            state === 'error'
              ? 'bg-red-100 text-red-600 border-red-400'
              : state === 'complete'
                ? 'bg-navy-700 text-white border-navy-700'
                : isCurrent
                  ? 'bg-surface text-navy-700 dark:text-navy-200 border-navy-700 dark:border-navy-300 ring-4 ring-navy-100 dark:ring-navy-700/40'
                  : 'bg-surface text-slate-400 border-slate-300';

          return (
            <li key={step.key} className="flex-1 min-w-0 flex flex-col items-center relative">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                    states[index - 1] === 'complete' ? 'bg-navy-700' : 'bg-slate-200'
                  }`}
                />
              )}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`relative z-10 flex flex-col items-center gap-2 px-1 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${circle}`}>
                  {state === 'error' ? (
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  ) : state === 'complete' ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-xs font-medium text-center leading-tight ${
                    isCurrent ? 'text-slate-900' : state === 'error' ? 'text-red-600' : 'text-slate-500'
                  } ${isCurrent ? '' : 'hidden md:block'}`}
                >
                  {step.label}
                  {state === 'error' && <span className="sr-only"> (has errors)</span>}
                  {state === 'complete' && <span className="sr-only"> (complete)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
