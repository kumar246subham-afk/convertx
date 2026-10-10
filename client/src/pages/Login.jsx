import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, AlertCircle, ArrowRight, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { authLogin } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorNotice('');

    try {
      const res = await authLogin({ email, password });
      if (res.data?.data?.token) {
        localStorage.setItem('convertx_token', res.data.data.token);
        localStorage.setItem('convertx_user', JSON.stringify(res.data.data.user));
        toast.success(`Welcome back, ${res.data.data.user.name}!`);
        navigate('/tools');
      }
    } catch (err) {
      const msg = err.message || 'Login failed.';
      setErrorNotice(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-md mx-auto bg-[#0B0B0F]">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-brand-950/70 border border-brand-800/60 text-brand-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-brand-950/60">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Sign in to ConvertX</h1>
        <p className="text-sm text-slate-400 mt-2">
          Access your saved conversion history and preferences
        </p>
      </div>

      {/* Anonymous notice */}
      <div className="mb-6 p-4 rounded-xl bg-brand-950/40 border border-brand-800/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Account is optional:</strong> All 17+ PDF tools can be used completely anonymously without registering or logging in.
        </div>
      </div>

      {errorNotice && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/50 border border-amber-800/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200 leading-relaxed">{errorNotice}</p>
        </div>
      )}

      <div className="bg-[#181A20] rounded-2xl border border-[#282B37] p-8 shadow-xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2 tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#282B37] bg-[#12141A] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2 tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#282B37] bg-[#12141A] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all shadow-lg shadow-brand-950/60 active:scale-[0.99] ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#282B37] text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-300 transition-colors">
          Continue anonymously to PDF tools <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
