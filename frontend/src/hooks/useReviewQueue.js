import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';

export const QUEUE_STATUSES = ['submitted', 'under_review', 'resubmitted', 'queries'];

export function useReviewQueue() {
  const [proposals, setProposals] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    return Promise.all([
      client.get('/proposals', { params: { status: QUEUE_STATUSES.join(','), limit: 100 } }),
      client.get('/proposals/stats'),
    ])
      .then(([listRes, statsRes]) => {
        setProposals(listRes.data.proposals);
        setTruncated(listRes.data.total > listRes.data.proposals.length);
        setStats(statsRes.data);
        setError('');
      })
      .catch(() => setError('Could not load the review queue. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { proposals, truncated, stats, loading, error, reload };
}
