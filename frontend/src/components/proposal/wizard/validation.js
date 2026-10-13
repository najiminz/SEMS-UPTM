import { todayKey } from '../../../utils/calendar';

export const STEPS = [
  { key: 'event', label: 'Event Information' },
  { key: 'organizer', label: 'Organizer Information' },
  { key: 'schedule', label: 'Venue & Schedule' },
  { key: 'budget', label: 'Budget' },
  { key: 'documents', label: 'Documents' },
  { key: 'review', label: 'Review & Submit' },
];

export const STEP_FIELDS = {
  event: ['title', 'event_type', 'objective', 'description', 'target_participants', 'estimated_participants'],
  organizer: ['organizer_name', 'contact_person', 'applicant_id_number', 'applicant_ic_number', 'applicant_position', 'contact_info'],
  schedule: ['event_date', 'event_time', 'end_time', 'venue'],
  budget: ['budget'],
  documents: ['documents'],
  review: [],
};

export const EMPTY_FORM = {
  title: '',
  event_type: '',
  objective: '',
  description: '',
  target_participants: '',
  estimated_participants: '',
  organizer_name: '',
  contact_person: '',
  contact_info: '',
  applicant_position: '',
  applicant_id_number: '',
  applicant_ic_number: '',
  event_date: '',
  event_time: '',
  end_time: '',
  venue: '',
};

const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,18}$/;
const IC_RE = /^\d{6}-?\d{2}-?\d{4}$/;

let rowCounter = 0;
export function blankRow() {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, item: '', description: '', quantity: '1', unit_price: '' };
}

const round2 = (n) => Math.round(n * 100) / 100;
export const rowTotal = (row) => round2((Number(row.quantity) || 0) * (Number(row.unit_price) || 0));
export const budgetTotal = (rows) => round2(rows.reduce((sum, r) => sum + rowTotal(r), 0));
export const rowIsBlank = (row) => !row.item.trim() && !row.description.trim() && row.unit_price === '';

export const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
export const MAX_FILE_MB = 10;

export function validateProposal(form, rows, docs) {
  const errors = {};
  const rowErrors = {};
  const text = (key) => String(form[key] ?? '').trim();

  if (!text('title')) errors.title = 'Give the event a name, e.g. "Cyber Security Awareness Program".';
  else if (text('title').length < 3) errors.title = 'The event name needs at least 3 characters.';
  if (!form.event_type) errors.event_type = 'Choose the type that best describes the event.';
  if (!text('objective')) errors.objective = 'Explain what the event aims to achieve.';
  if (!text('description')) errors.description = 'Describe what will happen at the event.';
  else if (text('description').length < 20) errors.description = 'Add a little more detail — at least a sentence or two (20+ characters).';
  if (!text('target_participants')) errors.target_participants = 'Say who the event is for, e.g. "All UPTM students".';
  if (text('estimated_participants') !== '') {
    const n = Number(text('estimated_participants'));
    if (!Number.isInteger(n) || n < 0) errors.estimated_participants = 'Enter a whole number, like 100.';
  }

  if (!text('organizer_name')) errors.organizer_name = 'Enter the organiser, e.g. your club name.';
  if (!text('contact_person')) errors.contact_person = "Enter the applicant's full name.";
  if (!text('contact_info')) errors.contact_info = 'Enter a phone number HEPA can reach you on.';
  else if (!PHONE_RE.test(text('contact_info'))) {
    errors.contact_info = 'Enter a valid phone number, e.g. 012-3456789.';
  }
  if (!text('applicant_position')) errors.applicant_position = 'Enter your position in the club, e.g. Secretary.';
  if (!text('applicant_id_number')) errors.applicant_id_number = 'Enter your student ID.';
  if (text('applicant_ic_number') && !IC_RE.test(text('applicant_ic_number'))) {
    errors.applicant_ic_number = 'Use the 12-digit format, e.g. 050101-14-1234.';
  }

  if (!form.event_date) errors.event_date = 'Choose the date of the event.';
  else if (form.event_date < todayKey()) errors.event_date = 'This date has already passed. Choose today or a future date.';
  if (!form.event_time) errors.event_time = 'Enter the start time.';
  if (!form.end_time) errors.end_time = 'Enter the end time.';
  else if (form.event_time && form.end_time <= form.event_time) errors.end_time = 'The end time must be after the start time.';
  if (!text('venue')) errors.venue = 'Enter where the event will be held, e.g. Dewan Besar, Block C.';

  const filled = rows.filter((r) => !rowIsBlank(r));
  if (filled.length === 0) {
    errors.budget = 'Add at least one budget item. If the event costs nothing, add a line with a unit price of 0.';
  }
  for (const row of filled) {
    const e = {};
    if (!row.item.trim()) e.item = 'Name this item.';
    const qty = Number(row.quantity);
    if (row.quantity === '' || !Number.isFinite(qty) || qty <= 0) e.quantity = 'Must be more than 0.';
    const price = Number(row.unit_price);
    if (row.unit_price === '') e.unit_price = 'Enter a price (0 if free).';
    else if (!Number.isFinite(price) || price < 0) e.unit_price = 'Cannot be negative.';
    if (Object.keys(e).length > 0) rowErrors[row.key] = e;
  }
  if (Object.keys(rowErrors).length > 0 && !errors.budget) {
    errors.budget = 'Some budget rows need attention — check the highlighted fields.';
  }

  const addedOf = (kind) => docs.added.filter((d) => d.kind === kind);
  const hasProposalDoc = docs.existing.some((d) => d.document_type === 'proposal') || addedOf('proposal').length > 0;
  if (addedOf('proposal').length > 1) errors.documents = 'Only one Proposal Document is allowed. Change one of the files to "Supporting".';
  else if (addedOf('budget').length > 1) errors.documents = 'Only one Budget Document is allowed. Change one of the files to "Supporting".';
  else if (addedOf('supporting').length > 5) errors.documents = 'You can upload at most 5 supporting documents at a time.';
  else if (!hasProposalDoc) errors.documents = 'Upload your proposal document (PDF or Word) so HEPA has something to review.';

  return { errors, rowErrors };
}

export function stepHasErrors(stepKey, errors, rowErrors) {
  if (STEP_FIELDS[stepKey].some((f) => errors[f])) return true;
  return stepKey === 'budget' && Object.keys(rowErrors).length > 0;
}

export function checkFile(file) {
  const ext = `.${file.name.split('.').pop().toLowerCase()}`;
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `"${file.name}" isn't a supported file type. Use PDF, Word, Excel, JPG or PNG.`;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `"${file.name}" is larger than ${MAX_FILE_MB} MB. Compress it or split it into smaller files.`;
  }
  return null;
}
