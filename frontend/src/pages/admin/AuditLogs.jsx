import { useEffect, useState } from 'react';
import { Download, Eye, FileClock, Search } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABEL } from '../../constants/roles';
import { shortLabel } from '../../utils/activityLabels';
import { downloadProtected } from '../../utils/exportAnalytics';
import { formatClock, formatDate } from '../../utils/format';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table';
import ResultBadge from '../../components/audit/ResultBadge';
import AuditDetailPanel from '../../components/audit/AuditDetailPanel';

const LIMIT = 25;
const control = 'bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900';
const EMPTY_FILTERS = { search: '', user_id: '', role: '', action: '', module: '', result: '', from: '', to: '' };

function Select({ id, label, value, onChange, children }) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} value={value} onChange={onChange} className={`${control} w-full`}>
        <option value="">{label}</option>
        {children}
      </select>
    </div>
  );
}

export default function AdminAuditLogs() {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({ users: [], actions: [], modules: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    client.get('/audit-logs/facets').then((res) => setFacets(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const query = { ...filters, search: debouncedSearch };
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page, limit: LIMIT };
    for (const [key, value] of Object.entries(query)) if (value) params[key] = value;
    client
      .get('/audit-logs', { params })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setError('');
      })
      .catch(() => !cancelled && setError('Could not load the audit log. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryKey, page]);

  const set = (field) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [field]: e.target.value }));
  };
  const anyFilter = Object.values(filters).some(Boolean);

  async function exportCsv() {
    setExporting(true);
    try {
      const params = {};
      for (const [key, value] of Object.entries(query)) if (value) params[key] = value;
      await downloadProtected('/audit-logs/export', params, `sems-audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Audit log exported.', 'The entries matching your filters were downloaded as CSV.');
    } catch {
      toast.error('Could not export the audit log.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Audit Logs"
        subtitle="A read-only record of every important action in SEMS: who did it, to what, from where."
        actions={
          <Button type="button" variant="secondary" onClick={exportCsv} disabled={exporting || total === 0}>
            <Download className="w-4 h-4" aria-hidden="true" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        }
      />

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <section aria-label="Filters" className="bg-surface border border-slate-200 rounded-lg p-4 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={filters.search}
              onChange={set('search')}
              placeholder="Search by user, email, action or IP address..."
              aria-label="Search the audit log"
              className={`${control} w-full pl-9 placeholder:text-slate-400`}
            />
          </div>
          <Select id="f-user" label="All users" value={filters.user_id} onChange={set('user_id')}>
            {facets.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select id="f-role" label="All roles" value={filters.role} onChange={set('role')}>
            {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select id="f-module" label="All modules" value={filters.module} onChange={set('module')}>
            {facets.modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select id="f-action" label="All actions" value={filters.action} onChange={set('action')}>
            {facets.actions.map((a) => <option key={a} value={a}>{shortLabel(a)}</option>)}
          </Select>
          <Select id="f-result" label="Any result" value={filters.result} onChange={set('result')}>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
            <option value="blocked">Blocked</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            From <input type="date" value={filters.from} onChange={set('from')} className={`${control} flex-1 min-w-0`} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            To <input type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} className={`${control} flex-1 min-w-0`} />
          </label>
          {anyFilter && (
            <div className="flex items-center">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Clear filters</Button>
            </div>
          )}
        </div>
      </section>

      <p className="text-sm text-slate-500 mb-3" role="status" aria-live="polite">
        {loading ? 'Loading...' : `${total.toLocaleString('en-MY')} ${total === 1 ? 'entry' : 'entries'}${anyFilter ? ' match your filters' : ''}`}
      </p>

      <Card padded={false}>
        {loading && logs.length === 0 ? (
          <div className="p-6 space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={FileClock} title="No matching audit entries" subtitle="Try removing a filter or widening the date range." />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <Table>
              <THead>
                <tr>
                  <Th>Timestamp</Th>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Action</Th>
                  <Th>Module</Th>
                  <Th>Target</Th>
                  <Th>IP address</Th>
                  <Th>Result</Th>
                  <Th><span className="sr-only">Details</span></Th>
                </tr>
              </THead>
              <TBody>
                {logs.map((log) => (
                  <tr key={log.id} onClick={() => setSelected(log)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <Td className="whitespace-nowrap">
                      <span className="block text-slate-800">{formatClock(log.created_at)}</span>
                      <span className="block text-xs text-slate-400">{formatDate(log.created_at)}</span>
                    </Td>
                    <Td className="min-w-36">
                      <span className="block font-medium text-slate-900">{log.user_name || 'System'}</span>
                      {log.user_email && <span className="block text-xs text-slate-400 truncate max-w-44">{log.user_email}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">{ROLE_LABEL[log.user_role] || '—'}</Td>
                    <Td>
                      <span className="block text-slate-800">{shortLabel(log.action)}</span>
                      <span className="block font-mono text-[11px] text-slate-400">{log.action}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">{log.module}</Td>
                    <Td className="min-w-36 max-w-56">
                      <span className="block text-slate-800 truncate">{log.target_label}</span>
                      {log.target_detail && <span className="block text-xs text-slate-400 truncate">{log.target_detail}</span>}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-xs text-slate-500">{log.ip_address || '—'}</Td>
                    <Td><ResultBadge result={log.result} /></Td>
                    <Td>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                        aria-label={`View details for entry ${log.id}: ${shortLabel(log.action)}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-navy-700 hover:bg-slate-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
          </div>
        )}
      </Card>

      <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}
