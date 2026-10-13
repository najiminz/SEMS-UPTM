import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, MailCheck, LockKeyhole, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import OtpVerification from '../components/auth/OtpVerification';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { TextField } from '../components/ui/FormField';

const STEP_COPY = {
  request: {
    n: 1,
    icon: KeyRound,
    title: 'Forgot your password?',
    subtitle: "Enter your email or username and we'll send a 6-digit code to the email on file.",
  },
  otp: {
    n: 2,
    icon: MailCheck,
    title: 'Check your email',
    subtitle: 'Enter the code to prove the account is yours.',
  },
  reset: {
    n: 3,
    icon: LockKeyhole,
    title: 'Set a new password',
    subtitle: 'Choose a password you have not used elsewhere.',
  },
  done: {
    icon: CheckCircle2,
    title: 'Password updated',
    subtitle: 'You can now sign in with your new password.',
  },
};

export default function ForgotPassword() {
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth();

  const [step, setStep] = useState('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [codeRejected, setCodeRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setFieldErrors({ identifier: 'Enter your email or username.' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await forgotPassword(identifier.trim());
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    const errors = {};
    if (!newPassword) errors.newPassword = 'Enter a new password.';
    else if (newPassword.length < 8) errors.newPassword = 'Use at least 8 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Re-enter your new password.';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({
        identifier: identifier.trim(),
        code,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep('done');
    } catch (err) {
      const data = err.response?.data || {};
      setError(data.message || 'Could not reset your password. Please try again.');
      if (data.reason) setCodeRejected(true);
    } finally {
      setSubmitting(false);
    }
  }

  const copy = STEP_COPY[step];

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      icon={copy.icon}
      footer={
        step !== 'done' && (
          <Link to="/login" className="text-navy-700 dark:text-navy-300 font-medium hover:underline">Back to sign in</Link>
        )
      }
    >
      {copy.n && (
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" aria-label={`Step ${copy.n} of 3`}>
          Step {copy.n} of 3
        </p>
      )}

      {step === 'request' && (
        <form onSubmit={handleRequest} noValidate className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <TextField
            id="identifier"
            label="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={fieldErrors.identifier}
            autoComplete="username"
            autoFocus
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Sending code...' : 'Send code'}
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <OtpVerification
          submitLabel="Verify code"
          successMessage="Code verified."
          onVerify={(value) => verifyResetCode(identifier.trim(), value)}
          onResend={() => forgotPassword(identifier.trim())}
          onSuccess={(_, verifiedCode) => {
            setCode(verifiedCode);
            setTimeout(() => setStep('reset'), 600);
          }}
          onBack={() => setStep('request')}
          backLabel="Use a different email or username"
        />
      )}

      {step === 'reset' && (
        <form onSubmit={handleReset} noValidate className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <PasswordField
            id="new-password"
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={fieldErrors.newPassword}
            helper="At least 8 characters."
            autoComplete="new-password"
            autoFocus
            required
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            required
          />
          {codeRejected ? (
            <Button type="button" size="lg" className="w-full" onClick={() => { setError(''); setCodeRejected(false); setStep('request'); }}>
              Request a new code
            </Button>
          ) : (
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Updating...' : 'Reset password'}
            </Button>
          )}
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <Alert variant="success">Your password has been reset and any account lock has been lifted.</Alert>
          <Link to="/login">
            <Button size="lg" className="w-full">Go to sign in</Button>
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
