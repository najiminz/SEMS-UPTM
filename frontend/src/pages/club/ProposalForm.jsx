import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Save, Send } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EVENT_TYPES } from '../../constants/eventTypes';
import { EDITABLE_STATUSES } from '../../constants/proposalStatus';
import { formatClock } from '../../utils/format';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Stepper from '../../components/ui/Stepper';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { TextField, TextareaField, SelectField } from '../../components/ui/FormField';
import BudgetEditor from '../../components/proposal/wizard/BudgetEditor';
import DocumentsStep from '../../components/proposal/wizard/DocumentsStep';
import ReviewStep from '../../components/proposal/wizard/ReviewStep';
import {
  EMPTY_FORM, STEPS, STEP_FIELDS, blankRow, rowIsBlank, stepHasErrors, validateProposal,
} from '../../components/proposal/wizard/validation';

const UPLOAD_FIELD = { proposal: 'proposal_document', budget: 'budget_document', supporting: 'supporting_documents' };

function toForm(p) {
  const form = { ...EMPTY_FORM };
  for (const key of Object.keys(EMPTY_FORM)) form[key] = p[key] == null ? '' : String(p[key]);
  form.event_date = form.event_date.slice(0, 10);
  form.event_time = form.event_time.slice(0, 5);
  form.end_time = form.end_time.slice(0, 5);
  if (p.event_type === 'other' && !p.description && !p.venue) form.event_type = '';
  return form;
}

function toRows(items) {
  if (!items || items.length === 0) return [blankRow()];
  return items.map((i) => ({
    ...blankRow(),
    item: i.item,
    description: i.description || '',
    quantity: String(Number(i.quantity)),
    unit_price: String(Number(i.unit_price)),
  }));
}

