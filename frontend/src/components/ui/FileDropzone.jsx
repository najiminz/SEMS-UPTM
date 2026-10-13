import { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

export default function FileDropzone({ label, helper, required, multiple = false, files, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const fileList = files ? Array.from(files) : [];

  function handleFiles(fileListLike) {
    const incoming = Array.from(fileListLike || []);
    if (incoming.length === 0) return;
    onChange(multiple ? [...fileList, ...incoming] : incoming.slice(0, 1));
  }

  function removeFile(index) {
    onChange(fileList.filter((_, i) => i !== index));
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-navy-500 bg-navy-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
      >
        <UploadCloud className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
        <p className="text-sm text-slate-600">
          <span className="font-medium text-navy-700">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-400">PDF, Word, Excel or image — max 10MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {fileList.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {fileList.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 text-sm bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5"
            >
              <span className="flex items-center gap-1.5 min-w-0 text-slate-700">
                <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                aria-label={`Remove ${file.name}`}
                className="text-slate-400 hover:text-red-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {helper && <p className="text-xs text-slate-400 mt-1.5">{helper}</p>}
    </div>
  );
}
