import { AlertCircle, Pencil } from 'lucide-react';
import { EVENT_TYPE_LABEL } from '../../../constants/eventTypes';
import { formatDate, formatMoney, formatTimeRange, formatFileSize } from '../../../utils/format';
import Alert from '../../ui/Alert';
import { KIND_LABEL } from './DocumentsStep';
import { STEPS, budgetTotal, rowIsBlank, rowTotal } from './validation';

function Section({ title, step, onEdit, children }) {
  return (
    <section className="border border-slate-200 rounded-lg">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit<span className="sr-only"> {title}</span>
        </button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 whitespace-pre-wrap break-words">{children || <span className="text-slate-400">Not provided</span>}</dd>
    </div>
  );
}

export default function ReviewStep({ form, rows, existing, added, problems, onEdit, confirmed, onConfirm, clubName, isResubmit }) {
  const filledRows = rows.filter((r) => !rowIsBlank(r));

  return (
    <div className="space-y-5">
      {problems.length > 0 ? (
        <Alert variant="error">
          <p className="font-medium mb-1">
            {problems.length === 1 ? '1 section needs' : `${problems.length} sections need`} your attention before you can submit:
          </p>
          <ul className="space-y-1">
            {problems.map((p) => (
              <li key={p.index}>
                <button type="button" onClick={() => onEdit(p.index)} className="underline underline-offset-2 text-left">
                  {STEPS[p.index].label}
                </button>
                <span className="text-red-700/80"> — {p.message}</span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Alert variant="success">Everything looks complete. Review the details below, then submit.</Alert>
      )}

      <Section title="Event Information" step={0} onEdit={onEdit}>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Event name" wide>{form.title}</Field>
          <Field label="Event type">{EVENT_TYPE_LABEL[form.event_type]}</Field>
          <Field label="Target participants">{form.target_participants}</Field>
          <Field label="Estimated participants">{form.estimated_participants}</Field>
          <Field label="Objective" wide>{form.objective}</Field>
          <Field label="Description" wide>{form.description}</Field>
        </dl>
      </Section>

      <Section title="Organizer Information" step={1} onEdit={onEdit}>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Club / organisation">{clubName}</Field>
          <Field label="Organiser">{form.organizer_name}</Field>
          <Field label="Applicant name">{form.contact_person}</Field>
          <Field label="Phone number">{form.contact_info}</Field>
          <Field label="Position in club">{form.applicant_position}</Field>
          <Field label="Student ID">{form.applicant_id_number}</Field>
          <Field label="Applicant IC number">{form.applicant_ic_number}</Field>
        </dl>
      </Section>

      <Section title="Venue & Schedule" step={2} onEdit={onEdit}>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Date">{formatDate(form.event_date)}</Field>
          <Field label="Time">{formatTimeRange(form.event_time, form.end_time)}</Field>
          <Field label="Venue" wide>{form.venue}</Field>
        </dl>
      </Section>

      <Section title="Budget" step={3} onEdit={onEdit}>
        {filledRows.length === 0 ? (
          <p className="text-sm text-slate-400">No budget items added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th scope="col" className="pb-2 pr-3 font-medium">Item</th>
                  <th scope="col" className="pb-2 pr-3 font-medium text-right">Qty</th>
                  <th scope="col" className="pb-2 pr-3 font-medium text-right">Unit price</th>
                  <th scope="col" className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filledRows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-2 pr-3 text-slate-800">
                      {r.item}
                      {r.description && <span className="block text-xs text-slate-500">{r.description}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.quantity}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.unit_price)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(rowTotal(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
                  <th scope="row" colSpan={3} className="pt-3 pr-3 text-right">Total Requested Budget</th>
                  <td className="pt-3 text-right tabular-nums">{formatMoney(budgetTotal(rows))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <Section title="Documents" step={4} onEdit={onEdit}>
        {existing.length + added.length === 0 ? (
          <p className="text-sm text-slate-400">No documents added.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {existing.map((d) => (
              <li key={d.id} className="flex flex-wrap gap-x-2 text-slate-800">
                <span className="font-medium break-all">{d.original_name}</span>
                <span className="text-slate-500">{KIND_LABEL[d.document_type]} · {formatFileSize(d.file_size)} · uploaded</span>
              </li>
            ))}
            {added.map((d) => (
              <li key={d.key} className="flex flex-wrap gap-x-2 text-slate-800">
                <span className="font-medium break-all">{d.file.name}</span>
                <span className="text-slate-500">{KIND_LABEL[d.kind]} · {formatFileSize(d.file.size)} · will upload on submit</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer border border-slate-200 rounded-lg p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirm(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-slate-300 accent-brand-600 shrink-0"
        />
        <span>
          I confirm that the information above is accurate and that I'm authorised to
          {isResubmit ? ' resubmit' : ' submit'} this proposal on behalf of my club.
        </span>
      </label>

      {problems.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" aria-hidden="true" /> Fix the sections above to enable submission.
        </p>
      )}
    </div>
  );
}
