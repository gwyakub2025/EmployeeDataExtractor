
import React, { useState, useEffect } from 'react';
import { fetchSystemUsers, createSystemUser, deleteSystemUser, SystemUser } from '../services/firebase';
import { UserPlus, Trash2, Shield, User, Loader2, Key } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    try {
      const list = await fetchSystemUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;
    
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      await createSystemUser(newUserEmail, newUserPassword);
      setNewUserEmail('');
      setNewUserPassword('');
      setSuccess('User created successfully.');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Are you sure you want to remove this user? This cannot be undone.')) return;
    try {
      await deleteSystemUser(uid);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-[60px] p-16 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-900/20">
              <UserPlus size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter">User Directory</h3>
              <p className="text-slate-500 text-sm font-medium">Manage access credentials for system operators.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create User Form */}
        <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 h-fit">
          <h4 className="text-xl font-black text-white tracking-tight mb-6 flex items-center gap-2">
            <Shield size={20} className="text-indigo-400" /> Grant Access
          </h4>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 mb-1 block">User Email</label>
              <input 
                type="email" 
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 mb-1 block">Password</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 pl-10 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="Password"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              </div>
            </div>

            {error && <div className="text-rose-500 text-xs font-bold p-3 bg-rose-500/10 rounded-xl">{error}</div>}
            {success && <div className="text-emerald-500 text-xs font-bold p-3 bg-emerald-500/10 rounded-xl">{success}</div>}

            <button 
              type="submit" 
              disabled={creating}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : "Create User"}
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
            users.map(u => (
              <div key={u.uid} className="bg-slate-900 border border-white/5 p-6 rounded-[24px] flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                    {u.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{u.email}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{u.role}</div>
                  </div>
                </div>
                {u.role !== 'admin' && (
                  <button 
                    onClick={() => handleDelete(u.uid)}
                    className="p-3 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-xl transition-all"
                    title="Remove User"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                {u.role === 'admin' && (
                  <span className="text-[10px] font-bold text-indigo-500/50 uppercase tracking-wider px-3">Protected</span>
                )}
              </div>
            ))
          )}
          {!loading && users.length === 0 && (
             <div className="text-center text-slate-500 font-bold py-12">No users found.</div>
          )}
        </div>

      </div>
    </div>
  );
};
