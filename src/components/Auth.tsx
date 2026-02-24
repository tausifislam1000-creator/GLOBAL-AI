import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Sparkles, Globe, Zap } from 'lucide-react';

interface AuthProps {
  onLogin: (email: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [error, setError] = useState('');

  const handlePuterSignIn = async () => {
    try {
      setError('');
      const puter = (window as any).puter;
      if (!puter) {
        throw new Error('Puter.js is not loaded.');
      }
      const res = await puter.auth.signIn();
      if (res && res.username) {
        localStorage.setItem('global_ai_current_user', res.username);
        onLogin(res.username);
      } else {
        setError('Authentication failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Left Pane - Branding */}
      <div className="relative hidden md:flex flex-col justify-between w-1/2 p-12 lg:p-24 border-r border-white/10 bg-black/50 overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"
        />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-16"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-xl font-bold text-white tracking-tighter">GAI</span>
            </div>
            <span className="text-xl font-bold tracking-widest uppercase">Global AI</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[1.1] mb-6"
          >
            Intelligence <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-400 bg-[length:200%_auto] animate-gradient">
              Amplified.
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg text-zinc-400 max-w-md"
          >
            Experience the next generation of conversational AI. Powered by advanced models and seamless cloud sync.
          </motion.p>
        </div>

        <div className="relative z-10 flex gap-6 text-zinc-500 text-sm font-medium">
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Claude 4.5</div>
          <div className="flex items-center gap-2"><Globe className="w-4 h-4"/> Web Search</div>
          <div className="flex items-center gap-2"><Zap className="w-4 h-4"/> Real-time Sync</div>
        </div>
      </div>

      {/* Right Pane - Login */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 relative min-h-screen md:min-h-0">
        {/* Mobile Animated Background */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="md:hidden absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"
        />

        {/* Mobile Branding (Hidden on Desktop) */}
        <div className="md:hidden text-center mb-12 relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30"
          >
            <span className="text-3xl font-bold text-white tracking-tighter">GAI</span>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">GLOBAL AI</h1>
          <p className="text-zinc-400 text-sm">Powered by TAUSIF ISLAM</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm bg-zinc-900/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 shadow-2xl relative z-10"
        >
          <div className="text-center mb-8 hidden md:block">
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-zinc-400 text-sm">Sign in to continue to Global AI</p>
          </div>

          <div className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePuterSignIn}
              className="w-full bg-white text-black font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Puter
            </motion.button>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
