const TONES = {
  neutral: 'bg-slate-100 text-slate-600',
  navy: 'bg-navy-50 text-navy-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
};

export default function StatCard({ icon: Icon, label, value, tone = 'neutral', onClick, active = false }) {
  const content = (
    <>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone]}`}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs sm:text-sm text-slate-500 leading-snug">{label}</p>
      </div>
    </>
  );
  const base = 'bg-surface border rounded-lg p-4 sm:p-5 flex items-center gap-3 sm:gap-4';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`${base} w-full transition-all hover:-translate-y-0.5 hover:shadow-sm ${
          active ? 'border-navy-500 ring-1 ring-navy-500' : 'border-slate-200 hover:border-navy-300'
        }`}
      >
        {content}
      </button>
    );
  }
  return <div className={`${base} border-slate-200`}>{content}</div>;
}
