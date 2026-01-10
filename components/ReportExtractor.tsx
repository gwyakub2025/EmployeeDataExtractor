
import React, { useState } from 'react';
import { Search, Sparkles, Download, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { DataRow } from '../types';
import { translateQueryToFilter } from '../services/gemini';
import * as XLSX from 'xlsx';

interface ReportExtractorProps {
  rows: DataRow[];
  headers: string[];
}

export const ReportExtractor: React.FC<ReportExtractorProps> = ({ rows, headers }) => {
  const [query, setQuery] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<DataRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!query.trim()) return;
    setIsExtracting(true);
    setError(null);
    try {
      const { logic } = await translateQueryToFilter(query, headers);
      // eslint-disable-next-line no-new-func
      const filterFn = new Function('row', `try { return ${logic}; } catch(e) { return false; }`);
      const filtered = rows.filter(row => filterFn(row));
      setResults(filtered);
    } catch (err) {
      setError("AI Translation failed. Please try a simpler query.");
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadReport = () => {
    if (!results) return;
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI_Extracted_Report");
    XLSX.writeFile(wb, `Custom_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 rounded-[60px] p-16 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-900/20">
              <Sparkles size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter">Query Intelligence Hub</h3>
              <p className="text-slate-500 text-sm font-medium">Extract custom reports using natural language instructions.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="e.g. Show me all staff from India with expired cards..." 
                className="w-full bg-slate-950 border border-white/5 rounded-3xl pl-16 pr-6 py-6 text-lg font-medium text-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all shadow-inner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
            </div>
            <button 
              onClick={handleExtract}
              disabled={isExtracting || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-10 py-6 rounded-3xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 shadow-2xl active:scale-95"
            >
              {isExtracting ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Extract Report
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Suggestions:</span>
             {["Expired in Dubai", "Nationality: Pakistan", "Escape Reports Only"].map(s => (
               <button key={s} onClick={() => setQuery(s)} className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-1.5 rounded-full border border-white/5 transition-all lowercase">
                 {s}
               </button>
             ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl flex items-center gap-4 text-rose-500 animate-in zoom-in-95">
          <AlertCircle size={24} />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {results !== null && (
        <div className="bg-white rounded-[50px] border border-slate-200 shadow-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-8">
           <div className="p-12 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
             <div className="flex items-center gap-6">
                <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600">
                  <FileText size={24} />
                </div>
                <div>
                   <h4 className="text-2xl font-black text-slate-900 tracking-tight">Extraction Result</h4>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{results.length} Records Isolated</p>
                </div>
             </div>
             <button 
               onClick={downloadReport}
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-3"
             >
               <Download size={18} /> Download Excel
             </button>
           </div>
           <div className="p-8 max-h-[500px] overflow-auto custom-scrollbar">
             <table className="w-full text-xs text-left border-collapse">
               <thead>
                 <tr className="border-b border-slate-100">
                   {headers.slice(0, 6).map(h => <th key={h} className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest">{h}</th>)}
                 </tr>
               </thead>
               <tbody>
                 {results.slice(0, 50).map((r, i) => (
                   <tr key={i} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                     {headers.slice(0, 6).map(h => <td key={h} className="px-6 py-4 text-slate-600 font-medium">{String(r[h] || '')}</td>)}
                   </tr>
                 ))}
               </tbody>
             </table>
             {results.length > 50 && (
               <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">
                 Previewing 50 of {results.length} records. Download full report to see all.
               </div>
             )}
             {results.length === 0 && (
               <div className="p-20 text-center text-slate-300 font-black uppercase tracking-[0.5em]">No matching records found.</div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};
