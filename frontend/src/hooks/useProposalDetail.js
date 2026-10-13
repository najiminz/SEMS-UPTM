import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';

export function useProposalDetail(id) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    return client
      .get(`/proposals/${id}`)
      .then((res) => {
        setData(res.data);
        setError('');
        return res.data;
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load this proposal.'));
  }, [id]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  return { data, error, reload };
}
