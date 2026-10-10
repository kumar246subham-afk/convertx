import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { TOOLS } from '../config/tools';

const TOOL_COLS = [
  TOOLS.filter((t) => t.category === 'Organization'),
  TOOLS.filter((t) => t.category === 'Optimization' || t.category === 'Editing' || t.category === 'Security'),
  TOOLS.filter((t) => t.category === 'Conversion'),
];

export default function Footer() {
  return (
    <footer className="bg-[#0B0B0F] border-t border-[#282B37] text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-950/60 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ConvertX</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              All your PDF tools in one simple workspace. Convert, merge, split, compress, and organise documents in seconds.
            </p>
            <div className="p-3.5 rounded-xl bg-[#181A20] border border-[#282B37] text-xs text-slate-400 max-w-sm">
              🔒 Files are automatically and permanently deleted after 30 minutes. We never view, index, or store your documents.
            </div>
          </div>

          {/* PDF Org */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-4 tracking-wide uppercase text-xs">PDF Organisation</h3>
            <ul className="space-y-2.5">
              {TOOL_COLS[0].map((t) => (
                <li key={t.id}>
                  <Link to={`/tools/${t.id}`} className="text-sm text-slate-400 hover:text-brand-400 transition-colors">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Editing & Security */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-4 tracking-wide uppercase text-xs">Edit & Secure</h3>
            <ul className="space-y-2.5">
              {TOOL_COLS[1].map((t) => (
                <li key={t.id}>
                  <Link to={`/tools/${t.id}`} className="text-sm text-slate-400 hover:text-brand-400 transition-colors">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Conversion & Company */}
          <div className="space-y-8">
            <div>
              <h3 className="text-white text-sm font-semibold mb-4 tracking-wide uppercase text-xs">Conversions</h3>
              <ul className="space-y-2.5">
                {TOOL_COLS[2].map((t) => (
                  <li key={t.id}>
                    <Link to={`/tools/${t.id}`} className="text-sm text-slate-400 hover:text-brand-400 transition-colors">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold mb-3 tracking-wide uppercase text-xs">Company</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-sm text-slate-400 hover:text-brand-400 transition-colors">About ConvertX</Link></li>
                <li><Link to="/contact" className="text-sm text-slate-400 hover:text-brand-400 transition-colors">Contact Support</Link></li>
                <li><Link to="/privacy" className="text-sm text-slate-400 hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-[#282B37] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ConvertX. All rights reserved. Professional PDF Toolset.
          </p>
          <p className="text-xs text-slate-500">
            Pure client-server processing · AES-256 standard encryption
          </p>
        </div>
      </div>
    </footer>
  );
}
