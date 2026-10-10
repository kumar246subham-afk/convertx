import React from 'react';
import { ShieldCheck, Lock, Trash2, EyeOff } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto bg-[#0B0B0F]">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
          Data Security & Privacy
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-slate-400 text-base">
          Last updated: October 2026. How ConvertX protects your documents and data.
        </p>
      </div>

      <div className="bg-[#181A20] rounded-2xl border border-[#282B37] p-8 sm:p-10 shadow-xl shadow-black/40 space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-950/70 border border-brand-800/60 text-brand-300 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">1. Automatic File Deletion</h2>
          </div>
          <p className="text-slate-400">
            Files uploaded to ConvertX are stored in a secured temporary storage directory exclusively during processing. A continuous background cleanup worker permanently deletes all uploaded files and processed output files after <strong className="text-white">30 minutes</strong>. We do not maintain backups or archives of your documents.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-950/70 border border-brand-800/60 text-brand-300 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">2. Document Content Confidentiality</h2>
          </div>
          <p className="text-slate-400">
            ConvertX performs strictly automated processing. No human ever accesses or views your uploaded files. We do not extract document text or metadata for profiling, marketing, AI model training, or commercial purposes.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-950/70 border border-brand-800/60 text-brand-300 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">3. Encryption & Passwords</h2>
          </div>
          <p className="text-slate-400">
            When you use the <strong className="text-white">Protect PDF</strong> tool, your document is encrypted using standard AES-256 encryption. Passwords provided for encryption or unlocking are processed purely in ephemeral memory and are never saved to disks, databases, log files, or browser local storage.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-950/70 border border-brand-800/60 text-brand-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">4. Optional User Accounts</h2>
          </div>
          <p className="text-slate-400">
            ConvertX is completely accessible without an account. If you choose to register, we only store your email address and a securely hashed password (bcrypt). Document contents are never linked permanently to user profiles.
          </p>
        </section>

        <div className="p-4 rounded-xl bg-[#12141A] border border-[#282B37] text-xs text-slate-400">
          If you have questions regarding document handling or privacy practices, feel free to reach out via our contact page.
        </div>
      </div>
    </div>
  );
}
