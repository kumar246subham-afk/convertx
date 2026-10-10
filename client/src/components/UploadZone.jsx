import { useCallback, useState } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle, Plus } from 'lucide-react';
import { formatBytes } from '../utils/format';

const ICON_MAP = {
  'application/pdf': FileText,
  'image/jpeg': Image,
  'image/png': Image,
  'image/webp': Image,
};

function FileIcon({ mime }) {
  const Icon = ICON_MAP[mime] || File;
  return <Icon className="w-5 h-5 text-brand-400" />;
}

export default function UploadZone({
  files,
  onFilesChange,
  acceptedTypes = ['.pdf'],
  acceptedMime = ['application/pdf'],
  multiple = false,
  maxFiles = 20,
  maxSizeMB = 25,
  label = 'Upload your file',
  subLabel,
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const validate = (incoming) => {
    const valid = [];
    let err = '';

    for (const f of incoming) {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!acceptedTypes.includes(ext) && !acceptedMime.includes(f.type)) {
        err = `"${f.name}" is not a supported file type. Accepted: ${acceptedTypes.join(', ')}`;
        continue;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        err = `"${f.name}" exceeds the ${maxSizeMB} MB size limit.`;
        continue;
      }
      valid.push(f);
    }
    return { valid, err };
  };

  const handleFiles = useCallback((incoming) => {
    const list = Array.from(incoming);
    const { valid, err } = validate(list);
    setError(err);
    if (!valid.length) return;

    if (multiple) {
      onFilesChange((prev) => {
        const combined = [...prev, ...valid];
        if (combined.length > maxFiles) {
          setError(`You can upload at most ${maxFiles} files.`);
          return prev;
        }
        return combined;
      });
    } else {
      onFilesChange([valid[0]]);
    }
  }, [acceptedTypes, acceptedMime, multiple, maxFiles, maxSizeMB, onFilesChange]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onInputChange = (e) => handleFiles(e.target.files);

  const removeFile = (idx) => {
    onFilesChange((prev) => prev.filter((_, i) => i !== idx));
  };

  const inputId = `upload-input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="space-y-3.5">
      {/* Drop zone */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-200 p-8
          ${dragging
            ? 'border-brand-500 bg-brand-950/40 scale-[1.01]'
            : 'border-[#282B37] bg-[#12141A] hover:border-brand-500/70 hover:bg-[#181A20]'
          }
          ${files.length > 0 && !multiple ? 'py-5' : 'py-10'}
        `}
      >
        <input
          id={inputId}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={onInputChange}
        />

        {files.length === 0 || multiple ? (
          <>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              dragging ? 'bg-brand-900/60 text-brand-300' : 'bg-[#1F222B] border border-[#282B37] text-slate-300'
            }`}>
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-base">{label}</p>
              <p className="text-sm text-slate-400 mt-1">
                {subLabel || `Drag & drop or click to browse · Max ${maxSizeMB} MB`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supported: {acceptedTypes.join(', ')}
              </p>
            </div>
            {multiple && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brand-300 font-medium bg-brand-950/60 px-3 py-1.5 rounded-full border border-brand-800/60 hover:bg-brand-900/50 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add {files.length > 0 ? 'more ' : ''}files
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Upload className="w-4 h-4 text-brand-400" />
            <span>Click or drag to replace file</span>
          </div>
        )}
      </label>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, idx) => (
            <li key={`${f.name}-${idx}`} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#181A20] border border-[#282B37] shadow-sm">
              <FileIcon mime={f.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{f.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
