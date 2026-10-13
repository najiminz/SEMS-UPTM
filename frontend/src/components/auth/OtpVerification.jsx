import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import OtpInput from './OtpInput';

const CODE_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const DEAD_CODE_REASONS = ['expired', 'too_many_attempts', 'not_found'];

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function OtpVerification({
  email,
  onVerify,
  onResend,
  onSuccess,
  onBack,
  backLabel = 'Back',
  submitLabel = 'Verify code',
  successMessage = 'Code verified.',
}) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [codeDead, setCodeDead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + CODE_TTL_SECONDS * 1000);
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = secondsLeft === 0;
  const blocked = expired || codeDead;
  const verified = status === 'success';
  const coolingDown = resendIn > 0 && !blocked;

  function handleCodeChange(next) {
    setCode(next);
    if (status === 'error') {
      setStatus('idle');
      setError('');
    }
    setNotice('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (code.length !== 6 || blocked || verified) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const result = await onVerify(code);
      setStatus('success');
      onSuccess?.(result, code);
    } catch (err) {
      const data = err.response?.data || {};
      setStatus('error');
      setError(data.message || 'Verification failed. Please try again.');
      if (typeof data.attemptsLeft === 'number') setAttemptsLeft(data.attemptsLeft);
      if (DEAD_CODE_REASONS.includes(data.reason) || data.attemptsLeft === 0) setCodeDead(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    setResending(true);
    try {
      await onResend();
      const t = Date.now();
      setCode('');
      setStatus('idle');
      setAttemptsLeft(null);
      setCodeDead(false);
      setNow(t);
      setExpiresAt(t + CODE_TTL_SECONDS * 1000);
      setResendAt(t + RESEND_COOLDOWN_SECONDS * 1000);
      setNotice('A new code has been sent. Any earlier code no longer works.');
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.message || 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="text-sm text-slate-600">
        {email ? (
          <>
            We sent a 6-digit code to <strong className="text-slate-900 break-all">{email}</strong>.
          </>
        ) : (
          'We sent a 6-digit code to your email.'
        )}{' '}
        Enter it below.
      </p>

      <OtpInput value={code} onChange={handleCodeChange} status={status} disabled={blocked || verified} autoFocus />

      <div className="flex items-center justify-between text-xs">
        <span
          role="timer"
          className={`inline-flex items-center gap-1.5 ${expired ? 'text-red-600' : 'text-slate-500'}`}
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          {expired ? 'Code expired' : `Code expires in ${formatTime(secondsLeft)}`}
        </span>
        {!verified && (
          <span className="text-slate-400">{MAX_ATTEMPTS} attempts per code</span>
        )}
      </div>

      {status === 'error' && error && <Alert variant="error">{error}</Alert>}
      {expired && status !== 'error' && !verified && (
        <Alert variant="warning">This code has expired. Request a new one to continue.</Alert>
      )}
      {attemptsLeft !== null && attemptsLeft > 0 && !verified && (
        <Alert variant="warning">
          {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left. After that this code is blocked and you
          will need to request a new one.
        </Alert>
      )}
      {codeDead && !expired && !verified && (
        <Alert variant="warning">This code can no longer be used. Request a new one below.</Alert>
      )}
      {notice && <Alert variant="info">{notice}</Alert>}
      {verified && <Alert variant="success">{successMessage}</Alert>}

      {!verified && (
        <>
          <Button type="submit" className="w-full" disabled={submitting || code.length !== 6 || blocked}>
            {submitting ? 'Verifying...' : submitLabel}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Didn't get it?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={coolingDown || resending}
              className="font-medium text-navy-700 dark:text-navy-300 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : coolingDown ? `Resend code in ${formatTime(resendIn)}` : 'Resend code'}
            </button>
          </div>

          {onBack && (
            <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-navy-700 dark:hover:text-navy-300 hover:underline">
              {backLabel}
            </button>
          )}
        </>
      )}
    </form>
  );
}
