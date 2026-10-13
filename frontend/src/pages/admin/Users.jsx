import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, KeyRound, Trash2, UserCircle, Users as UsersIcon } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import { CardListSkeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table';
import { TextField, SelectField } from '../../components/ui/FormField';
import { avatarUrl } from '../../utils/avatar';

const ROLES = ['club_committee', 'hepa_officer', 'admin'];
const ROLE_LABEL = { club_committee: 'Club Committee', hepa_officer: 'HEPA Officer', admin: 'Admin' };
const STATUS_BADGE = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
  deactivated: 'bg-slate-200 text-slate-700',
};
const STATUS_LABEL = { active: 'Active', pending: 'Pending', rejected: 'Rejected', deactivated: 'Deactivated' };

const EMPTY_FORM = { name: '', email: '', password: '', role: 'club_committee', club_id: '' };

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1');
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.status = statusFilter;
    client.get('/users', { params }).then((res) => setUsers(res.data.users)).finally(() => setLoading(false));
  }

  useEffect(load, [search, roleFilter, statusFilter]);
  useEffect(() => {
    client.get('/clubs').then((res) => setClubs(res.data.clubs));
  }, []);

  function openCreate() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(u) {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, club_id: u.club_id || '' });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    if (searchParams.get('new')) setSearchParams({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingUser) {
        await client.patch(`/users/${editingUser.id}`, { name: form.name, email: form.email, club_id: form.club_id || null });
        if (form.role !== editingUser.role) {
          await client.patch(`/users/${editingUser.id}/role`, { role: form.role });
        }
        setSuccess('User updated');
      } else {
        await client.post('/users', form);
        setSuccess('User created');
      }
      closeForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save user');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(u, role) {
    setError('');
    try {
      await client.patch(`/users/${u.id}/role`, { role });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change role');
    }
  }

  async function toggleActive(u) {
    setError('');
    try {
      await client.patch(`/users/${u.id}/active`, { is_active: u.status !== 'active' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    }
  }

  async function handleResetPassword() {
    setError('');
    try {
      await client.patch(`/users/${resetTarget.id}/reset-password`, { new_password: newPassword });
      setSuccess(`Password reset for ${resetTarget.name}`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    }
  }

  async function handleDelete() {
    setError('');
    try {
      await client.delete(`/users/${deleteTarget.id}`);
      setSuccess(`${deleteTarget.name} was deleted`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete user');
      setDeleteTarget(null);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="User Management"
        subtitle="View, add, and manage every account in SEMS."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add User
          </Button>
        }
      />

      {success && <Alert variant="success" className="mb-4">{success}</Alert>}
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-surface border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-6">
            <CardListSkeleton rows={5} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" subtitle="Try a different search or filter." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </THead>
            <TBody>
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id}>
                    <Td className="font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_filename ? (
                          <img src={avatarUrl(u.avatar_filename)} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <UserCircle className="w-7 h-7 text-slate-300 shrink-0" strokeWidth={1.5} />
                        )}
                        <div>
                          {u.name} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                          {u.club_name && <p className="text-xs text-slate-400 font-normal">{u.club_name}</p>}
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{u.email}</Td>
                    <Td>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot change your own role' : undefined}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-surface disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      {u.status === 'pending' || u.status === 'rejected' ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                      ) : (
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={isSelf}
                          title={isSelf ? 'You cannot deactivate your own account' : undefined}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_BADGE[u.status]}`}
                        >
                          {STATUS_LABEL[u.status]}
                        </button>
                      )}
                    </Td>
                    <Td className="text-slate-500 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button onClick={() => openEdit(u)} className="text-sm text-navy-700 hover:underline">
                          Edit
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          className="text-sm text-slate-500 hover:underline flex items-center gap-1"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="text-sm text-brand-700 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={formOpen} onClose={closeForm} title={editingUser ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {!editingUser && (
            <TextField
              label="Password"
              type="password"
              required
              minLength={8}
              helper="At least 8 characters."
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <SelectField
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            disabled={editingUser?.id === currentUser.id}
            helper={editingUser?.id === currentUser.id ? 'You cannot change your own role.' : undefined}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </SelectField>
          {form.role === 'club_committee' && (
            <SelectField label="Club" value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}>
              <option value="">Not assigned</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectField>
          )}
          <div className="flex items-center gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset Password">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Set a new password for <strong>{resetTarget?.name}</strong>. Share it with them securely.
          </p>
          <TextField
            label="New Password"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex items-center gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="button" onClick={handleResetPassword} disabled={newPassword.length < 8}>
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Permanently delete "${deleteTarget?.name}"? This only works if the account has no proposal history — accounts with history must be deactivated instead. This cannot be undone.`}
        confirmLabel="Delete User"
        danger
      />
    </DashboardLayout>
  );
}
