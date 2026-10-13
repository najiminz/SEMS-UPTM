import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus, X } from 'lucide-react';
import client from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { SelectField } from '../../components/ui/FormField';
import { formatDate } from '../../utils/format';

export default function AdminClubDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [unassignedCommittee, setUnassignedCommittee] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  function load() {
    client.get(`/clubs/${id}`).then((res) => setData(res.data));
  }

  useEffect(load, [id]);

  async function openAssign() {
    const res = await client.get('/users', { params: { role: 'club_committee' } });
    setUnassignedCommittee(res.data.users.filter((u) => !u.club_id));
    setSelectedUserId('');
    setAssignOpen(true);
  }

  async function handleAssign() {
    if (!selectedUserId) return;
    setError('');
    try {
      await client.post(`/clubs/${id}/members`, { user_id: selectedUserId });
      setAssignOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign member');
    }
  }

  async function handleRemove(userId) {
    setError('');
    try {
      await client.delete(`/clubs/${id}/members/${userId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove member');
    }
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const { club, members, proposals } = data;

  return (
    <DashboardLayout>
      <PageHeader
        title={club.name}
        subtitle={club.description || 'No description provided.'}
        back={
          <Link to="/admin/clubs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Clubs
          </Link>
        }
        actions={
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${club.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
            {club.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        }
      />

      {error && <Alert variant="error" className="mb-4 max-w-2xl">{error}</Alert>}

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card padded={false}>
          <div className="p-6 pb-0">
            <CardHeader
              title="Committee Members"
              actions={
                <Button size="sm" variant="secondary" onClick={openAssign}>
                  <UserPlus className="w-3.5 h-3.5" /> Assign
                </Button>
              }
            />
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-slate-400 px-6 pb-6">No committee members assigned yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                  <button onClick={() => handleRemove(m.id)} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${m.name}`}>
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-6 pb-0">
            <CardHeader title="Proposal History" subtitle="Every proposal submitted by this club's members" />
          </div>
          {proposals.length === 0 ? (
            <p className="text-sm text-slate-400 px-6 pb-6">No proposals submitted yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {proposals.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                    <p className="text-xs text-slate-400">{formatDate(p.event_date)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Committee Member">
        <div className="space-y-4">
          {unassignedCommittee.length === 0 ? (
            <p className="text-sm text-slate-500">
              No unassigned Club Committee accounts available. Create one from User Management first.
            </p>
          ) : (
            <SelectField label="Club Committee Account" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Select a user</option>
              {unassignedCommittee.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </SelectField>
          )}
          <div className="flex items-center gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleAssign} disabled={!selectedUserId}>Assign</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
