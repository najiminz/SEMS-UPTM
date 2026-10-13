import { useRef, useState } from 'react';
import { Download, Eye, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { formatDate, formatFileSize } from '../../../utils/format';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import DocumentCard from '../DocumentCard';
import { ACCEPTED_EXTENSIONS, MAX_FILE_MB, checkFile } from './validation';

export const KIND_LABEL = { proposal: 'Proposal Document', budget: 'Budget Document', supporting: 'Supporting Document' };

let fileCounter = 0;

function guessKind(file, existing, added) {
  const taken = (kind) => existing.some((d) => d.document_type === kind) || added.some((d) => d.kind === kind);
  if (!taken('proposal')) return 'proposal';
  if (!taken('budget') && /budget|bajet|kewangan|anggaran|cost/i.test(file.name)) return 'budget';
  return 'supporting';
}

function previewLocalFile(file) {
  const url = URL.createObjectURL(file);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function DocumentsStep({ existing, added, onAdd, onChangeKind, onRemoveAdded, onRemoveExisting, error, showError }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);
  const { openDocument, downloadDocument, busyId, error: openError } = useDocumentActions();

  function handleFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    const problems = [];
    const accepted = [];
    for (const file of incoming) {
      const problem = checkFile(file);
      if (problem) {
        problems.push(problem);
        continue;
      }
      fileCounter += 1;
      accepted.push({ key: `file-${fileCounter}`, file, kind: guessKind(file, existing, [...added, ...accepted]) });
    }
    setFileErrors(problems);
    if (accepted.length > 0) onAdd(accepted);
  }

  return (
    <div className="space-y-5">
      {showError && error && <Alert variant="error">{error}</Alert>}
      {fileErrors.length > 0 && (
        <Alert variant="error">
          <ul className="space-y-0.5">{fileErrors.map((m) => <li key={m}>{m}</li>)}</ul>
        </Alert>
      )}
      {openError && <Alert variant="error">{openError}</Alert>}

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents: click to browse or drag files here"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-navy-500 bg-navy-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-slate-400" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm text-slate-700">
          <span className="font-medium text-navy-700 dark:text-navy-300">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500">
          PDF, Word, Excel, JPG or PNG · up to {MAX_FILE_MB} MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {existing.length + added.length === 0 ? (
        <p className="text-sm text-slate-500 text-center">No documents added yet.</p>
      ) : (
        <ul className="space-y-2.5" aria-label="Documents">
          {existing.map((doc) => (
            <li key={`doc-${doc.id}`}>
              <DocumentCard
                name={doc.original_name}
                meta={`${KIND_LABEL[doc.document_type] || 'Document'} · ${formatFileSize(doc.file_size)} · ${formatDate(doc.uploaded_at)}`}
                badge="✓ Uploaded"
              >
                <Button type="button" variant="ghost" size="sm" onClick={() => openDocument(doc)} disabled={busyId === doc.id}>
                  {busyId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => downloadDocument(doc)} disabled={busyId === doc.id}>
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveExisting(doc)}>
                  <Trash2 className="w-4 h-4" /> Remove
                </Button>
              </DocumentCard>
            </li>
          ))}

          {added.map((item) => {
            const replaces = ['proposal', 'budget'].includes(item.kind) && existing.some((d) => d.document_type === item.kind);
            return (
              <li key={item.key}>
                <DocumentCard
                  name={item.file.name}
                  meta={`${formatFileSize(item.file.size)}${replaces ? ' · replaces the uploaded one' : ''}`}
                  badge="Ready to upload"
                  badgeTone="amber"
                >
                  <label className="sr-only" htmlFor={`kind-${item.key}`}>Document type for {item.file.name}</label>
                  <select
                    id={`kind-${item.key}`}
                    value={item.kind}
                    onChange={(e) => onChangeKind(item.key, e.target.value)}
                    className="bg-surface border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-700"
                  >
                    {Object.entries(KIND_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => previewLocalFile(item.file)}>
                    <Eye className="w-4 h-4" /> Preview
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveAdded(item.key)}>
                    <Trash2 className="w-4 h-4" /> Remove
                  </Button>
                </DocumentCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
