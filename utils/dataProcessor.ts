
import { DataRow, DataType, ProcessedData, DashboardMetrics } from '../types';

const DATE_PATTERN = /^(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(?:\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})$/;
const ARABIC_REGEX = /[\u0600-\u06FF]/g;

function getTokens(val: any): string[] {
  if (val === null || val === undefined) return [];
  const str = String(val).replace(ARABIC_REGEX, '').trim();
  if (!str) return [];
  return str.split(/[\n,;]|\s{2,}/).map(t => t.trim()).filter(t => t !== '');
}

function parseToStandardDate(val: string): string | null {
  if (DATE_PATTERN.test(val)) {
    const parts = val.split(/[\/\-]/);
    let d, m, y;
    if (parts[0].length === 4) { [y, m, d] = parts; } 
    else { [d, m, y] = parts; }
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) {
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
  }
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
  return null;
}

function getTokenType(token: string): DataType {
  if (parseToStandardDate(token)) return DataType.DATE;
  if (/^\d{8,}$/.test(token)) return DataType.NUMBER;
  if (/[a-zA-Z]/.test(token)) return DataType.TEXT_ENGLISH;
  if (/^\d+(\.\d+)?$/.test(token)) return DataType.NUMBER;
  return DataType.UNKNOWN;
}

function mergeRecords(rawRows: DataRow[]): DataRow[] {
  if (rawRows.length === 0) return [];
  const merged: DataRow[] = [];
  const headers = Object.keys(rawRows[0]);
  let current: DataRow | null = null;
  rawRows.forEach((row) => {
    const idVal = String(row[headers[0]] || '').trim();
    if (idVal !== "") {
      current = { ...row };
      merged.push(current);
    } else if (current) {
      headers.forEach(h => {
        const val = String(row[h] || '').trim();
        if (val) {
          const existing = String(current![h] || '').trim();
          current![h] = existing ? `${existing}\n${val}` : val;
        }
      });
    } else {
      current = { ...row };
      merged.push(current);
    }
  });
  return merged;
}

export function harmonizeData(rawRows: DataRow[]): ProcessedData {
  if (rawRows.length === 0) return { headers: [], rows: [], originalHeaders: [] };
  const mergedRows = mergeRecords(rawRows);
  const originalHeaders = Object.keys(mergedRows[0]);
  const columnTypeMap: Record<string, Set<DataType>> = {};
  originalHeaders.forEach((header, index) => {
    const types = new Set<DataType>();
    if (index === 0) { types.add(DataType.TEXT_ENGLISH); } 
    else {
      mergedRows.forEach(row => {
        const tokens = getTokens(row[header]);
        tokens.forEach(t => types.add(getTokenType(t)));
      });
    }
    columnTypeMap[header] = types;
  });
  const finalHeaders: string[] = [];
  const expansionMap: Record<string, string[]> = {};
  originalHeaders.forEach((header, index) => {
    const types = columnTypeMap[header];
    if (index === 0 || types.size <= 1) {
      finalHeaders.push(header);
      expansionMap[header] = [header];
    } else {
      const subs: string[] = [];
      if (types.has(DataType.TEXT_ENGLISH)) subs.push(`${header} (Text)`);
      if (types.has(DataType.NUMBER)) subs.push(`${header} (Number)`);
      if (types.has(DataType.DATE)) subs.push(`${header} (Date)`);
      finalHeaders.push(...subs);
      expansionMap[header] = subs;
    }
  });
  const finalRows = mergedRows.map(row => {
    const newRow: DataRow = {};
    originalHeaders.forEach((header, index) => {
      const tokens = getTokens(row[header]);
      const targets = expansionMap[header];
      if (index === 0 || targets.length === 1) { newRow[targets[0]] = tokens.join(' '); } 
      else {
        targets.forEach(t => newRow[t] = "");
        tokens.forEach(token => {
          const type = getTokenType(token);
          let val = token;
          let subSuffix = "";
          if (type === DataType.DATE) {
            val = parseToStandardDate(token) || token;
            subSuffix = " (Date)";
          } else if (type === DataType.NUMBER) { subSuffix = " (Number)"; } 
          else if (type === DataType.TEXT_ENGLISH) { subSuffix = " (Text)"; }
          const targetHeader = `${header}${subSuffix}`;
          if (targets.includes(targetHeader)) {
            const existing = String(newRow[targetHeader] || '');
            newRow[targetHeader] = existing ? `${existing}; ${val}` : val;
          }
        });
      }
    });
    return newRow;
  });
  return { headers: finalHeaders, rows: finalRows, originalHeaders };
}

