export const IN_REVIEW_STATUSES = ['submitted', 'under_review', 'resubmitted'];

export const EDITABLE_STATUSES = ['draft', 'queries'];

export const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'queries', label: 'Query' },
  { value: 'resubmitted', label: 'Resubmitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'in_review', label: 'Awaiting HEPA (all in review)' },
];

export function matchesStatusFilter(status, filter) {
  if (!filter || filter === 'all') return true;
  if (filter === 'in_review') return IN_REVIEW_STATUSES.includes(status);
  return status === filter;
}
