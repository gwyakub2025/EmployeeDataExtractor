
import React, { useState } from 'react';
import { login } from '../services/firebase';
import { ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  // Pre-filled credentials as requested
  const [email, setEmail] = useState('admin@empmas.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError("Invalid credentials. Please use admin@empmas.com / admin123");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[80px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800 p-4 rounded-2xl border border-white/5 shadow-xl">
              <ShieldCheck className="text-indigo-500" size={40} />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-white text-center tracking-tighter mb-2">Secure Access</h2>
          <p className="text-slate-500 text-center text-xs font-black uppercase tracking-widest mb-10">DataHarmonizer Pro</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2">Email Identity</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="admin@empmas.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="admin123"
                  required
                />
              </div>
            </div>

            {error && <div className="text-rose-500 text-xs font-bold text-center bg-rose-500/10 py-3 rounded-lg">{error}</div>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Authenticate"}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-600 font-bold mb-2">DEFAULT ADMIN CREDENTIALS</p>
            <p className="text-[10px] text-indigo-400 font-mono">admin@empmas.com • admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};
