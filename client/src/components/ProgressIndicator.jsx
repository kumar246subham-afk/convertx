import { Loader2 } from 'lucide-react';

export default function ProgressIndicator({ progress, label = 'Processing your document…' }) {
  const pct = Math.round(Math.max(0, Math.min(100, progress ?? 0)));
  const isIndeterminate = progress == null;

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {isIndeterminate ? (
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
      ) : (
        <div className="w-16 h-16 relative">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#282B37" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-300">
            {pct}%
          </span>
        </div>
      )}
      <div className="text-center">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm text-slate-400 mt-1">Please wait, do not close or refresh this page</p>
      </div>
    </div>
  );
}
