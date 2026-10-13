export const EVENT_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'competition', label: 'Competition' },
  { value: 'other', label: 'Other' },
];

export const EVENT_TYPE_LABEL = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t.label]));

export const EVENT_TYPE_STYLE = {
  academic: { chip: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  sports: { chip: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  cultural: { chip: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  workshop: { chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  competition: { chip: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  other: { chip: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
};

export function eventTypeStyle(type) {
  return EVENT_TYPE_STYLE[type] || EVENT_TYPE_STYLE.other;
}
