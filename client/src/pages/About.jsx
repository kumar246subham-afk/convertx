import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Heart, CheckCircle2, ArrowRight } from 'lucide-react';
import { TOOLS } from '../config/tools';

export default function About() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto bg-[#0B0B0F]">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-950/60 border border-brand-800/60 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-4">
          About ConvertX
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Simplifying Document Workflows for Everyone
        </h1>
        <p className="mt-4 text-lg text-slate-400 leading-relaxed">
          ConvertX was built with a clear purpose: to provide fast, privacy-first, and completely accessible PDF tools without requiring subscriptions, software installations, or intrusive signups.
        </p>
      </div>

      {/* Values Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="p-8 rounded-2xl bg-[#181A20] border border-[#282B37] shadow-xl shadow-black/40 hover:border-brand-500/60 transition-all">
          <div className="w-12 h-12 rounded-xl bg-violet-950/70 border border-violet-800/60 text-violet-300 flex items-center justify-center mb-5">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Privacy First</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your files belong strictly to you. All uploaded and converted documents are automatically removed from our servers within 30 minutes. We never index or analyze document content.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-[#181A20] border border-[#282B37] shadow-xl shadow-black/40 hover:border-brand-500/60 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 flex items-center justify-center mb-5">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">True Native Speed</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Powered by high-performance backend processing pipelines using pdf-lib, Sharp, and Node.js. No third-party data broker queues or artificial waiting times.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-[#181A20] border border-[#282B37] shadow-xl shadow-black/40 hover:border-brand-500/60 transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-950/70 border border-rose-800/60 text-rose-300 flex items-center justify-center mb-5">
            <Heart className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Free & Accessible</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Every core PDF capability is completely functional out-of-the-box for anonymous users. No forced paywalls or hidden feature limits.
          </p>
        </div>
      </div>

      {/* Story / Architecture */}
      <div className="bg-[#181A20] border border-[#282B37] text-white rounded-3xl p-8 sm:p-12 mb-16 relative overflow-hidden shadow-2xl shadow-black/60">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Engineered for Performance & Trust</h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            ConvertX features over {TOOLS.length} dedicated document operations. From standard page organization (merge, split, rotate, extract) to deep optimization, password encryption, and multi-format document conversion (Word, Excel, PowerPoint, JPG, PNG).
          </p>
          <ul className="space-y-3 mb-8 text-sm text-slate-300">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Zero client data logging or permanent file retention</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Full compliance with standard PDF 1.7 / 2.0 specifications</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Automated file cleanup background daemon ensuring zero leaks</span>
            </li>
          </ul>

          <Link
            to="/tools"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold text-white shadow-lg shadow-brand-950/60 transition-all active:scale-[0.98]"
          >
            Explore All Tools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
