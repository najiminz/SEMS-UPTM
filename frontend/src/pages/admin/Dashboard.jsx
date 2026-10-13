import { useEffect, useState } from 'react';
import { Building2, CalendarCheck, Clock, Users } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatRange } from '../../utils/dateRange';
import { exportAnalyticsCsv, downloadProtected } from '../../utils/exportAnalytics';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Alert from '../../components/ui/Alert';
import Skeleton from '../../components/ui/Skeleton';
import DateRangeFilter, { initialRange } from '../../components/analytics/DateRangeFilter';
import AnalyticsCharts from '../../components/analytics/AnalyticsCharts';
import ActivityFeed from '../../components/analytics/ActivityFeed';
import ExportMenu, { EXPORT_ICONS } from '../../components/analytics/ExportMenu';

export default function AdminDashboard() {
  const toast = useToast();
  const [range, setRange] = useState(() => initialRange('6m'));
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useAnalytics(range);

  useEffect(() => {
    client.get('/admin/stats').then((res) => setStats(res.data)).catch(() => setError('Could not load the headline figures.'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    client
      .get('/admin/recent-activity', { params: { limit: 8, from: range.from, to: range.to } })
      .then((res) => !cancelled && setActivity(res.data.activity))
      .catch(() => !cancelled && setError('Could not load recent activity.'))
      .finally(() => !cancelled && setActivityLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  async function exportActivity() {
    try {
      await downloadProtected('/audit-logs/export', { from: range.from, to: range.to }, `sems-activity-${range.from}-to-${range.to}.csv`);
      toast.success('Activity exported.', 'The audit entries for this period were downloaded as CSV.');
    } catch {
      toast.error('Could not export the activity log.');
    }
  }

  const exportItems = [
    {
      label: 'Analytics summary (CSV)',
      description: 'Monthly figures and categories for this period',
      icon: EXPORT_ICONS.csv,
      onSelect: () => analytics && exportAnalyticsCsv(analytics),
    },
    {
      label: 'Activity log (CSV)',
      description: 'Every audit entry in this period',
      icon: EXPORT_ICONS.csv,
      onSelect: exportActivity,
    },
    { label: 'Print / Save as PDF', icon: EXPORT_ICONS.print, onSelect: () => window.print() },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Dashboard"
        subtitle={`System overview · ${formatRange(range)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <DateRangeFilter value={range} onChange={setRange} />
            <ExportMenu items={exportItems} busy={analyticsLoading && !analytics} />
          </div>
        }
      />

      {(error || analyticsError) && <Alert variant="error" className="mb-6">{error || analyticsError}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? '–'} tone="navy" />
        <StatCard icon={Building2} label="Total Clubs" value={stats?.totalClubs ?? '–'} tone="navy" />
        <StatCard icon={CalendarCheck} label="Active Events" value={stats?.activeEvents ?? '–'} tone="green" />
        <StatCard icon={Clock} label="Pending Proposals" value={stats?.pendingProposals ?? '–'} tone="amber" />
      </div>

      {analytics ? (
        <div className={`mb-6 transition-opacity ${analyticsLoading ? 'opacity-60' : ''}`}>
          <AnalyticsCharts data={analytics} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-lg" />)}</div>
      )}

      <ActivityFeed activity={activity} loading={activityLoading} />
    </DashboardLayout>
  );
}
