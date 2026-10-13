import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import RoleAwareShell from '../components/layout/RoleAwareShell';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { TextField } from '../components/ui/FormField';
import OtpVerification from '../components/auth/OtpVerification';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmail() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState('form');
  const [newEmail, setNewEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestCode = (email) => client.post('/users/me/email-change/request', { new_email: email });

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    const email = newEmail.trim();
    if (!email) return setFieldError('Enter the new email address.');
    if (!EMAIL_RE.test(email)) return setFieldError('Enter a valid email address, like name@example.com.');
    if (email.toLowerCase() === user?.email?.toLowerCase()) return setFieldError('This is already your email address.');
    setFieldError('');

    setSubmitting(true);
    try {
      await requestCode(email);
      setNewEmail(email);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RoleAwareShell user={user} maxWidth="max-w-xl">
      <PageHeader title="Change email" subtitle="Confirm a new address with a 6-digit code." />
      <Card className="max-w-lg">
        {step === 'form' && (
          <form onSubmit={handleRequest} noValidate className="space-y-4">
            <p className="text-sm text-slate-500">
              Current email: <strong className="text-slate-900">{user?.email}</strong>
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <TextField
              id="new-email"
              label="New email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              error={fieldError}
              helper="We'll send the code to this address."
              autoComplete="email"
              autoFocus
              required
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>{submitting ? 'Sending code...' : 'Send code'}</Button>
              <Link to="/profile">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <OtpVerification
            email={newEmail}
            submitLabel="Verify & update email"
            successMessage="Email updated."
            onVerify={async (code) => {
              await client.post('/users/me/email-change/verify', { new_email: newEmail, code });
              await refreshUser();
            }}
            onResend={() => requestCode(newEmail)}
            onSuccess={() => setTimeout(() => setStep('done'), 600)}
            onBack={() => setStep('form')}
            backLabel="Use a different email"
          />
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <Alert variant="success">
              Your email is now <strong>{user?.email}</strong>. Use it the next time you sign in.
            </Alert>
            <Link to="/profile">
              <Button>Back to profile</Button>
            </Link>
          </div>
        )}
      </Card>
    </RoleAwareShell>
  );
}
