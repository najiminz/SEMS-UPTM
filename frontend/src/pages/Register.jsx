import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserPlus, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardFor } from '../utils/dashboardPath';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import OtpVerification from '../components/auth/OtpVerification';
import GoogleSignInButton, { GOOGLE_SIGN_IN_ENABLED } from '../components/GoogleSignInButton';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import { TextField, SelectField } from '../components/ui/FormField';

const ROLE_OPTIONS = [
  { value: 'club_committee', label: 'Club Committee' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;

const INITIAL_FORM = {
  name: '',
  id_number: '',
  username: '',
  email: '',
  contact_number: '',
  password: '',
  confirm_password: '',
  role: 'club_committee',
  claimed_club_name: '',
  department: '',
  terms: false,
};

function validate(form, { google }) {
  const e = {};
  if (!google) {
    if (!form.name.trim()) e.name = 'Enter your full name.';
    if (!form.username) e.username = 'Choose a username.';
    else if (!USERNAME_RE.test(form.username)) {
      e.username = '3-50 characters: letters, numbers, dots, underscores or hyphens.';
    }
    if (!form.email) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email address, like name@example.com.';
    if (!form.password) e.password = 'Create a password.';
    else if (form.password.length < 8) e.password = 'Use at least 8 characters.';
    if (!form.confirm_password) e.confirm_password = 'Re-enter your password.';
    else if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match.';
  }
  if (!form.id_number.trim()) e.id_number = 'Enter your student or staff ID.';
  if (form.role === 'club_committee' && !form.claimed_club_name.trim()) {
    e.claimed_club_name = 'Enter the club or organisation you represent.';
  }
  if (form.role === 'hepa_officer' && !form.department.trim()) {
    e.department = 'Enter your department or unit.';
  }
  if (!form.terms) e.terms = 'You need to accept the Terms of Use to continue.';
  return e;
}

export default function Register() {
  const { register, verifySignup, loginWithGoogle, registerWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const [pendingEmail, setPendingEmail] = useState(null);

  const [google, setGoogle] = useState(() =>
    location.state?.googleCredential
      ? { credential: location.state.googleCredential, profile: location.state.googleProfile }
      : null
  );

  const errors = validate(form, { google });
  const shown = (field) => (touched[field] || submitAttempted ? errors[field] : undefined);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await register(form);
      setPendingEmail(res.email);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await registerWithGoogle({
        credential: google.credential,
        role: form.role,
        id_number: form.id_number,
        contact_number: form.contact_number,
        claimed_club_name: form.claimed_club_name,
        department: form.department,
      });
      navigate(dashboardFor(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError('');
      try {
        const result = await loginWithGoogle(credential);
        if (result.needsRegistration) {
          setGoogle({ credential, profile: result.profile });
        } else {
          navigate(dashboardFor(result.user.role));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      }
    },
    [loginWithGoogle, navigate]
  );

  const roleFields = (
    <>
      <SelectField id="role" label="Role" value={form.role} onChange={update('role')} helper="HEPA officer accounts are created by the system administrator." required>
        {ROLE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </SelectField>
      {form.role === 'club_committee' && (
        <TextField
          id="claimed_club_name"
          label="Club / Organisation"
          value={form.claimed_club_name}
          onChange={update('claimed_club_name')}
          onBlur={blur('claimed_club_name')}
          error={shown('claimed_club_name')}
          helper="Admin will verify your association with this club."
          required
        />
      )}
    </>
  );

  const termsField = (
    <div>
      <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={form.terms}
          onChange={update('terms')}
          aria-invalid={shown('terms') ? true : undefined}
          aria-describedby={shown('terms') ? 'terms-hint' : undefined}
          className="w-4 h-4 mt-0.5 rounded border-slate-300 accent-brand-600 shrink-0"
        />
        <span>
          I agree to the{' '}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setTermsOpen(true); }}
            className="text-navy-700 dark:text-navy-300 font-medium hover:underline"
          >
            Terms of Use
          </button>
          .
        </span>
      </label>
      {shown('terms') && <p id="terms-hint" className="text-xs text-red-600 mt-1.5">{shown('terms')}</p>}
    </div>
  );

  const termsModal = (
    <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title="Terms of Use">
      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
        <li>Provide accurate details about yourself and the role you register for.</li>
        <li>Keep your password and one-time codes private. You are responsible for activity on your account.</li>
        <li>Upload only documents relevant to your event proposals.</li>
        <li>Sign-ins, proposal actions and account changes are recorded in an audit log.</li>
        <li>UPTM may deactivate accounts that are misused.</li>
      </ul>
      <Button className="w-full mt-5" onClick={() => setTermsOpen(false)}>Close</Button>
    </Modal>
  );

  if (pendingEmail) {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="One last step to activate your account."
        icon={MailCheck}
      >
        <OtpVerification
          email={pendingEmail}
          submitLabel="Verify & activate account"
          successMessage="Email verified. Taking you to your dashboard..."
          onVerify={(code) => verifySignup(pendingEmail, code)}
          onResend={() => register(form)}
          onSuccess={(user) => setTimeout(() => navigate(dashboardFor(user.role)), 700)}
          onBack={() => setPendingEmail(null)}
          backLabel="Use a different email or edit my details"
        />
      </AuthLayout>
    );
  }

  if (google) {
    return (
      <AuthLayout
        title="Almost done"
        subtitle={`Signed in as ${google.profile.name} (${google.profile.email}). A few more details and your account is ready.`}
        icon={UserPlus}
      >
        <form onSubmit={handleGoogleSubmit} noValidate className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <TextField
            id="id_number"
            label="Student / Staff ID"
            value={form.id_number}
            onChange={update('id_number')}
            onBlur={blur('id_number')}
            error={shown('id_number')}
            placeholder="e.g. AM2026123456 or STF00123"
            required
          />
          {roleFields}
          <TextField
            id="contact_number"
            label="Contact number (optional)"
            value={form.contact_number}
            onChange={update('contact_number')}
            placeholder="e.g. 0123456789"
            autoComplete="tel"
          />
          {termsField}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={() => setGoogle(null)}>
            Cancel
          </Button>
        </form>
        {termsModal}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a club committee member."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-navy-700 dark:text-navy-300 font-medium hover:underline">Sign in</Link>
        </p>
      }
    >
      {GOOGLE_SIGN_IN_ENABLED && (
        <>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
          <div className="flex items-center gap-3 my-5" role="separator" aria-label="or register with email">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">or with email</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <TextField
          id="name"
          label="Full name"
          value={form.name}
          onChange={update('name')}
          onBlur={blur('name')}
          error={shown('name')}
          autoComplete="name"
          required
        />
        <TextField
          id="id_number"
          label="Student / Staff ID"
          value={form.id_number}
          onChange={update('id_number')}
          onBlur={blur('id_number')}
          error={shown('id_number')}
          placeholder="e.g. AM2026123456 or STF00123"
          required
        />
        <TextField
          id="username"
          label="Username"
          value={form.username}
          onChange={update('username')}
          onBlur={blur('username')}
          error={shown('username')}
          helper="You can sign in with this or your email."
          autoComplete="username"
          required
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={update('email')}
          onBlur={blur('email')}
          error={shown('email')}
          helper="We'll send a 6-digit code here to verify it's you."
          autoComplete="email"
          required
        />
        <TextField
          id="contact_number"
          label="Contact number (optional)"
          value={form.contact_number}
          onChange={update('contact_number')}
          placeholder="e.g. 0123456789"
          autoComplete="tel"
        />
        <PasswordField
          id="password"
          label="Password"
          value={form.password}
          onChange={update('password')}
          onBlur={blur('password')}
          error={shown('password')}
          helper="At least 8 characters."
          autoComplete="new-password"
          required
        />
        <PasswordField
          id="confirm_password"
          label="Confirm password"
          value={form.confirm_password}
          onChange={update('confirm_password')}
          onBlur={blur('confirm_password')}
          error={shown('confirm_password')}
          autoComplete="new-password"
          required
        />
        {roleFields}
        {termsField}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Sending code...' : 'Register'}
        </Button>
      </form>
      {termsModal}
    </AuthLayout>
  );
}
