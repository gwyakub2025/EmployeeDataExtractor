
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, CreditCard, Globe, ShieldX, UserX, Activity, ArrowUpRight, Zap, 
  Bike, ShieldCheck, MoreHorizontal, Download, Calendar, ShieldAlert, 
  BarChart4, Loader2, FileSpreadsheet, DownloadCloud
} from 'lucide-react';
import { DataRow, DashboardMetrics } from '../types';
import { extractDashboardMetrics } from '../utils/dataProcessor';

interface DashboardProps {
  rows: DataRow[];
  onDrillDown: (title: string, filteredRows: DataRow[]) => void;
}

const BRAND_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#f43f5e', '#3b82f6', '#ec4899', '#84cc16'];

export const Dashboard: React.FC<DashboardProps> = ({ rows, onDrillDown }) => {
  const [isExporting, setIsExporting] = useState(false);
  
  const metrics = useMemo(() => extractDashboardMetrics(rows), [rows]) as DashboardMetrics;

  // Helper to download specific subset immediately
  const directDownload = (filename: string, data: DataRow[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
  };

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
    
    // Helper to get rows for a specific month (Year, Month Index 0-11)
    const getMonthRows = (targetYear: number, targetMonth: number) => {
        return rows.filter(row => {
            const dateKey = Object.keys(row).find(k => k.includes('(Date)'));
            if (!dateKey) return false;
            const val = String(row[dateKey]).split(';')[0].trim();
            const parts = val.split('/');
            if (parts.length === 3) {
                 const d = parseInt(parts[0]);
                 const m = parseInt(parts[1]) - 1;
                 const y = parseInt(parts[2]);
                 return y === targetYear && m === targetMonth;
            }
            return false;
        });
    };

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = (metrics.monthlyRenewals[key] || 0) as number;
      const escapeCount = (metrics.monthlyEscapes[key] || 0) as number;
      
      const monthRows = getMonthRows(d.getFullYear(), d.getMonth());

      totalProjected += count;
      months.push({ 
          key, 
          month: monthNames[d.getMonth()], // Using d.getMonth() handles wrap around correctly (0-11)
          year: d.getFullYear(), 
          count, 
          escapeCount,
          rows: monthRows 
      });
    }
    
    // Calculate intensity for UI
    const maxMonthCount = Math.max(...months.map(m => m.count as number), 1);
    
    return months.map(m => ({
      ...m,
      intensity: ((m.count as number) / maxMonthCount) * 100
    }));
  }, [metrics, rows]);

  const handleFullExport = async () => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 500)); 

    const wb = XLSX.utils.book_new();

    // 1. Executive Summary Sheet
    const summaryData = [
      ["METRIC", "VALUE", "NOTES"],
      ["Total Personnel", metrics.total, "Full census count"],
      ["Active Credentials", metrics.activeCount, "Valid visas/labor cards"],
      ["Expired Credentials", metrics.expiredCardCount, "Requires immediate attention"],
      ["Escape Reports", metrics.escapeCount, "Absconding/Legal issues"],
      ["Upcoming Renewals", metrics.upcomingRenewals, "Due this month"],
      ["Motorcyclists", workforceSplit.motorcyclist.length, "Role-based count"],
      ["Support Staff", workforceSplit.staffSupport.length, "Role-based count"],
      [],
      ["NATIONALITY BREAKDOWN", "COUNT"],
      ...Object.entries(metrics.nationalityData),
      [],
      ["STATUS BREAKDOWN", "COUNT"],
      ...Object.entries(metrics.statusData)
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // 2. Registries
    if (metrics.escapeRecords.length) {
      const ws = XLSX.utils.json_to_sheet(metrics.escapeRecords);
      XLSX.utils.book_append_sheet(wb, ws, "Escape Registry");
    }

    if (metrics.expiredRecords.length) {
      const ws = XLSX.utils.json_to_sheet(metrics.expiredRecords);
      XLSX.utils.book_append_sheet(wb, ws, "Expired Cards");
    }

    if (metrics.upcomingRecords.length) {
      const ws = XLSX.utils.json_to_sheet(metrics.upcomingRecords);
      XLSX.utils.book_append_sheet(wb, ws, "Renewals Due");
    }

    if (workforceSplit.motorcyclist.length) {
       const ws = XLSX.utils.json_to_sheet(workforceSplit.motorcyclist);
       XLSX.utils.book_append_sheet(wb, ws, "Motorcyclists");
    }
    
    if (workforceSplit.staffSupport.length) {
       const ws = XLSX.utils.json_to_sheet(workforceSplit.staffSupport);
       XLSX.utils.book_append_sheet(wb, ws, "Support Staff");
    }

    XLSX.writeFile(wb, `EMPMAS_Intelligence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExporting(false);
  };

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
        
        <div className="flex flex-col md:flex-row gap-8 relative z-10 w-full xl:w-auto items-center">
          <div className="grid grid-cols-3 gap-6 w-full md:w-auto">
             <div className="flex flex-col items-center">
                <div className="text-emerald-400 font-black text-2xl">{metrics.total ? ((((metrics.total as number) - (metrics.expiredCardCount as number) - (metrics.escapeCount as number)) / (metrics.total as number)) * 100).toFixed(0) : 0}%</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Health</div>
             </div>
             <div className="flex flex-col items-center">
                <div className="text-rose-400 font-black text-2xl">{(metrics.expiredCardCount as number) + (metrics.escapeCount as number)}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Risks</div>
             </div>
             <div className="flex flex-col items-center">
                <div className="text-indigo-400 font-black text-2xl">{metrics.total}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Total</div>
             </div>
          </div>

          <button 
            onClick={handleFullExport}
            disabled={isExporting}
            className="bg-white text-slate-900 hover:bg-indigo-50 px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center gap-3 whitespace-nowrap min-w-[200px] justify-center"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
            Export Intelligence Report
          </button>
        </div>
      </div>

      {/* CORE OPERATIONAL KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        <ProKpi 
          icon={<UserX />} 
          label="Escape Reports" 
          value={metrics.escapeCount} 
          color="rose" 
          onClick={() => onDrillDown("Escape Registry", metrics.escapeRecords)} 
          onDownload={(e) => directDownload("Escape_Reports", metrics.escapeRecords, e)}
        />
        <ProKpi 
          icon={<ShieldX />} 
          label="Expired Credentials" 
          value={metrics.expiredCardCount} 
          color="amber" 
          onClick={() => onDrillDown("Expired Registry", metrics.expiredRecords)} 
          onDownload={(e) => directDownload("Expired_Credentials", metrics.expiredRecords, e)}
        />
        <ProKpi 
          icon={<Bike />} 
          label="Motorcyclists" 
          value={workforceSplit.motorcyclist.length} 
          color="indigo" 
          onClick={() => onDrillDown("Motorcyclists", workforceSplit.motorcyclist)} 
          onDownload={(e) => directDownload("Motorcyclists", workforceSplit.motorcyclist, e)}
        />
        <ProKpi 
          icon={<MoreHorizontal />} 
          label="Staff & Support" 
          value={workforceSplit.staffSupport.length} 
          color="slate" 
          onClick={() => onDrillDown("Support Staff", workforceSplit.staffSupport)} 
          onDownload={(e) => directDownload("Support_Staff", workforceSplit.staffSupport, e)}
        />
        <ProKpi 
          icon={<CreditCard />} 
          label="Active Personnel" 
          value={metrics.activeCount} 
          color="emerald" 
          onClick={() => onDrillDown("Active", rows.filter(r => !metrics.expiredRecords.includes(r)))} 
          onDownload={(e) => directDownload("Active_Personnel", rows.filter(r => !metrics.expiredRecords.includes(r)), e)}
        />
        <ProKpi 
          icon={<Activity />} 
          label="Upcoming Renewals" 
          value={metrics.upcomingRenewals} 
          color="indigo" 
          onClick={() => onDrillDown("Upcoming (Current Month)", metrics.upcomingRecords)} 
          onDownload={(e) => directDownload("Upcoming_Renewals", metrics.upcomingRecords, e)}
        />
      </div>

      {/* OPERATIONAL PIPELINE */}
      <div className="bg-slate-900 p-12 rounded-[70px] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16 relative z-10">
          <div>
            <h3 className="text-4xl font-black text-white tracking-tighter flex items-center gap-5">
              <Calendar className="text-indigo-400" size={44} /> 6-Month Expiry Forecast
            </h3>
            <p className="text-slate-500 font-medium mt-2 pl-[70px]">Projected workforce renewal load by month.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 relative z-10">
          {renewalForecast.map((item) => (
            <div 
              key={item.key} 
              className="group relative bg-white/5 hover:bg-white/10 rounded-[48px] p-6 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[360px]" 
              onClick={() => onDrillDown(`Forecast: ${item.month} ${item.year}`, item.rows)}
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-indigo-400 uppercase">{item.year}</span>
                    <span className="text-xl font-black text-white">{item.month}</span>
                  </div>
                  {/* Download Button on Card */}
                  <button 
                    onClick={(e) => directDownload(`Forecast_${item.month}_${item.year}`, item.rows, e)}
                    className="p-3 bg-white/5 hover:bg-indigo-500 hover:text-white rounded-xl text-slate-500 transition-all"
                    title="Download Report"
                  >
                    <DownloadCloud size={16} />
                  </button>
                </div>

                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Renewals Due</p>
                  <div className="text-5xl font-black text-white tracking-tighter">{item.count}</div>
                  
                  {item.escapeCount > 0 ? (
                    <div className="mt-4 inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                      <ShieldAlert size={12} className="text-rose-500" />
                      <span className="text-[10px] text-rose-400 font-bold uppercase">{item.escapeCount} Escapes</span>
                    </div>
                  ) : (
                    <div className="mt-4 h-8"></div> // Spacer
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                   <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      <span>Load</span>
                      <span>{Math.round(item.intensity)}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.intensity > 70 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${item.intensity}%` }} />
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ProKpiProps {
  icon: React.ReactElement<any>;
  label: string;
  value: number;
  color: 'rose' | 'amber' | 'emerald' | 'indigo' | 'slate';
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
}

const ProKpi: React.FC<ProKpiProps> = ({ icon, label, value, color, onClick, onDownload }) => {
  const themes = { 
    rose: 'bg-rose-50 text-rose-600 ring-rose-100', 
    amber: 'bg-amber-50 text-amber-600 ring-amber-100', 
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100', 
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100', 
    slate: 'bg-slate-100 text-slate-600 ring-slate-100' 
  };
  
  return (
    <div onClick={onClick} className="relative p-8 bg-white rounded-[48px] border border-slate-100 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between min-h-[260px] overflow-hidden">
      <div className="flex items-start justify-between">
         <div className={`p-5 rounded-3xl w-fit ring-1 ${themes[color]}`}>{React.cloneElement(icon, { size: 28 })}</div>
         <button 
           onClick={onDownload} 
           className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors"
           title="Download Report"
         >
           <DownloadCloud size={20} />
         </button>
      </div>
      <div className="relative z-10 mt-6">
        <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{label}</h4>
        <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{value}</div>
      </div>
      
      {/* Decorative bg element */}
      <div className={`absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-5 ${themes[color].split(' ')[0]} blur-3xl group-hover:opacity-10 transition-opacity`}></div>
    </div>
  );
};
