import { useState, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

import { TOOL_MAP, TOOLS } from '../config/tools';
import UploadZone from '../components/UploadZone';
import ProgressIndicator from '../components/ProgressIndicator';
import ResultPanel from '../components/ResultPanel';
import ErrorMessage from '../components/ErrorMessage';
import ToolCard from '../components/ToolCard';

/* ── Option renderer ─────────────────────────────────────── */
function OptionField({ opt, value, onChange }) {
  const base =
    'w-full px-3.5 py-2.5 rounded-xl border border-[#282B37] bg-[#12141A] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition';

  if (opt.type === 'select') {
    return (
      <select className={base} value={value ?? opt.defaultValue ?? ''} onChange={(e) => onChange(e.target.value)}>
        {opt.options?.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#181A20] text-white">
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (opt.type === 'color') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value ?? opt.defaultValue ?? '#7c3aed'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-[#282B37] bg-[#12141A] cursor-pointer"
        />
        <span className="text-sm text-slate-300 font-mono">{value ?? opt.defaultValue}</span>
      </div>
    );
  }

  return (
    <input
      type={opt.type || 'text'}
      value={value ?? opt.defaultValue ?? ''}
      placeholder={opt.placeholder}
      step={opt.step}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      className={base}
    />
  );
}

/* ── FAQ accordion ───────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#282B37] bg-[#181A20] rounded-xl overflow-hidden transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#1F222B] transition-colors"
      >
        <span className="font-semibold text-white text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-brand-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed border-t border-[#282B37]/80 pt-3">{a}</div>}
    </div>
  );
}

/* ── ToolPage ────────────────────────────────────────────── */
export default function ToolPage() {
  const { toolId } = useParams();
  const tool = TOOL_MAP[toolId];

  const [files, setFiles] = useState([]);
  const [optValues, setOptValues] = useState({});
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!tool) return <Navigate to="/404" replace />;

  const { Icon, name, longDescription, color, lightColor, acceptedTypes, acceptedMime,
    multiple, maxFiles = 1, options = [], faqs = [], apiCall } = tool;

  const relatedTools = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id).slice(0, 3);

  const setOpt = (id, val) => setOptValues((prev) => ({ ...prev, [id]: val }));

  const handleProcess = useCallback(async () => {
    if (!files.length) {
      toast.error('Please upload a file first.');
      return;
    }

    // Validate required options
    for (const opt of options) {
      if (opt.required && !optValues[opt.id]) {
        toast.error(`"${opt.label}" is required.`);
        return;
      }
    }

    setError('');
    setResult(null);
    setStatus('uploading');
    setProgress(0);

    try {
      const onProgress = (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setProgress(pct);
          if (pct === 100) setStatus('processing');
        }
      };

      const response = await apiCall(files, optValues, onProgress);
      setResult(response.data.data);
      setStatus('done');
      toast.success('Processing complete!');
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setStatus('error');
    }
  }, [files, optValues, options, apiCall]);

  const handleReset = () => {
    setFiles([]);
    setOptValues({});
    setResult(null);
    setError('');
    setStatus('idle');
    setProgress(null);
  };

  const isProcessing = status === 'uploading' || status === 'processing';

  return (
    <div className="min-h-screen py-12 px-4 bg-[#0B0B0F]">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-300 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> All Tools
        </Link>

        {/* Tool header */}
        <div className="flex items-start gap-4.5 mb-8">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shadow-black/50 flex-shrink-0`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${lightColor}`}>{tool.category}</span>
            </div>
            <p className="text-slate-400 mt-1.5 leading-relaxed text-sm sm:text-base">{longDescription}</p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[#181A20] rounded-2xl border border-[#282B37] shadow-xl shadow-black/50 overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${color}`} />
          <div className="p-6 sm:p-8 space-y-6">

            {/* Upload zone */}
            {status === 'done' ? (
              <ResultPanel result={result} tool={tool} onReset={handleReset} />
            ) : isProcessing ? (
              <ProgressIndicator
                progress={status === 'processing' ? null : progress}
                label={status === 'uploading' ? 'Uploading file…' : 'Processing your document…'}
              />
            ) : (
              <>
                <UploadZone
                  files={files}
                  onFilesChange={setFiles}
                  acceptedTypes={acceptedTypes}
                  acceptedMime={acceptedMime}
                  multiple={multiple}
                  maxFiles={maxFiles}
                  label={multiple ? `Upload ${name === 'Merge PDF' ? 'PDF files (2 or more)' : 'files'}` : `Upload your file`}
                />

                {/* Options */}
                {options.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-[#282B37]">
                    <h3 className="text-sm font-semibold text-white">Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {options.map((opt) => (
                        <div key={opt.id}>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            {opt.label}
                            {opt.required && <span className="text-rose-400 ml-1">*</span>}
                          </label>
                          <OptionField
                            opt={opt}
                            value={optValues[opt.id]}
                            onChange={(val) => setOpt(opt.id, val)}
                          />
                          {opt.help && <p className="text-xs text-slate-400 mt-1">{opt.help}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <ErrorMessage error={error} onDismiss={() => setError('')} />
                )}

                {/* Process button */}
                <button
                  onClick={handleProcess}
                  disabled={!files.length}
                  className={`
                    w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white
                    bg-gradient-to-r ${color} shadow-lg shadow-black/40 transition-all active:scale-[0.99]
                    ${!files.length ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-95 hover:shadow-brand-900/50'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {name}
                </button>
              </>
            )}
          </div>
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-3.5">
              {faqs.map((faq) => <FaqItem key={faq.q} {...faq} />)}
            </div>
          </div>
        )}

        {/* Related tools */}
        {relatedTools.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Related Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {relatedTools.map((t) => <ToolCard key={t.id} tool={t} size="sm" />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
