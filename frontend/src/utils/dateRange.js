import { dateKey } from './calendar';

export const RANGE_PRESETS = [
  { key: '30d', label: 'Last 30 days' },
  { key: '6m', label: 'Last 6 months' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom range' },
];

export function presetRange(key, now = new Date()) {
  const to = dateKey(now);
  switch (key) {
    case '30d': return { from: dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to };
    case '12m': return { from: dateKey(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to };
    case 'year': return { from: dateKey(new Date(now.getFullYear(), 0, 1)), to };
    case '6m':
    default: return { from: dateKey(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to };
  }
}

export function formatRange({ from, to }) {
  const fmt = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function monthLabel(ym, long = false) {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-MY', long ? { month: 'long', year: 'numeric' } : { month: 'short' });
}
