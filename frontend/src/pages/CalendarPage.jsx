import { useEvents } from '../hooks/useEvents';
import DashboardLayout from '../components/layout/DashboardLayout';
import PageHeader from '../components/ui/PageHeader';
import Alert from '../components/ui/Alert';
import Skeleton from '../components/ui/Skeleton';
import EventCalendar from '../components/events/EventCalendar';

export default function CalendarPage() {
  const { events, loading, error } = useEvents();

  return (
    <DashboardLayout>
      <PageHeader title="Event Calendar" subtitle="Approved UPTM events by month, week or list." />
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {loading ? <Skeleton className="h-[34rem] rounded-lg" /> : <EventCalendar events={events} />}
    </DashboardLayout>
  );
}
