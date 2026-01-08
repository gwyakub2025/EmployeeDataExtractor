
import React, { useState, useRef, useEffect } from 'react';
import { DataRow } from '../types';

interface DataTableProps {
  headers: string[];
  rows: DataRow[];
  highlightTerm?: string;
}

const HighlightedText: React.FC<{ text: string; term: string }> = ({ text, term }) => {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const DataTable: React.FC<DataTableProps> = ({ headers, rows, highlightTerm = "" }) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ index: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = (header: string, e: React.MouseEvent) => {
    const startX = e.pageX;
    const startWidth = columnWidths[header] || 200;
    resizingRef.current = { index: header, startX, startWidth };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { index, startX, startWidth } = resizingRef.current;
    const diff = e.pageX - startX;
    const newWidth = Math.max(100, startWidth + diff);
    setColumnWidths((prev) => ({ ...prev, [index]: newWidth }));
  };

  const onMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  return (
    <div className="overflow-auto max-h-[650px] border border-slate-200 rounded-2xl shadow-xl bg-white custom-scrollbar">
      <table className="w-full text-sm text-left border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
        <thead className="bg-slate-50 sticky top-0 z-20 shadow-md">
          <tr>
            {headers.map((h, i) => {
              const isSplit = h.includes('(');
              const width = columnWidths[h] || 200;
              return (
                <th 
                  key={i} 
                  className={`relative px-6 py-4 font-bold text-slate-700 border-b border-slate-200 whitespace-nowrap uppercase tracking-wider text-[11px] ${isSplit ? 'bg-indigo-50/50' : ''}`}
                  style={{ width: `${width}px` }}
                >
                  <div className="flex flex-col truncate pr-4">
                    <span className={isSplit ? 'text-indigo-600 truncate' : 'truncate'}>{h.split('(')[0]}</span>
                    {isSplit && <span className="text-[9px] font-black text-indigo-400 mt-0.5">[{h.split('(')[1].replace(')', '')}]</span>}
                  </div>
                  {/* Resize Handle */}
                  <div 
                    onMouseDown={(e) => onMouseDown(h, e)}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-indigo-400/50 transition-colors z-30"
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-indigo-50/20 transition-colors group">
              {headers.map((h, colIndex) => {
                const isSplit = h.includes('(');
                const val = row[h] !== undefined ? String(row[h]) : "";
                const width = columnWidths[h] || 200;
                return (
                  <td 
                    key={colIndex} 
                    className={`px-6 py-4 text-slate-600 border-b border-slate-50 break-words leading-relaxed ${isSplit ? 'bg-indigo-50/10' : ''}`}
                    style={{ width: `${width}px` }}
                  >
                    {val ? (
                      <HighlightedText text={val} term={highlightTerm} />
                    ) : (
                      <span className="text-slate-200 italic font-light">empty</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-6 py-20 text-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <p className="font-bold uppercase tracking-widest text-xs">No records matching the filter criteria.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
