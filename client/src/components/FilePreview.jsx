import React from 'react';
import { FileText, Image as ImageIcon, File, X, Eye } from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function FilePreview({ file, onRemove, onPreview, showActions = true }) {
  if (!file) return null;

  const isPdf = file.type === 'application/pdf' || file.name?.endsWith('.pdf');
  const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);

  return (
    <div className="flex items-center justify-between p-3.5 bg-[#181A20] border border-[#282B37] rounded-xl shadow-xs hover:border-brand-500/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-[#1F222B] border border-[#282B37] flex items-center justify-center flex-shrink-0 text-brand-400">
          {isPdf ? (
            <FileText className="w-5 h-5" />
          ) : isImage ? (
            <ImageIcon className="w-5 h-5" />
          ) : (
            <File className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-slate-400">
            {file.size ? formatBytes(file.size) : 'File ready'}
          </p>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(file)}
              className="p-1.5 text-slate-400 hover:text-brand-300 hover:bg-[#1F222B] rounded-lg transition-colors"
              title="Preview file"
              aria-label="Preview file"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(file)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Remove file"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
