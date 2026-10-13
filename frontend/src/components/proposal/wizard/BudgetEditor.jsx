import { Plus, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Alert from '../../ui/Alert';
import { formatMoney } from '../../../utils/format';
import { blankRow, budgetTotal, rowTotal } from './validation';

const cell = 'w-full bg-surface border rounded-md px-2.5 py-1.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400';

function Cell({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default function BudgetEditor({ rows, onChange, rowErrors, showErrors, generalError }) {
  function update(key, field, value) {
    onChange(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function remove(key) {
    const next = rows.filter((r) => r.key !== key);
    onChange(next.length > 0 ? next : [blankRow()]);
  }

  const total = budgetTotal(rows);

  return (
    <div>
      {showErrors && generalError && <Alert variant="error" className="mb-4">{generalError}</Alert>}

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm min-w-[44rem]">
          <thead>
            <tr className="text-left text-slate-500">
              <th scope="col" className="pb-2 pr-2 font-medium w-[22%]">Item</th>
              <th scope="col" className="pb-2 pr-2 font-medium">Description</th>
              <th scope="col" className="pb-2 pr-2 font-medium w-24">Quantity</th>
              <th scope="col" className="pb-2 pr-2 font-medium w-32">Unit price (RM)</th>
              <th scope="col" className="pb-2 pr-2 font-medium w-28 text-right">Total</th>
              <th scope="col" className="pb-2 w-10"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const e = (showErrors && rowErrors[row.key]) || {};
              const n = index + 1;
              return (
                <tr key={row.key} className="align-top">
                  <td className="pb-3 pr-2">
                    <Cell id={`${row.key}-item`} label={`Item ${n}`} error={e.item}>
                      <input
                        id={`${row.key}-item`}
                        value={row.item}
                        onChange={(ev) => update(row.key, 'item', ev.target.value)}
                        placeholder="e.g. Banner"
                        maxLength={200}
                        aria-invalid={e.item ? true : undefined}
                        aria-describedby={e.item ? `${row.key}-item-error` : undefined}
                        className={`${cell} ${e.item ? 'border-red-400' : 'border-slate-300'}`}
                      />
                    </Cell>
                  </td>
                  <td className="pb-3 pr-2">
                    <Cell id={`${row.key}-desc`} label={`Description for item ${n}`}>
                      <input
                        id={`${row.key}-desc`}
                        value={row.description}
                        onChange={(ev) => update(row.key, 'description', ev.target.value)}
                        placeholder="Optional"
                        maxLength={500}
                        className={`${cell} border-slate-300`}
                      />
                    </Cell>
                  </td>
                  <td className="pb-3 pr-2">
                    <Cell id={`${row.key}-qty`} label={`Quantity for item ${n}`} error={e.quantity}>
                      <input
                        id={`${row.key}-qty`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={row.quantity}
                        onChange={(ev) => update(row.key, 'quantity', ev.target.value)}
                        aria-invalid={e.quantity ? true : undefined}
                        aria-describedby={e.quantity ? `${row.key}-qty-error` : undefined}
                        className={`${cell} ${e.quantity ? 'border-red-400' : 'border-slate-300'}`}
                      />
                    </Cell>
                  </td>
                  <td className="pb-3 pr-2">
                    <Cell id={`${row.key}-price`} label={`Unit price for item ${n}`} error={e.unit_price}>
                      <input
                        id={`${row.key}-price`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={row.unit_price}
                        onChange={(ev) => update(row.key, 'unit_price', ev.target.value)}
                        placeholder="0.00"
                        aria-invalid={e.unit_price ? true : undefined}
                        aria-describedby={e.unit_price ? `${row.key}-price-error` : undefined}
                        className={`${cell} ${e.unit_price ? 'border-red-400' : 'border-slate-300'}`}
                      />
                    </Cell>
                  </td>
                  <td className="pb-3 pr-2 pt-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                    {formatMoney(rowTotal(row))}
                  </td>
                  <td className="pb-3 pt-0.5">
                    <button
                      type="button"
                      onClick={() => remove(row.key)}
                      aria-label={`Remove item ${n}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <th scope="row" colSpan={4} className="pt-3 pr-2 text-right font-semibold text-slate-900">
                Total Requested Budget
              </th>
              <td className="pt-3 pr-2 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap" aria-live="polite">
                {formatMoney(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...rows, blankRow()])}>
        <Plus className="w-4 h-4" /> Add item
      </Button>
    </div>
  );
}
