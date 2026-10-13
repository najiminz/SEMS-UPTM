import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { TextareaField } from './FormField';

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  requireReason = false,
  reasonLabel = 'Reason',
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (requireReason && !reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason);
      setReason('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title}>
      <div className="space-y-4">
        {message && <p className="text-sm text-slate-500">{message}</p>}
        {requireReason && (
          <TextareaField
            label={reasonLabel}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this action is being taken..."
          />
        )}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={busy || (requireReason && !reason.trim())}
          >
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
