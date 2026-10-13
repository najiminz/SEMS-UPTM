const NAVY = {
  markClass: 'fill-navy-700 dark:fill-navy-300',
  areaClass: 'fill-navy-700 dark:fill-navy-300',
  lineClass: 'stroke-navy-700 dark:stroke-navy-300',
  swatchClass: 'bg-navy-700 dark:bg-navy-300',
};

const RED = {
  markClass: 'fill-brand-600 dark:fill-brand-400',
  areaClass: 'fill-brand-600 dark:fill-brand-400',
  lineClass: 'stroke-brand-600 dark:stroke-brand-400',
  swatchClass: 'bg-brand-600 dark:bg-brand-400',
};

export const SERIES = {
  proposals: { key: 'proposals', label: 'Proposals submitted', ...NAVY },
  approved: { key: 'approved', label: 'Approved', ...NAVY },
  rejected: { key: 'rejected', label: 'Rejected', ...RED },
  budget: { key: 'budget', label: 'Budget requested', ...NAVY },
};
