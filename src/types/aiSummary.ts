export interface QueryMetadata {
  tableNames: string[];
  businessContext: string;
  queryComplexity: {
    tableCount: number;
    joinCount: number;
    filterCount: number;
    aggregationCount: number;
  };
}

export interface AISummaryResult {
  summary: string;
  metadata: QueryMetadata;
  timestamp: number;
  queryHash: string;
}

export interface AISummaryError {
  error: string;
  funnyMessage: string;
  robotEmoji: string;
}
