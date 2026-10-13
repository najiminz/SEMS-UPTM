import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, Mail, Shield, Building2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import RoleAwareShell from '../components/layout/RoleAwareShell';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import InfoRow from '../components/ui/InfoRow';
import Alert from '../components/ui/Alert';
import ChangePasswordForm from '../components/profile/ChangePasswordForm';
import { avatarUrl } from '../utils/avatar';

const ROLE_LABEL = {
  club_committee: 'Club Committee',
  hepa_officer: 'HEPA Officer',
  admin: 'Administrator',
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      await client.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Could not upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <RoleAwareShell user={user}>
      <PageHeader title="My Profile" subtitle="Your account information." />
      <Card className="max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {user?.avatar_filename ? (
              <img src={avatarUrl(user.avatar_filename)} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center">
                <UserCircle className="w-9 h-9 text-navy-700" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{ROLE_LABEL[user?.role] || user?.role}</p>
            {uploading && <p className="text-xs text-slate-400 mt-0.5">Uploading...</p>}
          </div>
        </div>

        {avatarError && <Alert variant="error" className="mb-4">{avatarError}</Alert>}

        <div className="space-y-4">
          <InfoRow icon={Mail} label="Email" value={user?.email} />
          <Link to="/change-email" className="inline-block -mt-2 text-sm text-navy-700 dark:text-navy-300 font-medium hover:underline">
            Change email
          </Link>
          <InfoRow icon={Shield} label="Role" value={ROLE_LABEL[user?.role] || user?.role} />
          {user?.club_name && <InfoRow icon={Building2} label="Club" value={user.club_name} />}
        </div>
      </Card>

      <ChangePasswordForm />
    </RoleAwareShell>
  );
}
