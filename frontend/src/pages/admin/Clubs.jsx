import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Building2, Trash2 } from 'lucide-react';
import client from '../../api/client';
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
import { TextField, TextareaField } from '../../components/ui/FormField';

const EMPTY_FORM = { name: '', description: '' };

export default function AdminClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    client.get('/clubs', { params }).then((res) => setClubs(res.data.clubs)).finally(() => setLoading(false));
  }

  useEffect(load, [search, statusFilter]);

  function openCreate() {
    setEditingClub(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c) {
    setEditingClub(c);
    setForm({ name: c.name, description: c.description || '' });
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingClub) {
        await client.patch(`/clubs/${editingClub.id}`, form);
        setSuccess('Club updated');
      } else {
        await client.post('/clubs', form);
        setSuccess('Club created');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save club');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(c) {
    setError('');
    try {
      await client.patch(`/clubs/${c.id}/status`, { status: c.status === 'active' ? 'inactive' : 'active' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update club status');
    }
  }

  async function handleDelete() {
    setError('');
    try {
      await client.delete(`/clubs/${deleteTarget.id}`);
      setSuccess(`${deleteTarget.name} was deleted`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete club');
      setDeleteTarget(null);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Club Management"
        subtitle="Register clubs and assign their committee members."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Club
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
            placeholder="Search clubs..."
            className="w-full bg-surface border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-6">
            <CardListSkeleton rows={4} />
          </div>
        ) : clubs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clubs yet"
            subtitle="Register your first club to start assigning committee members."
            action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Club</Button>}
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Club Name</Th>
                <Th>Committee</Th>
                <Th>Status</Th>
                <Th>Proposals</Th>
                <Th>Actions</Th>
              </tr>
            </THead>
            <TBody>
              {clubs.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium text-slate-900">
                    <Link to={`/admin/clubs/${c.id}`} className="hover:underline">{c.name}</Link>
                  </Td>
                  <Td className="text-slate-600">{c.member_count} member{c.member_count === 1 ? '' : 's'}</Td>
                  <Td>
                    <button
                      onClick={() => toggleStatus(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </Td>
                  <Td className="text-slate-600">{c.proposal_count}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(c)} className="text-sm text-navy-700 hover:underline">Edit</button>
                      <Link to={`/admin/clubs/${c.id}`} className="text-sm text-slate-500 hover:underline">View</Link>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="text-sm text-brand-700 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingClub ? 'Edit Club' : 'Add Club'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Club Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextareaField
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What does this club do?"
          />
          <div className="flex items-center gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Club"
        message={`Permanently delete "${deleteTarget?.name}"? This only works if no proposal was ever submitted under it — clubs with proposal history must be deactivated instead. This cannot be undone.`}
        confirmLabel="Delete Club"
        danger
      />
    </DashboardLayout>
  );
}
