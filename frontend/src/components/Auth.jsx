import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { Lock, Mail, ArrowRight, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const { login, error: authError } = useAuth();
  const { showToast } = useStorage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Winking eye emoji animation timer
  const [winkEmoji, setWinkEmoji] = useState('😉');
  useEffect(() => {
    const winker = setInterval(() => {
      // Toggle to open eyes briefly, then back to wink
      setWinkEmoji('🙂');
      setTimeout(() => {
        setWinkEmoji('😉');
      }, 150);
    }, 3000);
    return () => clearInterval(winker);
  }, []);

  const handleCredentialsSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setLocalError('Please fill in both fields.');
      return;
    }
    setLocalError('');
    setLoading(true);

    try {
      const res = await login({ identifier, password });
      if (res?.success) {
        showToast('Login successful! Welcome to Nisanth Besties! 💖', 'success');
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please check your credentials.');
      showToast(err.message || 'Incorrect credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950 font-sans selection:bg-pink-500 selection:text-white">
      {/* Premium ambient winking-glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glassmorphic Lockscreen Card */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden text-slate-100 backdrop-blur-xl bg-slate-900/60">
          <div className="absolute top-0 right-0 p-3 bg-pink-500/20 text-pink-300 text-[10px] uppercase font-bold rounded-bl-2xl flex items-center gap-1 border-b border-l border-white/5">
            <Sparkles className="w-3 h-3 text-pink-400" /> Besties Vault
          </div>

          {/* Heading with animated winking eye */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-slate-950/40 text-pink-400 rounded-full mb-4 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)] relative group select-none cursor-pointer">
              <motion.span 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-3xl font-mono tracking-tighter"
              >
                {winkEmoji}
              </motion.span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Nisanth Besties {winkEmoji}
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-wider">
              Friendship Memory Journal
            </p>
          </div>

          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            {/* Email or Mobile Field */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address or Mobile Number</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Enter email or 10-digit number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full py-3.5 pl-11 pr-4 bg-slate-950/40 border border-white/5 rounded-xl text-slate-100 placeholder-slate-600 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3.5 pl-11 pr-10 bg-slate-950/40 border border-white/5 rounded-xl text-slate-100 placeholder-slate-600 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-inner"
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

            {/* Error Notification */}
            {displayError && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-600 font-bold tracking-wide uppercase">
            🛡️ Authorized secure platform. No Signup available.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