export function extractDashboardMetrics(data: DataRow[]): DashboardMetrics {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const metrics: DashboardMetrics = {
    total: data.length,
    escapeCount: 0,
    expiredCardCount: 0,
    activeCount: 0,
    upcomingRenewals: 0,
    nationalityData: {},
    nationalityEscapeData: {},
    nationalityExpiredData: {},
    statusData: {},
    jobDescriptionData: {}, 
    monthlyRenewals: {},
    monthlyEscapes: {}, // Track escapes by expiry month
    escapeRecords: [],
    expiredRecords: [],
    upcomingRecords: []
  };

  data.forEach(row => {
    const natKey = Object.keys(row).find(k => k.toLowerCase().includes('nationality'));
    const nat = natKey ? (String(row[natKey]).trim() || 'Unspecified') : 'Unspecified';
    metrics.nationalityData[nat] = (metrics.nationalityData[nat] || 0) + 1;

    let hasEscapeText = false;
    Object.values(row).forEach(val => {
      if (String(val).toLowerCase().includes('he has an escape report')) {
        hasEscapeText = true;
      }
    });

    if (hasEscapeText) {
      metrics.escapeCount++;
      metrics.escapeRecords.push(row);
      metrics.nationalityEscapeData[nat] = (metrics.nationalityEscapeData[nat] || 0) + 1;
    }

    const dateKey = Object.keys(row).find(k => k.includes('(Date)'));
    if (dateKey) {
      const dateStr = String(row[dateKey]).split(';')[0].trim();
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const dObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(dObj.getTime())) {
          const monthLabel = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
          metrics.monthlyRenewals[monthLabel] = (metrics.monthlyRenewals[monthLabel] || 0) + 1;
          
          if (hasEscapeText) {
            metrics.monthlyEscapes[monthLabel] = (metrics.monthlyEscapes[monthLabel] || 0) + 1;
          }

          if (dObj < today) {
            metrics.expiredCardCount++;
            metrics.expiredRecords.push(row);
            metrics.nationalityExpiredData[nat] = (metrics.nationalityExpiredData[nat] || 0) + 1;
          } else {
            metrics.activeCount++;
            if (dObj.getMonth() === currentMonth && dObj.getFullYear() === currentYear) {
              metrics.upcomingRenewals++;
              metrics.upcomingRecords.push(row);
            }
          }
        }
      }
    }
    
    const statusKey = Object.keys(row).find(k => k.toLowerCase().includes('status') || k.toLowerCase().includes('card type'));
    if (statusKey) {
      const status = String(row[statusKey]).trim() || 'Unknown';
      metrics.statusData[status] = (metrics.statusData[status] || 0) + 1;
    }
  });

  return metrics;
}

export function generatePivotData(rows: DataRow[], rowField: string, colField: string, valField: string, aggType: string) {
  const pivot: Record<string, Record<string, number>> = {};
  const allCols = new Set<string>();
  rows.forEach(row => {
    const rVal = String(row[rowField] || '(Blank)');
    const cVal = String(row[colField] || '(Blank)');
    const vRaw = String(row[valField] || '0').replace(/[^0-9.-]+/g, '');
    const vVal = parseFloat(vRaw) || 0;
    allCols.add(cVal);
    if (!pivot[rVal]) pivot[rVal] = {};
    if (aggType === 'sum') { pivot[rVal][cVal] = (pivot[rVal][cVal] || 0) + vVal; } 
    else { pivot[rVal][cVal] = (pivot[rVal][cVal] || 0) + 1; }
  });
  return { rows: Object.keys(pivot).map(key => ({ row: key, ...pivot[key] })), columns: Array.from(allCols).sort() };
}
