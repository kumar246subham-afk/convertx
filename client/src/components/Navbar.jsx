import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FileText, ChevronDown, Menu, X, Zap } from 'lucide-react';
import { TOOLS, CATEGORIES } from '../config/tools';

const CATEGORY_ORDER = ['Organization', 'Optimization', 'Editing', 'Security', 'Conversion'];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const toolsByCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = TOOLS.filter((t) => t.category === cat);
    return acc;
  }, {});

  return (
    <header
      className={`sticky top-0 z-50 glass-nav border-b transition-all duration-200 ${
        scrolled ? 'shadow-lg shadow-black/40 border-[#282B37]' : 'border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-950/60 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
              ConvertX
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-brand-950/60 border border-brand-800/50'
                    : 'text-slate-300 hover:text-white hover:bg-[#181A20]'
                }`
              }
            >
              Home
            </NavLink>

            {/* Tools dropdown */}
            <div className="relative" onMouseLeave={() => setToolsOpen(false)}>
              <button
                onMouseEnter={() => setToolsOpen(true)}
                onClick={() => setToolsOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  toolsOpen ? 'text-white bg-[#181A20]' : 'text-slate-300 hover:text-white hover:bg-[#181A20]'
                }`}
              >
                All PDF Tools <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${toolsOpen ? 'rotate-180 text-brand-400' : 'text-slate-400'}`} />
              </button>

              {toolsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[740px] bg-[#181A20] rounded-2xl shadow-2xl shadow-black/80 border border-[#282B37] p-6 grid grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-150">
                  {CATEGORY_ORDER.map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2.5">
                        {cat}
                      </p>
                      <ul className="space-y-1">
                        {toolsByCategory[cat].map((tool) => (
                          <li key={tool.id}>
                            <Link
                              to={`/tools/${tool.id}`}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#1F222B] transition-colors group"
                            >
                              <tool.Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                              <span className="truncate">{tool.shortName}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="col-span-3 pt-4 border-t border-[#282B37]">
                    <Link
                      to="/tools"
                      className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      View all {TOOLS.length} tools →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-brand-950/60 border border-brand-800/50'
                    : 'text-slate-300 hover:text-white hover:bg-[#181A20]'
                }`
              }
            >
              About
            </NavLink>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/tools"
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-md shadow-brand-950/60 hover:shadow-brand-900/80 active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-white/20" /> Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#181A20] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#282B37] bg-[#181A20] px-4 py-4 space-y-1.5 max-h-[80vh] overflow-y-auto">
          <MobileLink to="/">Home</MobileLink>
          <MobileLink to="/tools">All PDF Tools</MobileLink>
          <MobileLink to="/about">About</MobileLink>
          <MobileLink to="/login">Sign In</MobileLink>
          <div className="pt-3 border-t border-[#282B37]">
            <Link
              to="/tools"
              className="block w-full text-center px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-950/60 text-white border border-brand-800/50'
            : 'text-slate-300 hover:text-white hover:bg-[#1F222B]'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
