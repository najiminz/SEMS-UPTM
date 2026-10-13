import client from '../api/client';
import { EVENT_TYPE_LABEL } from '../constants/eventTypes';
import { downloadBlob, downloadCsv } from './csv';
import { monthLabel } from './dateRange';

export function exportAnalyticsCsv(data) {
  const header = ['Month', 'Proposals submitted', 'Approved', 'Rejected', 'Budget requested (RM)'];
  const rows = data.months.map((m) => [monthLabel(m.month, true), m.proposals, m.approved, m.rejected, m.budget.toFixed(2)]);
  const t = data.totals;
  rows.push(['Total', t.proposals, t.approved, t.rejected, t.budget.toFixed(2)]);
  rows.push([]);
  rows.push(['Category', 'Proposals']);
  data.categories.forEach((c) => rows.push([EVENT_TYPE_LABEL[c.type] || c.type, c.count]));
  downloadCsv(`sems-analytics-${data.range.from}-to-${data.range.to}.csv`, header, rows);
}

export async function downloadProtected(path, params, filename) {
  const res = await client.get(path, { params, responseType: 'blob' });
  downloadBlob(filename, res.data);
}
