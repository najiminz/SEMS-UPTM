import { useEffect, useState } from 'react';
import client from '../api/client';

export function useAnalytics({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .get('/analytics', { params: { from, to } })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load analytics. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return { data, loading, error };
}
