import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, LayoutGrid } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center bg-[#0B0B0F]">
      <div className="w-16 h-16 bg-brand-950/70 border border-brand-800/60 text-brand-300 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-brand-950/60">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-5xl font-extrabold text-white tracking-tight">404</h1>
      <p className="text-xl font-bold text-slate-100 mt-2">Page or Tool Not Found</p>
      <p className="text-sm text-slate-400 mt-3 leading-relaxed">
        The tool or page you requested could not be located. It may have moved or the URL might be incorrect.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        <Link
          to="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors text-sm shadow-lg shadow-brand-950/60"
        >
          <Home className="w-4 h-4" /> Go to Homepage
        </Link>
        <Link
          to="/tools"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#181A20] border border-[#282B37] text-slate-200 font-medium hover:text-white hover:border-brand-500/60 hover:bg-[#1F222B] transition-colors text-sm"
        >
          <LayoutGrid className="w-4 h-4" /> Explore All Tools
        </Link>
      </div>
    </div>
  );
}
