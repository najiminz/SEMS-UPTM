import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';

export function useMyProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    return client
      .get('/proposals/mine')
      .then((res) => {
        setProposals(res.data.proposals);
        setError('');
      })
      .catch(() => setError("Could not load your club's proposals. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { proposals, loading, error, reload };
}
