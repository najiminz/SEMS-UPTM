import { EVENT_TYPE_LABEL } from '../../constants/eventTypes';
import { formatMoney } from '../../utils/format';
import { monthLabel } from '../../utils/dateRange';
import Chart from '../charts/Chart';
import ChartCard from '../charts/ChartCard';
import { SERIES } from '../charts/chartSeries';
import BarList from '../ui/BarList';
import Card from '../ui/Card';

const compactMoney = (v) => (v >= 1000 ? `RM ${Number((v / 1000).toFixed(1))}k` : `RM ${v}`);

function Figure({ label, value, hint }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900 tabular-nums">{value}</dd>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function AnalyticsCharts({ data }) {
  const { months, categories, totals } = data;

  const multiYear = new Set(months.map((m) => m.month.slice(0, 4))).size > 1;
  const points = months.map((m) => ({
    key: m.month,
    label: multiYear ? `${monthLabel(m.month)} ${m.month.slice(2, 4)}` : monthLabel(m.month),
    tooltipLabel: monthLabel(m.month, true),
    values: m,
  }));

  const noProposals = totals.proposals === 0;
  const noDecisions = totals.approved + totals.rejected === 0;
  const rate = totals.approvalRate === null ? '—' : `${Math.round(totals.approvalRate * 100)}%`;

  return (
    <div className="space-y-6">
      <Card as="section" aria-label="Summary for the selected period">
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Figure label="Proposals submitted" value={totals.proposals} />
          <Figure label="Approved" value={totals.approved} />
          <Figure label="Rejected" value={totals.rejected} />
          <Figure label="Approval rate" value={rate} hint="of decisions made" />
          <Figure label="Budget requested" value={formatMoney(totals.budget)} />
        </dl>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Event proposals over time"
          subtitle="Proposals submitted each month"
          empty={noProposals}
          table={{ columns: ['Month', 'Proposals'], rows: points.map((p) => [p.tooltipLabel, p.values.proposals]) }}
        >
          <Chart type="line" data={points} series={[SERIES.proposals]} ariaLabel="Proposals submitted per month" />
        </ChartCard>

        <ChartCard
          title="Approved vs rejected"
          subtitle="Decisions made each month"
          series={[SERIES.approved, SERIES.rejected]}
          empty={noDecisions}
          emptyLabel="No decisions were made in this period."
          table={{ columns: ['Month', 'Approved', 'Rejected'], rows: points.map((p) => [p.tooltipLabel, p.values.approved, p.values.rejected]) }}
        >
          <Chart type="bar" data={points} series={[SERIES.approved, SERIES.rejected]} ariaLabel="Approved and rejected proposals per month" />
        </ChartCard>

        <ChartCard
          title="Event categories"
          subtitle="Proposals by event type"
          empty={categories.length === 0}
        >
          <BarList items={categories.map((c) => ({ label: EVENT_TYPE_LABEL[c.type] || c.type, value: c.count }))} />
        </ChartCard>

        <ChartCard
          title="Monthly budget requests"
          subtitle="Total requested across proposals submitted each month"
          empty={noProposals}
          table={{ columns: ['Month', 'Requested'], rows: points.map((p) => [p.tooltipLabel, formatMoney(p.values.budget)]) }}
        >
          <Chart
            type="bar"
            data={points}
            series={[SERIES.budget]}
            format={(v, axis) => (axis ? compactMoney(v) : formatMoney(v))}
            ariaLabel="Budget requested per month"
          />
        </ChartCard>
      </div>
    </div>
  );
}
