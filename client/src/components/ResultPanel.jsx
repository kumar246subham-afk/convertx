import { useState } from 'react';
import { CheckCircle, Download, RefreshCw, LayoutGrid, FileText, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/format';

export default function ResultPanel({ result, tool, onReset }) {
  const [sharing, setSharing] = useState(false);

  if (!result) return null;

  const { downloadId, filename, size, sizeFormatted, originalSize, compressedSize, reductionPercent,
    pageCount, isZip, text, numpages } = result;

  const isTextResult = tool?.id === 'pdf-to-text' && text !== undefined;
  const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = async () => {
    if (!downloadId || !canWebShare) return;
    setSharing(true);
    try {
      const url = getDownloadUrl(downloadId);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not retrieve processed file for sharing.');
      const blob = await response.blob();
      const file = new File([blob], filename || 'convertx-output.pdf', {
        type: blob.type || (isZip ? 'application/zip' : 'application/pdf'),
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename || 'ConvertX Document',
          files: [file],
        });
      } else {
        await navigator.share({
          title: filename || 'ConvertX Document',
          url,
        });
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Unable to open share menu. Please use the Download button.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#282B37] bg-[#181A20] overflow-hidden shadow-xl shadow-black/50">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white">
        <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
        <span className="font-semibold text-white">Processing Complete!</span>
      </div>

      <div className="p-6 space-y-5">
        {/* File info */}
        <div className="flex items-center gap-4 p-4 bg-[#12141A] rounded-xl border border-[#282B37]">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{filename}</p>
            <p className="text-sm text-slate-400">
              {sizeFormatted || formatBytes(size)}
              {pageCount != null && ` · ${pageCount} page${pageCount !== 1 ? 's' : ''}`}
              {isZip && ' · ZIP archive'}
            </p>
          </div>
        </div>

        {/* Compression stats */}
        {originalSize != null && compressedSize != null && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#12141A] rounded-xl p-3 border border-[#282B37]">
              <p className="text-xs text-slate-400 mb-1">Original</p>
              <p className="font-bold text-white text-sm">{formatBytes(originalSize)}</p>
            </div>
            <div className="bg-emerald-950/50 rounded-xl p-3 border border-emerald-800/60">
              <p className="text-xs text-emerald-300 mb-1">Saved</p>
              <p className="font-bold text-emerald-400 text-sm">{reductionPercent}</p>
            </div>
            <div className="bg-[#12141A] rounded-xl p-3 border border-[#282B37]">
              <p className="text-xs text-slate-400 mb-1">Compressed</p>
              <p className="font-bold text-white text-sm">{formatBytes(compressedSize)}</p>
            </div>
          </div>
        )}

        {/* Text preview */}
        {isTextResult && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Extracted Text Preview ({numpages} page{numpages !== 1 ? 's' : ''})
            </p>
            <pre className="text-sm text-slate-300 bg-[#12141A] border border-[#282B37] rounded-xl p-4 max-h-48 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
              {text?.trim() || '(No readable text found in this document)'}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {downloadId && (
            <a
              href={getDownloadUrl(downloadId)}
              download={filename}
              onClick={() => toast.success('Starting file download…')}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all shadow-md shadow-brand-950/60 active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              Download {isZip ? 'ZIP Archive' : 'Processed File'}
            </a>
          )}
          {downloadId && canWebShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1F222B] border border-[#282B37] hover:border-brand-500/60 text-slate-200 hover:text-white font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1F222B] border border-[#282B37] hover:border-brand-500/60 text-slate-200 hover:text-white font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Process Another
          </button>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#282B37]">
          <Link
            to="/tools"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-300 transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> All Tools
          </Link>
          <span className="text-slate-600">·</span>
          <p className="text-xs text-slate-400">
            Files are automatically deleted after 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