export default function ProposalForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState('');
  const [proposal, setProposal] = useState(null);
  const [queryRemark, setQueryRemark] = useState(null);

  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, organizer_name: user?.club_name || '' }));
  const [rows, setRows] = useState(() => [blankRow()]);
  const [existing, setExisting] = useState([]);
  const [added, setAdded] = useState([]);

  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [attempted, setAttempted] = useState(() => new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [confirmMissing, setConfirmMissing] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [docToRemove, setDocToRemove] = useState(null);

  const isResubmit = proposal?.status === 'queries';
  const stepFromUrl = STEPS.findIndex((s) => s.key === searchParams.get('step'));

  function applyServerProposal(data) {
    setProposal(data.proposal);
    const loaded = toForm(data.proposal);
    if (!loaded.organizer_name) loaded.organizer_name = data.proposal.club_name || '';
    setForm(loaded);
    setRows(toRows(data.budget_items));
    setExisting(data.documents);
    setAdded([]);
    const remarks = data.remarks || [];
    setQueryRemark(data.proposal.status === 'queries' ? remarks[remarks.length - 1] || null : null);
  }

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    client
      .get(`/proposals/${id}`)
      .then((res) => {
        if (cancelled) return;
        applyServerProposal(res.data);
        if (stepFromUrl > 0) {
          setStep(stepFromUrl);
          setMaxVisited(stepFromUrl);
        }
      })
      .catch((err) => !cancelled && setLoadError(err.response?.data?.message || 'Could not load this proposal.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (location.state?.notice) setNotice(location.state.notice);
  }, [location.key, location.state]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const { errors, rowErrors } = useMemo(
    () => validateProposal(form, rows, { existing, added }),
    [form, rows, existing, added]
  );
  const invalid = (index) => stepHasErrors(STEPS[index].key, errors, rowErrors);
  const shown = (field) => (attempted.has(step) ? errors[field] : undefined);

  const problems = STEPS.slice(0, 5)
    .map((s, index) => ({
      index,
      message: STEP_FIELDS[s.key].map((f) => errors[f]).find(Boolean) || (index === 3 && errors.budget) || null,
    }))
    .filter((p) => invalid(p.index) && p.message);

  const states = STEPS.map((_, i) => {
    if (i === step) return 'current';
    if (attempted.has(i) && invalid(i)) return 'error';
    if (i <= maxVisited && !invalid(i)) return 'complete';
    return 'upcoming';
  });
  const canVisit = (i) => i <= maxVisited || STEPS.slice(0, i).every((_, j) => !invalid(j));

  function change(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setDirty(true);
    };
  }

  function goTo(index) {
    setStep(index);
    setMaxVisited((m) => Math.max(m, index));
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function focusFirstError() {
    setTimeout(() => document.querySelector('#proposal-step-panel [aria-invalid="true"]')?.focus(), 60);
  }

  function next() {
    setAttempted((prev) => new Set(prev).add(step));
    if (invalid(step)) {
      focusFirstError();
      return;
    }
    goTo(step + 1);
  }

  function buildFormData(submit) {
    const fd = new FormData();
    for (const key of Object.keys(EMPTY_FORM)) fd.append(key, form[key] ?? '');
    fd.append(
      'budget_items',
      JSON.stringify(
        rows.filter((r) => !rowIsBlank(r)).map(({ item, description, quantity, unit_price }) => ({ item, description, quantity, unit_price }))
      )
    );
    fd.append('submit', submit ? 'true' : 'false');
    for (const { file, kind } of added) fd.append(UPLOAD_FIELD[kind], file);
    return fd;
  }

  async function persist(submit) {
    setError('');
    setBusy(true);
    try {
      const body = buildFormData(submit);
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const res = id ? await client.put(`/proposals/${id}`, body, config) : await client.post('/proposals', body, config);
      setDirty(false);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving. Please check your connection and try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!form.title.trim()) {
      setAttempted((prev) => new Set(prev).add(0));
      setStep(0);
      setError('Give your event a name before saving a draft.');
      focusFirstError();
      return;
    }
    const result = await persist(false);
    if (!result) return;
    if (!id) {
      navigate(`/club/proposals/${result.proposalId}/edit?step=${STEPS[step].key}`, {
        replace: true,
        state: { notice: `Draft saved at ${formatClock(new Date().toISOString())}.` },
      });
      return;
    }
    const fresh = await client.get(`/proposals/${id}`);
    applyServerProposal(fresh.data);
    setNotice(`Draft saved at ${formatClock(new Date().toISOString())}.`);
  }

  function requestSubmit() {
    setNotice('');
    if (problems.length > 0) {
      setAttempted(new Set([0, 1, 2, 3, 4, 5]));
      goTo(problems[0].index);
      focusFirstError();
      return;
    }
    if (!confirmed) {
      setConfirmMissing(true);
      return;
    }
    setSubmitOpen(true);
  }

  async function submit() {
    const result = await persist(true);
    setSubmitOpen(false);
    if (!result) return;
    if (isResubmit) {
      navigate(`/club/proposals/${id}`, { state: { success: 'Your changes were resubmitted to HEPA for review.' } });
    } else {
      navigate('/club', { state: { success: `“${form.title}” was submitted to HEPA for review.` } });
    }
  }

  async function removeExisting() {
    const doc = docToRemove;
    try {
      await client.delete(`/proposals/${id}/documents/${doc.id}`);
      setExisting((list) => list.filter((d) => d.id !== doc.id));
      setDocToRemove(null);
    } catch (err) {
      setDocToRemove(null);
      setError(err.response?.data?.message || 'Could not remove the document.');
    }
  }

  const title = !id ? 'Create Proposal' : isResubmit ? 'Edit & Resubmit Proposal' : 'Edit Draft';
  const subtitle = isResubmit
    ? 'Update the proposal based on HEPA’s feedback, then resubmit it.'
    : 'Complete each step. You can save a draft and come back to it at any time.';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading proposal" />
        </div>
      </DashboardLayout>
    );
  }

  if (loadError || (proposal && !EDITABLE_STATUSES.includes(proposal.status))) {
    return (
      <DashboardLayout>
        <Alert variant="error" className="max-w-xl">
          {loadError || 'This proposal can no longer be edited because it has already been sent to HEPA.'}
        </Alert>
        <Link to={proposal ? `/club/proposals/${proposal.id}` : '/club/proposals'} className="inline-block mt-4 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">
          {proposal ? 'View the proposal' : 'Back to Club Proposals'}
        </Link>
      </DashboardLayout>
    );
  }

  const stepKey = STEPS[step].key;
  const isLast = step === STEPS.length - 1;

  return (
    <DashboardLayout>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={
          <Link to={id ? `/club/proposals/${id}` : '/club'} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> {id ? 'Back to proposal' : 'Back to Dashboard'}
          </Link>
        }
      />

      {isResubmit && queryRemark && (
        <Alert variant="warning" className="mb-6">
          <p className="font-medium">HEPA asked for changes</p>
          <p className="mt-0.5 whitespace-pre-wrap">{queryRemark.remark}</p>
        </Alert>
      )}

      <Card className="mb-6">
        <Stepper steps={STEPS} current={step} states={states} canVisit={canVisit} onStepClick={goTo} />
        <p className="md:hidden text-sm text-slate-500 text-center mt-3">
          Step {step + 1} of {STEPS.length}
        </p>
      </Card>

      <Card>
        <div id="proposal-step-panel" aria-labelledby="step-heading" role="group">
          <h2 id="step-heading" className="text-lg font-semibold text-slate-900 mb-1">{STEPS[step].label}</h2>
          <p className="text-sm text-slate-500 mb-5">
            {{
              event: 'What the event is and why you are running it. Fields marked * are required.',
              organizer: 'Who HEPA should contact about this proposal.',
              schedule: 'When and where the event will take place.',
              budget: 'List what you need to spend. Totals are calculated for you.',
              documents: 'Upload the proposal document and anything that supports it.',
              review: 'Check everything over before you send it to HEPA.',
            }[stepKey]}
          </p>

          {error && <Alert variant="error" className="mb-5">{error}</Alert>}

          {stepKey === 'event' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <TextField id="title" label="Event Name" value={form.title} onChange={change('title')} error={shown('title')} placeholder="e.g. Cyber Security Awareness Program" maxLength={200} required />
              </div>
              <SelectField id="event_type" label="Event Type" value={form.event_type} onChange={change('event_type')} error={shown('event_type')} required>
                <option value="" disabled>Select event type</option>
                {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectField>
              <TextField id="estimated_participants" label="Estimated Number of Participants" type="number" min="0" value={form.estimated_participants} onChange={change('estimated_participants')} error={shown('estimated_participants')} placeholder="e.g. 100" />
              <div className="sm:col-span-2">
                <TextField id="target_participants" label="Target Participants" value={form.target_participants} onChange={change('target_participants')} error={shown('target_participants')} placeholder="e.g. All UPTM students" maxLength={255} required />
              </div>
              <div className="sm:col-span-2">
                <TextareaField id="objective" label="Objective" value={form.objective} onChange={change('objective')} error={shown('objective')} rows={3} placeholder="What should this event achieve?" required />
              </div>
              <div className="sm:col-span-2">
                <TextareaField id="description" label="Description" value={form.description} onChange={change('description')} error={shown('description')} rows={5} placeholder="Describe the activities, programme and flow of the event..." required />
              </div>
            </div>
          )}

          {stepKey === 'organizer' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <TextField id="organizer_name" label="Organiser (Penganjur)" value={form.organizer_name} onChange={change('organizer_name')} error={shown('organizer_name')} placeholder="e.g. Kelab Keselamatan Siber UPTM" helper="Printed on the official form as Penganjur. Change it for a joint programme." maxLength={150} required />
              </div>
              <div className="sm:col-span-2">
                <TextField id="contact_person" label="Applicant Name (Nama Pemohon)" value={form.contact_person} onChange={change('contact_person')} error={shown('contact_person')} placeholder="Full name as on your IC" helper="Printed on the official form as Nama Pemohon." required />
              </div>
              <TextField id="applicant_id_number" label="Student ID (No ID Pelajar)" value={form.applicant_id_number} onChange={change('applicant_id_number')} error={shown('applicant_id_number')} placeholder="e.g. AM2026123456" required />
              <TextField id="applicant_ic_number" label="IC Number (No. KP)" value={form.applicant_ic_number} onChange={change('applicant_ic_number')} error={shown('applicant_ic_number')} placeholder="e.g. 050101-14-1234" helper="Optional." />
              <TextField id="applicant_position" label="Position in Club (Jawatan)" value={form.applicant_position} onChange={change('applicant_position')} error={shown('applicant_position')} placeholder="e.g. Secretary" required />
              <TextField id="contact_info" label="Phone Number (No. H/P)" type="tel" value={form.contact_info} onChange={change('contact_info')} error={shown('contact_info')} placeholder="e.g. 012-3456789" helper="HEPA uses this number to reach you about this event." required />
            </div>
          )}

          {stepKey === 'schedule' && (
            <div className="grid sm:grid-cols-3 gap-4">
              <TextField id="event_date" label="Event Date" type="date" value={form.event_date} onChange={change('event_date')} error={shown('event_date')} required />
              <TextField id="event_time" label="Start Time" type="time" value={form.event_time} onChange={change('event_time')} error={shown('event_time')} required />
              <TextField id="end_time" label="End Time" type="time" value={form.end_time} onChange={change('end_time')} error={shown('end_time')} required />
              <div className="sm:col-span-3">
                <TextField id="venue" label="Venue" value={form.venue} onChange={change('venue')} error={shown('venue')} placeholder="e.g. Dewan Besar, Block C" maxLength={200} required />
              </div>
            </div>
          )}

          {stepKey === 'budget' && (
            <BudgetEditor
              rows={rows}
              onChange={(next) => { setRows(next); setDirty(true); }}
              rowErrors={rowErrors}
              showErrors={attempted.has(step)}
              generalError={errors.budget}
            />
          )}

          {stepKey === 'documents' && (
            <DocumentsStep
              existing={existing}
              added={added}
              error={errors.documents}
              showError={attempted.has(step)}
              onAdd={(items) => { setAdded((list) => [...list, ...items]); setDirty(true); }}
              onChangeKind={(key, kind) => setAdded((list) => list.map((d) => (d.key === key ? { ...d, kind } : d)))}
              onRemoveAdded={(key) => setAdded((list) => list.filter((d) => d.key !== key))}
              onRemoveExisting={setDocToRemove}
            />
          )}

          {stepKey === 'review' && (
            <ReviewStep
              form={form}
              rows={rows}
              existing={existing}
              added={added}
              problems={problems}
              onEdit={goTo}
              confirmed={confirmed}
              onConfirm={(v) => { setConfirmed(v); setConfirmMissing(false); }}
              clubName={user?.club_name || user?.name}
              isResubmit={isResubmit}
            />
          )}
          {isLast && confirmMissing && problems.length === 0 && (
            <p role="alert" className="text-sm text-red-600 mt-3">Tick the confirmation box to continue.</p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-8 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {!isResubmit && (
              <Button type="button" variant="secondary" onClick={saveDraft} disabled={busy}>
                <Save className="w-4 h-4" /> {busy ? 'Saving...' : 'Save Draft'}
              </Button>
            )}
            <span className="text-sm text-slate-500" role="status" aria-live="polite">{notice}</span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} disabled={step === 0 || busy}>
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
            {isLast ? (
              <Button type="button" onClick={requestSubmit} disabled={busy}>
                <Send className="w-4 h-4" /> {isResubmit ? 'Resubmit Proposal' : 'Submit Proposal'}
              </Button>
            ) : (
              <Button type="button" onClick={next} disabled={busy}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={submit}
        title={isResubmit ? 'Resubmit this proposal?' : 'Submit this proposal to HEPA?'}
        message={
          isResubmit
            ? 'HEPA will review your changes. You won’t be able to edit it again unless they ask for more changes.'
            : 'Once submitted you won’t be able to edit it unless HEPA asks for changes. Make sure the details and documents are correct.'
        }
        confirmLabel={isResubmit ? 'Resubmit' : 'Submit proposal'}
      />

      <ConfirmModal
        open={!!docToRemove}
        onClose={() => setDocToRemove(null)}
        onConfirm={removeExisting}
        title="Remove this document?"
        message={`“${docToRemove?.original_name}” will be removed from the proposal.`}
        confirmLabel="Remove"
        danger
      />
    </DashboardLayout>
  );
}
