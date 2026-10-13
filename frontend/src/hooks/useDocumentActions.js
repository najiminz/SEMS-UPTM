import { useState } from 'react';
import client from '../api/client';

export function useDocumentActions() {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function fetchBlobUrl(doc) {
    const res = await client.get(`/proposals/documents/${doc.id}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  }

  async function run(doc, action) {
    setError('');
    setBusyId(doc.id);
    try {
      const url = await fetchBlobUrl(doc);
      action(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError(`Could not open "${doc.original_name}". It may have been removed from the server.`);
    } finally {
      setBusyId(null);
    }
  }

  const openDocument = (doc) => run(doc, (url) => window.open(url, '_blank', 'noopener'));

  const downloadDocument = (doc) =>
    run(doc, (url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

  return { openDocument, downloadDocument, busyId, error };
}
