import { CalendarCheck, FileCheck2, ShieldCheck } from 'lucide-react';
import AuthIllustration from '../AuthIllustration';

const HIGHLIGHTS = [
  { icon: FileCheck2, text: 'Submit and track event proposals' },
  { icon: ShieldCheck, text: 'Reviewed and audited by HEPA' },
  { icon: CalendarCheck, text: 'One calendar for every approved event' },
];

export default function AuthLayout({ title, subtitle, icon: Icon, children, footer }) {
  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-56px)]">
      <aside className="hidden lg:block bg-gradient-to-br from-navy-700 to-navy-900 text-white relative overflow-clip">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-white/5" aria-hidden="true" />

        <div className="sticky top-14 h-[calc(100vh-56px)] flex flex-col justify-between p-12">
          <div className="relative flex items-center gap-3">
            <img src="/uptm-logo.png" alt="UPTM" className="h-10 w-auto bg-white rounded-md px-2 py-1.5" />
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">SEMS</p>
              <p className="text-xs text-white/70">Secure Event Management System</p>
            </div>
          </div>

          <div className="relative">
            <div className="w-56 mx-auto mb-8">
              <AuthIllustration />
            </div>
            <div className="h-1 w-12 bg-brand-600 rounded-full mb-4" aria-hidden="true" />
            <p className="text-3xl font-semibold leading-tight tracking-tight">Streamlining UPTM Event Management</p>
            <ul className="mt-6 space-y-3">
              {HIGHLIGHTS.map(({ icon: HighlightIcon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                  <HighlightIcon className="w-4 h-4 text-white/70 shrink-0" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/60">Universiti Poly-Tech Malaysia</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/uptm-logo.png" alt="UPTM" className="h-8 w-auto bg-white rounded-md px-1.5 py-1 border border-slate-200" />
            <span className="font-semibold text-slate-900 tracking-tight">SEMS</span>
          </div>

          <div className="mb-6">
            {Icon && (
              <div className="w-11 h-11 rounded-full bg-navy-50 flex items-center justify-center mb-4" aria-hidden="true">
                <Icon className="w-5 h-5 text-navy-700" />
              </div>
            )}
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-6 text-sm text-slate-500">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
