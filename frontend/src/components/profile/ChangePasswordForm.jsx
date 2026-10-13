import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { replaceToken } from '../../utils/tokenStorage';
import PasswordField from '../auth/PasswordField';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

function validate(form) {
  const e = {};
  if (!form.current_password) e.current_password = 'Enter your current password.';
  if (!form.new_password) e.new_password = 'Enter a new password.';
  else if (form.new_password.length < 8) e.new_password = 'Use at least 8 characters.';
  else if (form.new_password === form.current_password) e.new_password = 'Your new password must be different from the current one.';
  if (!form.confirm_password) e.confirm_password = 'Re-enter your new password.';
  else if (form.new_password && form.confirm_password !== form.new_password) e.confirm_password = 'The two new passwords do not match.';
  return e;
}

export default function ChangePasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const clientErrors = validate(form);
  const errors = { ...(attempted ? clientErrors : {}) };
  for (const [field, message] of Object.entries(serverErrors)) if (message) errors[field] = message;
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setServerErrors((s) => {
      if (!s[field]) return s;
      const { [field]: _dropped, ...rest } = s;
      return rest;
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setAttempted(true);
    if (Object.keys(clientErrors).length > 0) {
      setTimeout(() => document.querySelector('#change-password-form [aria-invalid="true"]')?.focus(), 50);
      return;
    }

    setSaving(true);
    try {
      const res = await client.post('/users/me/password', form);
      replaceToken(res.data.token);
      setForm(EMPTY);
      setAttempted(false);
      setServerErrors({});
      toast.success('Password changed.', 'Other devices were signed out. You stay signed in here.');
    } catch (err) {
      const data = err.response?.data || {};
      if (data.field) setServerErrors({ [data.field]: data.message });
      else setError(data.message || 'Could not change your password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-lg mt-6">
      <CardHeader title="Change password" subtitle="Choose a new password you don't use anywhere else" />
      <form id="change-password-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <PasswordField
          id="current_password"
          label="Current password"
          value={form.current_password}
          onChange={set('current_password')}
          error={errors.current_password}
          autoComplete="current-password"
          required
        />
        <PasswordField
          id="new_password"
          label="New password"
          value={form.new_password}
          onChange={set('new_password')}
          error={errors.new_password}
          helper="At least 8 characters."
          autoComplete="new-password"
          required
        />
        <PasswordField
          id="confirm_password"
          label="Confirm new password"
          value={form.confirm_password}
          onChange={set('confirm_password')}
          error={errors.confirm_password}
          autoComplete="new-password"
          required
        />

        <Button type="submit" disabled={saving}>
          <KeyRound className="w-4 h-4" aria-hidden="true" /> {saving ? 'Changing...' : 'Change password'}
        </Button>
        <p className="text-xs text-slate-500">
          Signed up with Google and never set a password? Use <strong>Forgot password</strong> on the sign-in page to create one.
        </p>
      </form>
    </Card>
  );
}
