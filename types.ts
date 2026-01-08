
export type DataRow = Record<string, any>;

export interface ProcessedData {
  headers: string[];
  rows: DataRow[];
  originalHeaders: string[];
}

export interface CompanyDataset {
  id: string;
  name: string;
  data: ProcessedData;
}

export enum DataType {
  NUMBER = 'Number',
  TEXT_ENGLISH = 'Text (English)',
  DATE = 'Date',
  UNKNOWN = 'Unknown'
}

export interface PivotConfig {
  rowField: string;
  columnField: string;
  valueField: string;
  aggType: 'sum' | 'count' | 'avg';
}

export interface DashboardMetrics {
  total: number;
  escapeCount: number;         
  expiredCardCount: number;    
  activeCount: number;
  upcomingRenewals: number;
  nationalityData: Record<string, number>;
  nationalityEscapeData: Record<string, number>;
  nationalityExpiredData: Record<string, number>;
  statusData: Record<string, number>;
  jobDescriptionData: Record<string, number>;
  monthlyRenewals: Record<string, number>;
  monthlyEscapes: Record<string, number>;
  escapeRecords: DataRow[];
  expiredRecords: DataRow[];   
  upcomingRecords: DataRow[]; 
}

export interface FilterConfig {
  column: string;
  value: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
}
