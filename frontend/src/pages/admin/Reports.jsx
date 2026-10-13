import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import client from '../../api/client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import BarList from '../../components/ui/BarList';
import { EVENT_TYPE_LABEL } from '../../constants/eventTypes';

const STATUS_BAR = {
  pending: { label: 'Pending Review', className: 'bg-amber-500' },
  queries: { label: 'Needs Revision', className: 'bg-orange-500' },
  approved: { label: 'Approved', className: 'bg-green-500' },
  rejected: { label: 'Rejected', className: 'bg-red-500' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-400' },
  draft: { label: 'Draft', className: 'bg-slate-300' },
};

function monthLabel(ym) {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-MY', { month: 'short', year: '2-digit' });
}

export default function AdminReports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get('/admin/reports').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const statusItems = data.proposalsByStatus.map((r) => ({
    label: STATUS_BAR[r.status]?.label || r.status,
    value: r.count,
    barClassName: STATUS_BAR[r.status]?.className,
  }));

  const clubItems = data.proposalsByClub.map((r) => ({
    label: r.clubName,
    value: r.total,
  }));

  const categoryItems = data.eventsByCategory.map((r) => ({
    label: EVENT_TYPE_LABEL[r.eventType] || r.eventType,
    value: r.count,
  }));

  const trendItems = data.monthlyTrend.map((r) => ({
    label: monthLabel(r.month),
    value: r.count,
  }));

  return (
    <DashboardLayout>
      <PageHeader title="Reports" subtitle="System-wide breakdowns drawn from live proposal and event data." />

      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
        <Card>
          <CardHeader title="Proposals by Status" />
          <BarList items={statusItems} />
        </Card>

        <Card>
          <CardHeader title="Events by Category" subtitle="Approved and cancelled proposals" />
          <BarList items={categoryItems} emptyLabel="No approved events yet" />
        </Card>

        <Card>
          <CardHeader title="Proposals by Club" subtitle="Top 10 clubs by submission volume" />
          <BarList items={clubItems} />
        </Card>

        <Card>
          <CardHeader title="Submission Trend" subtitle="Proposals submitted per month, last 6 months" />
          <BarList items={trendItems} emptyLabel="No submissions in the last 6 months" />
        </Card>
      </div>
    </DashboardLayout>
  );
}
