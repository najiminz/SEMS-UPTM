import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, ArrowRight } from 'lucide-react';
import client from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { TextField } from '../../components/ui/FormField';
import { EVENT_TYPES } from '../../constants/eventTypes';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [availableExtensions, setAvailableExtensions] = useState([]);
  const [selectedExtensions, setSelectedExtensions] = useState([]);
  const [maxSize, setMaxSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    client.get('/settings').then((res) => {
      setSettings(res.data.settings);
      setAvailableExtensions(res.data.availableExtensions);
      setSelectedExtensions(res.data.settings.allowed_extensions.split(','));
      setMaxSize(res.data.settings.max_upload_size_mb);
    });
  }, []);

  function toggleExtension(ext) {
    setSelectedExtensions((prev) => (prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await client.patch('/settings', { max_upload_size_mb: Number(maxSize), allowed_extensions: selectedExtensions });
      setSuccess('Settings updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update settings');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="System Settings" subtitle="Configuration that applies across the whole platform." />

      <div className="space-y-6 max-w-2xl">
        {success && <Alert variant="success">{success}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <CardHeader title="Proposal Settings" subtitle="Controls enforced by the server on every document upload" />
          <form onSubmit={handleSave} className="space-y-5">
            <TextField
              label="Maximum Upload Size (MB)"
              type="number"
              min={1}
              max={100}
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              helper="Applies to every proposal, budget and supporting document upload."
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Allowed Document Formats</label>
              <div className="flex flex-wrap gap-2">
                {availableExtensions.map((ext) => (
                  <button
                    type="button"
                    key={ext}
                    onClick={() => toggleExtension(ext)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedExtensions.includes(ext)
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-surface border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {ext}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Files with any other extension — or a MIME type that doesn't match — are rejected at upload time.
              </p>
            </div>
            <Button type="submit" disabled={saving || selectedExtensions.length === 0}>
              {saving ? 'Saving...' : 'Save Proposal Settings'}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Event Settings" subtitle="Event categories available across the platform" />
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => (
              <span key={t.value} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
                {t.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Categories are fixed for this deployment. Changing them requires a database migration since
            they are enforced at the schema level.
          </p>
        </Card>

        <Card>
          <CardHeader title="Account Settings" subtitle="Role configuration and account status" />
          <p className="text-sm text-slate-500 mb-4">
            Roles, account activation, and password resets are managed from User Management.
          </p>
          <Link to="/admin/users">
            <Button variant="secondary">
              <Users className="w-4 h-4" /> Go to User Management <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </DashboardLayout>
  );
}
