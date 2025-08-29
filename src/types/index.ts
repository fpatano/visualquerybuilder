export interface CatalogItem {
  id: string;
  name: string;
  type: 'catalog' | 'schema' | 'table' | 'column';
  parent?: string;
  children?: CatalogItem[];
  dataType?: string;
  nullable?: boolean;
  comment?: string;
  expanded?: boolean;
  isLoaded?: boolean;
}

export interface TableNode {
  id: string;
  name: string;
  schema: string;
  catalog: string;
  columns: ColumnInfo[];
  position: { x: number; y: number };
  selected?: boolean;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  comment?: string;
}

export interface JoinRelation {
  id: string;
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'like' | 'in' | 'is_null' | 'is_not_null';
  value: string | string[];
  table: string;
}

export interface AggregationBlock {
  id: string;
  column: string;
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT';
  alias?: string;
  table: string;
}

export interface SelectColumn {
  id: string;
  column: string;
  table: string;
  alias?: string;
}

export interface QueryState {
  tables: TableNode[];
  joins: JoinRelation[];
  filters: FilterCondition[];
  aggregations: AggregationBlock[];
  selectedColumns: SelectColumn[];
  groupByColumns: string[];
  orderByColumns: { column: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
}

export interface DataProfile {
  totalRows: number;
  nullCount: number;
  uniqueCount: number;
  dataType: string;
  sampleValues: any[];
  distribution?: { [key: string]: number };
  min?: any;
  max?: any;
  mean?: number;
  median?: number;
  stddev?: number;
  percentiles?: {
    p25?: number;
    p50?: number;
    p75?: number;
    p90?: number;
    p99?: number;
  };
  metadata?: {
    columnCount?: number;
    nullableColumns?: number;
    tableSize?: string;
    lastUpdated?: string;
    profilingMethod?: string;
    isApproximate?: boolean;
    performanceNote?: string;
    nullPercentage?: number;
    mode?: ProfileMode;
    updatedAt?: string;
    completenessPercentage?: number;
  };
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  executionTime: number;
  rowCount: number;
  error?: string;
  metadata?: {
    isPreview?: boolean;
    limitApplied?: number;
    note?: string;
    [key: string]: any;
  };
}

export type ProfileMode = 'fast' | 'standard' | 'deep';

export interface ProfileCacheEntry {
  key: string;
  mode: ProfileMode;
  data?: DataProfile;
  status: 'fresh' | 'stale' | 'loading' | 'error';
  error?: string;
  updatedAt?: number; // epoch ms
  ttlMs: number;
}

// Parsed SQL structures for syncing editor -> canvas
export interface ParsedTableRef {
  catalog: string;
  schema: string;
  name: string;
  alias?: string;
}

export interface ParsedJoinRef {
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  leftAlias: string;
  leftColumn: string;
  rightAlias: string;
  rightColumn: string;
}

export interface ParsedSelectRef {
  alias: string;
  column: string;
  as?: string;
}

export interface ParsedSQL {
  tables: ParsedTableRef[];
  joins: ParsedJoinRef[];
  selects: ParsedSelectRef[];
}
