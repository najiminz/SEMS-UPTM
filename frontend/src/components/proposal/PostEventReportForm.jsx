import { useState } from 'react';
import client from '../../api/client';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { TextField, TextareaField } from '../ui/FormField';

export default function PostEventReportForm({ proposalId, report, onDone, onCancel }) {
  const [form, setForm] = useState({
    attendance_count: report?.attendance_count ?? '',
    actual_spending: report?.actual_spending ?? '',
    summary: report?.summary ?? '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const next = {};
    const attendance = Number(form.attendance_count);
    const spending = Number(form.actual_spending);
    if (form.attendance_count === '' || !Number.isInteger(attendance) || attendance < 0) {
      next.attendance_count = 'Enter the number of people who attended (0 or more).';
    }
    if (form.actual_spending === '' || !Number.isFinite(spending) || spending < 0) {
      next.actual_spending = 'Enter what was actually spent (0 if nothing).';
    }
    if (!form.summary.trim()) next.summary = 'Write a short summary of how the event went.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await client.post(`/reports/${proposalId}`, form);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the report. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField id="attendance" label="Attendance Count" type="number" min="0" value={form.attendance_count} onChange={set('attendance_count')} error={errors.attendance_count} required />
        <TextField id="spending" label="Actual Spending (RM)" type="number" min="0" step="0.01" value={form.actual_spending} onChange={set('actual_spending')} error={errors.actual_spending} required />
      </div>
      <TextareaField id="summary" label="Summary" value={form.summary} onChange={set('summary')} error={errors.summary} placeholder="How did the event go? Highlights, issues, lessons learned..." required />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : report ? 'Update Report' : 'Submit Report'}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>}
      </div>
    </form>
  );
}
