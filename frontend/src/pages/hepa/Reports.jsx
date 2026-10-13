import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, TrendingDown, TrendingUp } from 'lucide-react';
import client from '../../api/client';
import { useAnalytics } from '../../hooks/useAnalytics';
import { exportAnalyticsCsv } from '../../utils/exportAnalytics';
import { formatDate, formatMoney } from '../../utils/format';
import { formatRange } from '../../utils/dateRange';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table';
import DateRangeFilter, { initialRange } from '../../components/analytics/DateRangeFilter';
import AnalyticsCharts from '../../components/analytics/AnalyticsCharts';
import ExportMenu, { EXPORT_ICONS } from '../../components/analytics/ExportMenu';

function Variance({ budget, spent }) {
  const diff = Number(spent) - Number(budget);
  if (Math.abs(diff) < 0.005) return <span className="text-slate-500">On budget</span>;
  const over = diff > 0;
  const Icon = over ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 ${over ? 'text-red-700' : 'text-green-700'}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {formatMoney(Math.abs(diff))} {over ? 'over' : 'under'}
    </span>
  );
}

export default function HepaReports() {
  const [range, setRange] = useState(() => initialRange('6m'));
  const { data, loading, error } = useAnalytics(range);
  const [reports, setReports] = useState(null);
  const [reportsError, setReportsError] = useState('');

  useEffect(() => {
    client
      .get('/analytics/post-event-reports')
      .then((res) => setReports(res.data.reports))
      .catch(() => setReportsError('Could not load post-event reports.'));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        subtitle={`How proposals and budgets are trending · ${formatRange(range)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <DateRangeFilter value={range} onChange={setRange} />
            <ExportMenu
              items={[
                { label: 'Analytics summary (CSV)', description: 'Monthly figures and categories', icon: EXPORT_ICONS.csv, onSelect: () => data && exportAnalyticsCsv(data) },
                { label: 'Print / Save as PDF', icon: EXPORT_ICONS.print, onSelect: () => window.print() },
              ]}
            />
          </div>
        }
      />

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <div className={`mb-8 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {data ? (
          <AnalyticsCharts data={data} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-lg" />)}</div>
        )}
      </div>

      <Card padded={false} as="section" aria-label="Post-event reports">
        <div className="p-6 pb-3">
          <CardHeader title="Post-event reports" subtitle="What each event actually cost, against the budget HEPA approved" />
        </div>
        {reportsError && <div className="px-6 pb-4"><Alert variant="error">{reportsError}</Alert></div>}
        {!reports && !reportsError ? (
          <div className="p-6 pt-2"><Skeleton className="h-16 rounded-lg" /></div>
        ) : reports && reports.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No post-event reports yet" subtitle="Committees file these after an approved event takes place." />
        ) : reports ? (
          <Table>
            <THead>
              <tr>
                <Th>Event</Th>
                <Th>Club</Th>
                <Th>Date</Th>
                <Th className="text-right">Attendance</Th>
                <Th className="text-right">Approved budget</Th>
                <Th className="text-right">Actual spending</Th>
                <Th>Variance</Th>
              </tr>
            </THead>
            <TBody>
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="min-w-48 max-w-72">
                    <Link to={`/hepa/proposals/${r.id}`} className="font-medium text-slate-900 hover:text-navy-700 hover:underline">{r.title}</Link>
                  </Td>
                  <Td className="text-slate-600">{r.club_name}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDate(r.event_date)}</Td>
                  <Td className="text-right tabular-nums text-slate-600">{r.attendance_count}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums text-slate-600">{formatMoney(r.budget_amount)}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums text-slate-600">{formatMoney(r.actual_spending)}</Td>
                  <Td className="whitespace-nowrap"><Variance budget={r.budget_amount} spent={r.actual_spending} /></Td>
                </tr>
              ))}
            </TBody>
          </Table>
        ) : null}
      </Card>
    </DashboardLayout>
  );
}
