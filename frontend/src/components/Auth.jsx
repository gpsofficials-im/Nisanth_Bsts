import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { Lock, Mail, ArrowRight, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const { login, error } = useAuth();
  const { showToast } = useStorage();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res?.success) {
        showToast('Login successful! Welcome back. ✨', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Incorrect email or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950 font-sans">
      {/* Decorative premium floating glowing ambient spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Core Lockscreen Glassmorphism panel */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden text-slate-100 backdrop-blur-xl bg-slate-900/60">
          <div className="absolute top-0 right-0 p-3 bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold rounded-bl-2xl flex items-center gap-1 border-b border-l border-white/5">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Secure Vault
          </div>

          <div className="text-center mb-8">
            {/* Animated blinking smiley logo with neon glow */}
            <div className="inline-flex items-center justify-center p-4 bg-slate-950/40 text-cyan-400 rounded-full mb-4 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] relative group select-none cursor-pointer">
              <span className="text-3xl font-mono tracking-tighter smiley-logo animate-bounce-slow">
                😉
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">
              Nisanth Wallet
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-wider">
              Private Memory Platform
            </p>
          </div>

          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gmail Address</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3.5 pl-11 pr-4 bg-slate-950/40 border border-white/5 rounded-xl text-slate-100 placeholder-slate-600 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3.5 pl-11 pr-10 bg-slate-950/40 border border-white/5 rounded-xl text-slate-100 placeholder-slate-600 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 active:scale-98 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Submit Credentials</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-600 font-bold tracking-wide uppercase">
            🛡️ Authorized secure platform. No Signup available.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
