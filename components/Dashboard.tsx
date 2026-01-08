
import React, { useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  Globe, 
  ShieldX, 
  UserX, 
  Activity, 
  ArrowUpRight, 
  Zap, 
  Bike, 
  ShieldCheck, 
  MoreHorizontal, 
  Download, 
  Calendar, 
  ShieldAlert, 
  BarChart4
} from 'lucide-react';
import { DataRow, DashboardMetrics } from '../types';
import { extractDashboardMetrics } from '../utils/dataProcessor';

interface DashboardProps {
  rows: DataRow[];
  onDrillDown: (title: string, filteredRows: DataRow[]) => void;
}

const BRAND_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#f43f5e', '#3b82f6', '#ec4899', '#84cc16'];

export const Dashboard: React.FC<DashboardProps> = ({ rows, onDrillDown }) => {
  // Explicitly casting the result of extractDashboardMetrics to DashboardMetrics to ensure all properties are correctly typed.
  const metrics = useMemo(() => extractDashboardMetrics(rows), [rows]) as DashboardMetrics;

  const workforceSplit = useMemo(() => {
    const jobKey = Object.keys(rows[0] || {}).find(k => 
      k.toLowerCase().includes('job') || k.toLowerCase().includes('description') || k.toLowerCase().includes('designation')
    );
    const motorcyclistRows: DataRow[] = [];
    const staffSupportRows: DataRow[] = [];
    rows.forEach(row => {
      const job = String(row[jobKey || ''] || '').toLowerCase();
      if (job.includes('motorcycle') || job.includes('bike') || job.includes('motorcyclist')) motorcyclistRows.push(row);
      else staffSupportRows.push(row);
    });
    return { motorcyclist: motorcyclistRows, staffSupport: staffSupportRows };
  }, [rows]);

  const renewalForecast = useMemo(() => {
    const today = new Date();
    const months = [];
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];
    let totalProjected = 0;
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = (metrics.monthlyRenewals[key] || 0) as number;
      const escapeCount = (metrics.monthlyEscapes[key] || 0) as number;
      totalProjected += count;
      months.push({ key, month: monthNames[i % 6], year: d.getFullYear(), count, escapeCount });
    }
    const maxMonthCount = Math.max(...months.map(m => m.count as number), 1);
    return months.map(m => ({
      ...m,
      intensity: ((m.count as number) / maxMonthCount) * 100,
      status: (m.count as number) > (totalProjected / 6) * 1.5 ? 'CRITICAL' : (m.count as number) > 0 ? 'ACTIVE' : 'STABLE'
    }));
  }, [metrics]);

  const statusGraphData = useMemo(() => {
    // Explicitly casting entries to [string, number][] to avoid 'unknown' type issues in arithmetic.
    const entries = (Object.entries(metrics.statusData) as [string, number][]).sort((a, b) => (b[1] as number) - (a[1] as number));
    const maxVal = Math.max(...entries.map(e => e[1] as number), 1);
    return entries.map(([status, count], index) => ({
      status, count, percent: (((count as number) / (metrics.total || 1)) * 100).toFixed(1),
      color: BRAND_COLORS[index % BRAND_COLORS.length],
      height: ((count as number) / maxVal) * 100,
    })).slice(0, 10);
  }, [metrics]);

  return (
    <div className="space-y-16 animate-in fade-in duration-1000 pb-24 w-full">
      {/* EXECUTIVE COMMAND HEADER */}
      <div className="bg-slate-900 rounded-[60px] p-12 shadow-2xl relative overflow-hidden flex flex-col xl:flex-row items-center justify-between gap-12 border border-white/5">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 blur-[150px] -mr-96 -mt-96 rounded-full pointer-events-none"></div>
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-4 text-indigo-400 font-black text-[10px] uppercase tracking-[0.5em]">
            <Zap size={18} /> Command Intelligence Hub
          </div>
          <h2 className="text-6xl font-black text-white tracking-tighter leading-tight">Master Sync</h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl">Auditing {metrics.total} professional entities across the master drive.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 w-full xl:w-auto">
          {/* Casting values to number to fix arithmetic operation errors. */}
          <VitalityBox label="Health Index" value={`${metrics.total ? ((((metrics.total as number) - (metrics.expiredCardCount as number) - (metrics.escapeCount as number)) / (metrics.total as number)) * 100).toFixed(1) : 0}%`} icon={<ShieldCheck className="text-emerald-400" />} />
          <VitalityBox label="Risk Density" value={(metrics.expiredCardCount as number) + (metrics.escapeCount as number)} icon={<ShieldAlert className="text-rose-400" />} />
          <VitalityBox label="Total Census" value={metrics.total} icon={<Users className="text-indigo-400" />} />
        </div>
      </div>

      {/* CORE OPERATIONAL KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        <ProKpi icon={<UserX />} label="Escape Reports" value={metrics.escapeCount} color="rose" onClick={() => onDrillDown("Escape Registry", metrics.escapeRecords)} />
        <ProKpi icon={<ShieldX />} label="Expired Credentials" value={metrics.expiredCardCount} color="amber" onClick={() => onDrillDown("Expired Registry", metrics.expiredRecords)} />
        <ProKpi icon={<Bike />} label="Motorcyclists" value={workforceSplit.motorcyclist.length} color="indigo" onClick={() => onDrillDown("Motorcyclists", workforceSplit.motorcyclist)} />
        <ProKpi icon={<MoreHorizontal />} label="Staff & Support" value={workforceSplit.staffSupport.length} color="slate" onClick={() => onDrillDown("Support Staff", workforceSplit.staffSupport)} />
        <ProKpi icon={<CreditCard />} label="Active Personnel" value={metrics.activeCount} color="emerald" onClick={() => onDrillDown("Active", rows.filter(r => !metrics.expiredRecords.includes(r)))} />
        <ProKpi icon={<Activity />} label="Upcoming Renewals" value={metrics.upcomingRenewals} color="indigo" onClick={() => onDrillDown("Upcoming (Current Month)", metrics.upcomingRecords)} />
      </div>

      {/* OPERATIONAL PIPELINE */}
      <div className="bg-slate-900 p-12 rounded-[70px] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16 relative z-10">
          <div>
            <h3 className="text-4xl font-black text-white tracking-tighter flex items-center gap-5">
              <Calendar className="text-indigo-400" size={44} /> Operational Expiry Pipeline
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 relative z-10">
          {renewalForecast.map((item) => (
            <div key={item.key} className="group relative bg-white/5 hover:bg-white/10 rounded-[48px] p-8 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[400px]" onClick={() => onDrillDown(`Forecast: ${item.month}`, rows)}>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex flex-col items-center justify-center mb-8">
                  <span className="text-[10px] font-black text-indigo-400 uppercase">{item.year}</span>
                  <span className="text-2xl font-black text-white">{item.month}</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Expected Batch</p>
                  <div className="text-6xl font-black text-white tracking-tighter">{item.count}</div>
                </div>
                {item.escapeCount > 0 && (
                  <div className="mt-4 bg-orange-600/20 border border-orange-500/30 px-5 py-3 rounded-2xl animate-pulse">
                    <p className="text-[9px] text-orange-400 font-black uppercase tracking-widest">Escape Reports</p>
                    <div className="text-2xl font-black text-orange-500">{item.escapeCount}</div>
                  </div>
                )}
              </div>
              <div className="relative z-10">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${item.intensity}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const VitalityBox = ({ label, value, icon }: any) => (
  <div className="p-8 bg-white/5 rounded-[40px] border border-white/10">
    <div className="flex items-center gap-4 mb-3">
      <div className="p-2 bg-white/5 rounded-xl">{icon}</div>
      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-4xl font-black text-white tracking-tighter">{value}</div>
  </div>
);

const ProKpi = ({ icon, label, value, color, onClick }: any) => {
  const themes: any = { rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', indigo: 'bg-indigo-50 text-indigo-600', slate: 'bg-slate-100 text-slate-600' };
  return (
    <div onClick={onClick} className="p-10 bg-white rounded-[56px] border border-slate-200 shadow-xl hover:-translate-y-2 transition-all cursor-pointer group flex flex-col justify-between min-h-[280px]">
      <div className={`p-6 rounded-3xl w-fit ${themes[color]}`}>{React.cloneElement(icon, { size: 32 })}</div>
      <div>
        <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{label}</h4>
        <div className="text-5xl font-black text-slate-900 tracking-tighter">{value}</div>
      </div>
    </div>
  );
};
