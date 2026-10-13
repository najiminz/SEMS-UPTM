import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardFor } from '../utils/dashboardPath';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import GoogleSignInButton, { GOOGLE_SIGN_IN_ENABLED } from '../components/GoogleSignInButton';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { TextField } from '../components/ui/FormField';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!identifier.trim()) errors.identifier = 'Enter your email or username.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login(identifier.trim(), password, remember);
      navigate(dashboardFor(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Check your connection and try again.');
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
          navigate('/register', { state: { googleCredential: credential, googleProfile: result.profile } });
        } else {
          navigate(dashboardFor(result.user.role));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      }
    },
    [loginWithGoogle, navigate]
  );

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your event proposals."
      footer={
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="text-navy-700 dark:text-navy-300 font-medium hover:underline">Register</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-brand-600"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm text-navy-700 dark:text-navy-300 font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {GOOGLE_SIGN_IN_ENABLED && (
        <>
          <div className="flex items-center gap-3 my-5" role="separator" aria-label="or">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">or</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
        </>
      )}
    </AuthLayout>
  );
}
