import { AlertCircle, X } from 'lucide-react';

export default function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 shadow-sm">
      <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-rose-200 flex-1 leading-relaxed">{error}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-6 h-6 flex items-center justify-center rounded text-rose-400 hover:text-rose-200 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
