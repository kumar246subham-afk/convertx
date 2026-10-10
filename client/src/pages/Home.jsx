import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Shield, Zap, Globe, ChevronDown, ChevronUp,
  Upload, Check, Download, LayoutGrid
} from 'lucide-react';
import { POPULAR_TOOLS, TOOLS, CATEGORIES } from '../config/tools';
import ToolCard from '../components/ToolCard';

const FAQS = [
  {
    q: 'Is ConvertX free to use?',
    a: 'Yes. All core PDF tools are completely free for anonymous users. No account required.',
  },
  {
    q: 'Are my uploaded documents secure?',
    a: 'Files are processed on our server and automatically deleted after 30 minutes. We never read, share, or sell your documents.',
  },
  {
    q: 'What is the maximum file size?',
    a: 'The default maximum upload size is 25 MB per file. Contact us if you need higher limits.',
  },
  {
    q: 'Does Word/PowerPoint conversion require special software?',
    a: 'Word and Excel conversions work out-of-the-box. Full-fidelity PowerPoint conversion requires LibreOffice to be installed on the server.',
  },
  {
    q: 'Can I use ConvertX on mobile?',
    a: 'Absolutely. ConvertX is fully responsive and works on any modern smartphone or tablet browser.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#282B37] bg-[#181A20] rounded-2xl overflow-hidden transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4.5 text-left hover:bg-[#1F222B] transition-colors"
      >
        <span className="font-semibold text-white text-sm sm:text-base">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-brand-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#282B37]/80 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

function HeroUploadPrompt() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    if (!files.length) return;
    navigate('/tools/merge-pdf');
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`
        relative max-w-xl mx-auto mt-10 rounded-2xl border-2 border-dashed cursor-pointer
        flex flex-col items-center gap-4 p-10 transition-all duration-200 shadow-xl shadow-black/50
        ${dragging
          ? 'border-brand-500 bg-brand-950/40 scale-[1.01]'
          : 'border-[#282B37] bg-[#181A20] hover:border-brand-500/70 hover:bg-[#1F222B]'
        }
      `}
    >
      <input ref={inputRef} type="file" className="sr-only" multiple onChange={(e) => handleFiles(e.target.files)} />
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
        dragging ? 'bg-brand-900/60 text-brand-300' : 'bg-[#12141A] border border-[#282B37] text-slate-300'
      }`}>
        <Upload className="w-7 h-7" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-white text-lg">Drop your PDF here to get started</p>
        <p className="text-slate-400 text-sm mt-1">or click to browse files from your device</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center text-xs text-slate-400">
        <span className="bg-[#12141A] border border-[#282B37] px-2.5 py-1 rounded-md">PDF</span>
        <span className="bg-[#12141A] border border-[#282B37] px-2.5 py-1 rounded-md">JPG / PNG</span>
        <span className="bg-[#12141A] border border-[#282B37] px-2.5 py-1 rounded-md">DOCX</span>
        <span className="bg-[#12141A] border border-[#282B37] px-2.5 py-1 rounded-md">XLSX</span>
        <span className="bg-[#12141A] border border-[#282B37] px-2.5 py-1 rounded-md">PPTX</span>
        <span className="text-slate-500 pl-1">· Max 25 MB</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTools = activeCategory === 'All'
    ? TOOLS
    : TOOLS.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="gradient-hero pt-16 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-950/60 border border-brand-800/60 text-brand-300 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5 text-brand-400" /> {TOOLS.length} PDF Tools · 100% Free & No Sign-up Required
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            All Your PDF Tools.<br />
            <span className="bg-gradient-to-r from-brand-400 via-purple-300 to-brand-500 bg-clip-text text-transparent">
              One Simple Workspace.
            </span>
          </h1>

          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Convert, merge, split, compress, and organise documents in seconds with ConvertX.
            No email. No watermarks. No subscriptions.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 justify-center mt-8">
            <Link
              to="/tools"
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-950/70 hover:shadow-brand-900/90 transition-all active:scale-[0.98]"
            >
              Explore PDF Tools <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#181A20] border border-[#282B37] text-slate-200 font-medium hover:text-white hover:border-brand-500/60 hover:bg-[#1F222B] transition-colors"
            >
              How It Works
            </a>
          </div>

          <HeroUploadPrompt />
        </div>
      </section>

      {/* ── Popular Tools ────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-[#0B0B0F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Popular PDF Tools</h2>
            <p className="text-slate-400 mt-2">The tools our users reach for most often</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            {POPULAR_TOOLS.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* ── All Tools ────────────────────────────────────────────── */}
      <section id="all-tools" className="py-20 px-4 bg-[#0E1015] border-y border-[#282B37]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">All {TOOLS.length} PDF Tools</h2>
              <p className="text-slate-400 mt-1">Grouped by category</p>
            </div>
            <Link to="/tools" className="flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              <LayoutGrid className="w-4 h-4" /> View all tools
            </Link>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            {['All', ...CATEGORIES.map((c) => c.id)].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4.5 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  activeCategory === cat
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-950/60'
                    : 'bg-[#181A20] text-slate-300 border-[#282B37] hover:border-brand-500/50 hover:text-white hover:bg-[#1F222B]'
                }`}
              >
                {cat === 'All' ? 'All Categories' : CATEGORIES.find((c) => c.id === cat)?.label || cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 bg-[#0B0B0F]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">How It Works</h2>
          <p className="text-slate-400 mb-14">Three simple steps, zero friction</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', Icon: Upload, title: 'Upload Your File', desc: 'Drag and drop or click to choose your PDF, image, or Office document.' },
              { step: '02', Icon: Zap, title: 'Process Instantly', desc: 'Our backend applies your chosen operation in seconds — no waiting, no queues.' },
              { step: '03', Icon: Download, title: 'Download the Result', desc: 'Get your processed file immediately. It is automatically deleted after 30 minutes.' },
            ].map(({ step, Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center gap-4 text-center p-6 rounded-2xl bg-[#181A20] border border-[#282B37] shadow-lg shadow-black/30">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-950/70">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#181A20] border-2 border-brand-500 text-xs font-bold text-brand-300 flex items-center justify-center shadow-sm">
                    {step.slice(-1)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{title}</h3>
                  <p className="text-slate-400 text-sm mt-1.5 leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ConvertX ─────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-brand-950 via-[#181A20] to-[#0B0B0F] border-y border-[#282B37] text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Why Choose ConvertX?</h2>
            <p className="text-slate-300 max-w-xl mx-auto">
              A no-nonsense PDF toolkit built for speed, privacy, and reliability.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { Icon: Shield, title: 'Private by Design', desc: 'Files are processed on isolated servers and wiped after 30 minutes. Zero retention.' },
              { Icon: Zap, title: 'Lightning Fast', desc: 'Pure Node.js processing means no round-trips to third-party clouds. Results in seconds.' },
              { Icon: Globe, title: 'Works Everywhere', desc: 'Fully responsive — use ConvertX on desktop, tablet, or phone without installing anything.' },
              { Icon: Check, title: '17 Tools, One Place', desc: 'Merge, split, compress, watermark, convert, protect — all in one clean workspace.' },
              { Icon: Upload, title: 'Real Processing', desc: 'Every tool performs genuine file manipulation. No fake buttons, no simulated downloads.' },
              { Icon: LayoutGrid, title: 'No Account Needed', desc: 'All core tools work anonymously. Sign up only if you want history and preferences.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-2xl bg-[#181A20]/90 backdrop-blur-sm border border-[#282B37] hover:border-brand-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-950/70 border border-brand-800/60 text-brand-300 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="text-slate-400 text-sm mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-[#0B0B0F]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3.5">
            {FAQS.map((faq) => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-[#0E1015] border-t border-[#282B37]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-slate-400 mb-8">Pick a tool and process your first document for free — no account needed.</p>
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-950/70 hover:shadow-brand-900/90 transition-all active:scale-[0.98]"
          >
            Browse All PDF Tools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
