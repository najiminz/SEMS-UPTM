import { useEffect, useState } from 'react';
import client from '../api/client';
import { todayKey } from '../utils/calendar';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [registeredClubs, setRegisteredClubs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/proposals/calendar')
      .then((res) => {
        setEvents(res.data.events);
        setRegisteredClubs(res.data.registered_clubs ?? 0);
      })
      .catch(() => setError('Could not load events. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return { events, registeredClubs, loading, error };
}

export const isUpcoming = (ev) => ev.event_date >= todayKey();
