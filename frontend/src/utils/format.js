export function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(start, end) {
  const s = formatTime(start);
  const e = formatTime(end);
  if (!s) return null;
  return e ? `${s} – ${e}` : s;
}

export function formatClock(dateTimeStr) {
  if (!dateTimeStr) return null;
  return new Date(dateTimeStr).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  return `${formatDate(dateTimeStr)}, ${formatClock(dateTimeStr)}`;
}

export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
