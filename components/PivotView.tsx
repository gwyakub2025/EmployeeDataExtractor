
import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { DataRow, PivotConfig } from '../types';
import { generatePivotData } from '../utils/dataProcessor';

interface PivotViewProps {
  rows: DataRow[];
  headers: string[];
}

export const PivotView: React.FC<PivotViewProps> = ({ rows, headers }) => {
  const [config, setConfig] = useState<PivotConfig>({
    rowField: headers[0],
    columnField: headers[1] || headers[0],
    valueField: headers.find(h => h.includes('Number')) || headers[0],
    aggType: 'count'
  });

  const pivotData = useMemo(() => {
    return generatePivotData(rows, config.rowField, config.columnField, config.valueField, config.aggType);
  }, [rows, config]);

  const handleExportPivot = () => {
    const headerRow = [config.rowField, ...pivotData.columns].join(',');
    const bodyRows = pivotData.rows.map(r => {
      const rowVals = [r.row, ...pivotData.columns.map(c => r[c] || 0)];
      return rowVals.join(',');
    });
    const csvContent = [headerRow, ...bodyRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pivot_export_${new Date().getTime()}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Rows</label>
            <select 
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={config.rowField}
              onChange={(e) => setConfig({ ...config, rowField: e.target.value })}
            >
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Columns</label>
            <select 
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={config.columnField}
              onChange={(e) => setConfig({ ...config, columnField: e.target.value })}
            >
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Values</label>
            <select 
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={config.valueField}
              onChange={(e) => setConfig({ ...config, valueField: e.target.value })}
            >
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Aggregator</label>
            <select 
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={config.aggType}
              onChange={(e) => setConfig({ ...config, aggType: e.target.value as any })}
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
            </select>
          </div>
        </div>
        <button 
          onClick={handleExportPivot}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap h-[42px]"
        >
          <Download size={18} /> Export Pivot
        </button>
      </div>

      <div className="overflow-auto border border-slate-200 rounded-xl shadow-sm bg-white custom-scrollbar max-h-[500px]">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-4 font-bold border-b border-slate-200 bg-slate-100 text-slate-700 uppercase text-xs tracking-wider">
                {config.rowField} <span className="text-slate-400 font-normal">by</span> {config.columnField}
              </th>
              {pivotData.columns.map(c => (
                <th key={c} className="px-5 py-4 font-bold border-b border-slate-200 text-center text-slate-700 uppercase text-xs tracking-wider min-w-[100px]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pivotData.rows.map((r, i) => (
              <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-5 py-3 font-semibold border-r border-slate-100 bg-slate-50/50 text-slate-800">{r.row}</td>
                {pivotData.columns.map(c => (
                  <td key={c} className="px-5 py-3 text-center text-slate-600">
                    {r[c] !== undefined ? r[c].toLocaleString() : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
