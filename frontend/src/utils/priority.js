import { IN_REVIEW_STATUSES } from '../constants/proposalStatus';
import { todayKey } from './calendar';

const DAY_MS = 86_400_000;

function daysBetween(fromKey, toKey) {
  return Math.round((new Date(`${toKey}T00:00:00`) - new Date(`${fromKey}T00:00:00`)) / DAY_MS);
}

export function proposalPriority(proposal) {
  if (!IN_REVIEW_STATUSES.includes(proposal.status)) return null;

  const today = todayKey();
  const untilEvent = proposal.event_date ? daysBetween(today, proposal.event_date.slice(0, 10)) : null;
  const submitted = (proposal.submitted_at || proposal.created_at || '').slice(0, 10);
  const waiting = submitted ? Math.max(daysBetween(submitted, today), 0) : 0;

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const eventReason = untilEvent === null ? null
    : untilEvent < 0 ? 'Event date has passed'
    : untilEvent === 0 ? 'Event is today'
    : `Event in ${plural(untilEvent, 'day')}`;
  const waitReason = waiting === 0 ? 'Submitted today' : `Waiting ${plural(waiting, 'day')}`;

  if ((untilEvent !== null && untilEvent <= 14) || waiting >= 7) {
    return { level: 'high', label: 'High', reason: untilEvent !== null && untilEvent <= 14 ? eventReason : waitReason, rank: 0 };
  }
  if ((untilEvent !== null && untilEvent <= 30) || waiting >= 3) {
    return { level: 'medium', label: 'Medium', reason: untilEvent !== null && untilEvent <= 30 ? eventReason : waitReason, rank: 1 };
  }
  return { level: 'normal', label: 'Normal', reason: eventReason || waitReason, rank: 2 };
}
