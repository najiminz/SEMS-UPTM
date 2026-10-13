export function timeAgo(dateTimeStr, now = Date.now()) {
  if (!dateTimeStr) return '';
  const seconds = Math.round((now - new Date(dateTimeStr).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateTimeStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}
