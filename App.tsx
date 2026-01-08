
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import LZString from 'lz-string';
import { 
  FileUp, 
  Table, 
  LayoutGrid, 
  Sparkles, 
  Download, 
  RefreshCw,
  Search,
  Database,
  PieChart,
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  Share2,
  ShieldCheck,
  Eye,
  Settings,
  Link,
  Layers,
  HardDrive,
  FileText,
  Monitor,
  CalendarDays,
  Filter,
  FileSearch
} from 'lucide-react';
import { DataRow, ProcessedData, CompanyDataset } from './types';
import { harmonizeData, extractDashboardMetrics } from './utils/dataProcessor';
import { DataTable } from './components/DataTable';
import { PivotView } from './components/PivotView';
import { Dashboard } from './components/Dashboard';
import { ReportExtractor } from './components/ReportExtractor';
import { generateDataSummary } from './services/gemini';

const STORAGE_KEY = 'harmonizer_pro_v7_drive';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(true);
  const [shareStatus, setShareStatus] = useState<'idle' | 'generating' | 'copied' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preview' | 'pivot' | 'extract' | 'ai'>('dashboard');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('master'); 
  
  // Persistence state - check URL hash for shared data first
  const [companyDatasets, setCompanyDatasets] = useState<CompanyDataset[]>(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('data=')) {
      try {
        const match = hash.match(/data=([^&]*)/);
        if (match && match[1]) {
          const decompressed = LZString.decompressFromEncodedURIComponent(match[1]);
          if (decompressed) {
            const data = JSON.parse(decompressed);
            if (Array.isArray(data)) return data; 
          }
        }
      } catch (e) { console.error("Shared Link Corrupted"); }
    }
    // No saved data is loaded on first visit as per requirement "It should load the blank values"
    // However, for typical usage, we'd check localStorage. Here we'll default to [] if not shared.
    return [];
  });

  useEffect(() => {
    if (window.location.hash.includes('data=')) setIsAdmin(false);
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<ProcessedData | null>(null);
  const [newSheetName, setNewSheetName] = useState('');
  const [drillDownData, setDrillDownData] = useState<{ title: string; rows: DataRow[] } | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Add missing handleDrillDown function for dashboard interaction
  const handleDrillDown = (title: string, rows: DataRow[]) => {
    setDrillDownData({ title, rows });
    setDateRange({ start: '', end: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0]; 
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as DataRow[];
        const harmonized = harmonizeData(data);
        setPendingUpload(harmonized);
        setNewSheetName(file.name.split('.')[0]); 
      } catch (err) { alert("File Error"); } finally {
        setIsProcessing(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmUpload = () => {
    const newEntry: CompanyDataset = { id: crypto.randomUUID(), name: newSheetName.trim() || 'Imported_Sheet', data: pendingUpload! };
    setCompanyDatasets(prev => [...prev, newEntry]);
    setSelectedSheetId(newEntry.id);
    setPendingUpload(null);
    setActiveTab('dashboard');
  };

  const generateShareLink = useCallback(() => {
    if (companyDatasets.length === 0) return;
    setShareStatus('generating');
    const payload = companyDatasets.map(ds => ({ id: ds.id, name: ds.name, data: { headers: ds.data.headers, rows: ds.data.rows } }));
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}#data=${compressed}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    });
  }, [companyDatasets]);

  const displayedRows = useMemo(() => {
    if (selectedSheetId === 'master') return companyDatasets.flatMap(d => d.data.rows);
    return companyDatasets.find(d => d.id === selectedSheetId)?.data.rows || [];
  }, [companyDatasets, selectedSheetId]);

  const activeHeaders = useMemo(() => {
    if (selectedSheetId === 'master') {
      const allHeaders = new Set<string>();
      companyDatasets.forEach(d => d.data.headers.forEach(h => allHeaders.add(h)));
      return Array.from(allHeaders);
    }
    return companyDatasets.find(d => d.id === selectedSheetId)?.data.headers || [];
  }, [companyDatasets, selectedSheetId]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return displayedRows;
    const s = searchTerm.toLowerCase();
    return displayedRows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(s)));
  }, [displayedRows, searchTerm]);

  const drillDownFiltered = useMemo(() => {
    if (!drillDownData) return [];
    if (!dateRange.start && !dateRange.end) return drillDownData.rows;
    return drillDownData.rows.filter(row => {
      const dateKey = Object.keys(row).find(k => k.includes('(Date)'));
      if (!dateKey) return true;
      const dateStr = String(row[dateKey]).split(';')[0].trim();
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const rowDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (dateRange.start && rowDate < new Date(dateRange.start)) return false;
        if (dateRange.end && rowDate > new Date(dateRange.end)) return false;
      }
      return true;
    });
  }, [drillDownData, dateRange]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#020617] text-slate-300 overflow-hidden h-screen">
      <div className={`px-8 py-2.5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.4em] z-[100] border-b border-white/5 ${isAdmin ? 'bg-indigo-600/10 text-indigo-400' : 'bg-emerald-600/10 text-emerald-400'}`}>
        <div className="flex items-center gap-3">{isAdmin ? <Settings size={14} /> : <Eye size={14} />} {isAdmin ? 'Admin Portal' : 'Viewer Portal'}</div>
      </div>

      <header className="bg-slate-950 border-b border-white/5 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-2.5 rounded-2xl text-white shadow-2xl"><Database size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter leading-none">DataHarmonizer <span className="text-indigo-500">Pro</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input type="text" placeholder="Query Drive..." className="bg-slate-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-80 text-white font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-slate-950/50 border-r border-white/5 p-6 flex flex-col space-y-8 hidden md:flex shrink-0">
          {isAdmin && (
            <div className="space-y-4">
              <label className="flex items-center gap-4 p-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl cursor-pointer transition-all shadow-xl shadow-indigo-900/20 group">
                <FileUp size={20} className="text-white" /><span className="text-sm font-black text-white uppercase tracking-widest">Link Source</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.csv" />
              </label>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] px-2 mb-3">Inventory</div>
            <button onClick={() => setSelectedSheetId('master')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all border ${selectedSheetId === 'master' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5'}`}>
              <Layers size={18} /><span className="uppercase tracking-widest">Master Drive</span>
            </button>
            <div className="space-y-1 pl-2 max-h-[150px] overflow-y-auto custom-scrollbar">
              {companyDatasets.map(ds => (
                <button key={ds.id} onClick={() => setSelectedSheetId(ds.id)} className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-bold transition-all ${selectedSheetId === ds.id ? 'bg-white/5 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
                  <div className="flex items-center gap-3 truncate"><FileText size={14} /><span className="truncate">{ds.name}</span></div>
                </button>
              ))}
            </div>
          </div>

          <nav className="space-y-2 flex-1 pt-4 border-t border-white/5">
            {[
              { id: 'dashboard', label: 'Analysis Hub', icon: PieChart },
              { id: 'extract', label: 'Query Hub', icon: FileSearch },
              { id: 'pivot', label: 'Pivot Table', icon: LayoutGrid },
              { id: 'preview', label: 'Drive Grid', icon: Table },
              { id: 'ai', label: 'AI Narrative', icon: Sparkles },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === item.id ? 'bg-white/5 text-indigo-400 border border-white/5' : 'text-slate-500 hover:text-slate-200'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/5">
            <button onClick={generateShareLink} disabled={shareStatus === 'generating' || companyDatasets.length === 0} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-2xl ${shareStatus === 'copied' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-indigo-400 border-indigo-500/20'}`}>
              <Share2 size={14} />{shareStatus === 'copied' ? 'Link Copied' : 'Share App link'}
            </button>
          </div>
        </aside>

        <section className="flex-1 overflow-auto bg-[#020617] p-12 custom-scrollbar relative">
          {isProcessing ? (
             <div className="h-full flex flex-col items-center justify-center space-y-8"><RefreshCw className="animate-spin text-indigo-500" size={80} /></div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
              {activeTab === 'dashboard' && <Dashboard rows={displayedRows} onDrillDown={handleDrillDown} />}
              {activeTab === 'extract' && <ReportExtractor rows={displayedRows} headers={activeHeaders} />}
              {activeTab === 'pivot' && <PivotView rows={displayedRows} headers={activeHeaders} />}
              {activeTab === 'preview' && <DataTable headers={activeHeaders} rows={filteredRows} highlightTerm={searchTerm} />}
              {activeTab === 'ai' && (
                <div className="bg-slate-900 rounded-[60px] border border-white/5 p-20 relative overflow-hidden shadow-2xl">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-16 relative z-10">
                    <h3 className="text-4xl font-black text-white tracking-tighter">Narrative Synthesis</h3>
                    <button onClick={async () => { setIsGeneratingAi(true); const s = await generateDataSummary(displayedRows); setAiSummary(s); setIsGeneratingAi(false); }} disabled={isGeneratingAi} className="bg-indigo-600 text-white px-12 py-6 rounded-[32px] font-black text-xl transition-all shadow-2xl">
                      {isGeneratingAi ? <RefreshCw className="animate-spin" /> : <Sparkles />} {aiSummary ? 'Regenerate' : 'Initiate'}
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none text-xl leading-relaxed text-slate-400 relative z-10 whitespace-pre-wrap italic">
                    {aiSummary || "Awaiting intelligence trigger..."}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Upload Confirmation Modal */}
      {pendingUpload && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-md rounded-[50px] border border-white/10 p-12 space-y-10">
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-black text-white tracking-tighter">Link Source File</h3>
            </div>
            <input autoFocus type="text" className="w-full p-6 bg-slate-950 border border-white/5 rounded-2xl text-xl font-bold text-white outline-none" value={newSheetName} onChange={(e) => setNewSheetName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmUpload()} />
            <div className="flex gap-4">
              <button onClick={() => setPendingUpload(null)} className="flex-1 py-5 text-slate-500 font-black uppercase text-[11px]">Discard</button>
              <button onClick={confirmUpload} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[11px]">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {drillDownData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-7xl h-[90vh] rounded-[70px] border border-white/10 flex flex-col overflow-hidden">
            <div className="p-12 border-b border-white/5 flex flex-col space-y-8 bg-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black text-white tracking-tighter">{drillDownData.title}</h3>
                <button onClick={() => setDrillDownData(null)} className="p-5 hover:bg-white/5 rounded-full text-slate-500"><X size={44} /></button>
              </div>
              <div className="flex flex-wrap items-center gap-8 bg-slate-950/50 p-6 rounded-[32px]">
                <div className="flex items-center gap-4"><CalendarDays className="text-indigo-400" size={14} /><input type="date" className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} /></div>
                <div className="flex items-center gap-4"><CalendarDays className="text-indigo-400" size={14} /><input type="date" className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-12 bg-slate-950"><DataTable headers={activeHeaders} rows={drillDownFiltered} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
