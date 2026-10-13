import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileClock, XCircle } from 'lucide-react';
import { activityTone, shortLabel } from '../../utils/activityLabels';
import { formatDateTime } from '../../utils/format';
import { timeAgo } from '../../utils/timeAgo';
import Card from '../ui/Card';
import EmptyState from '../EmptyState';
import Skeleton from '../ui/Skeleton';

const TONE = {
  success: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', sr: 'Success' },
  warning: { icon: AlertTriangle, className: 'bg-amber-100 text-amber-700', sr: 'Needs attention' },
  danger: { icon: XCircle, className: 'bg-red-100 text-red-700', sr: 'Declined or removed' },
};

export default function ActivityFeed({ activity, loading }) {
  return (
    <Card padded={false} as="section" aria-labelledby="activity-heading">
      <div className="flex items-start justify-between gap-4 p-6 pb-3">
        <div>
          <h2 id="activity-heading" className="text-base font-semibold text-slate-900">Recent activity</h2>
          <p className="text-sm text-slate-500 mt-0.5">Latest actions across the system</p>
        </div>
        <Link to="/admin/audit-logs" className="text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline shrink-0 no-print">
          View audit log
        </Link>
      </div>

      {loading ? (
        <div className="p-6 pt-2 space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : activity.length === 0 ? (
        <EmptyState icon={FileClock} title="No activity in this period" subtitle="Try a wider date range." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {activity.map((log) => {
            const { icon: Icon, className, sr } = TONE[activityTone(log)];
            return (
              <li key={log.id} className="flex items-start gap-3 px-6 py-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${className}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">{sr}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{shortLabel(log.action)}</p>
                  <p className="text-xs text-slate-500">
                    {log.subject}
                    {' · '}
                    <time dateTime={log.created_at} title={formatDateTime(log.created_at)}>{timeAgo(log.created_at)}</time>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
