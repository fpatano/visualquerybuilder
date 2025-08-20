import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { QueryState, CatalogItem, QueryResult, DataProfile } from '../types';
import { generateSQL } from '../utils/sqlGenerator';
import { executeDatabricksQuery, getTableProfile, getColumnProfile } from '../services/databricksApi';

interface QueryBuilderState extends QueryState {
  catalog: CatalogItem[];
  sqlQuery: string;
  queryResult: QueryResult | null;
  isExecuting: boolean;
  selectedTable: string | null;
  selectedColumn: string | null;
  dataProfile: DataProfile | null;
  isLoadingProfile: boolean;
}

type QueryBuilderAction = 
  | { type: 'SET_CATALOG'; payload: CatalogItem[] }
  | { type: 'ADD_TABLE'; payload: any }
  | { type: 'REMOVE_TABLE'; payload: string }
  | { type: 'UPDATE_TABLE_POSITION'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'ADD_JOIN'; payload: any }
  | { type: 'REMOVE_JOIN'; payload: string }
  | { type: 'ADD_FILTER'; payload: any }
  | { type: 'REMOVE_FILTER'; payload: string }
  | { type: 'UPDATE_FILTER'; payload: any }
  | { type: 'ADD_AGGREGATION'; payload: any }
  | { type: 'UPDATE_AGGREGATION'; payload: any }
  | { type: 'REMOVE_AGGREGATION'; payload: string }
  | { type: 'ADD_SELECTED_COLUMN'; payload: any }
  | { type: 'REMOVE_SELECTED_COLUMN'; payload: string }
  | { type: 'UPDATE_SQL'; payload: string }
  | { type: 'SET_QUERY_RESULT'; payload: QueryResult | null }
  | { type: 'SET_EXECUTING'; payload: boolean }
  | { type: 'SELECT_TABLE'; payload: string | null }
  | { type: 'SELECT_COLUMN'; payload: string | null }
  | { type: 'SET_DATA_PROFILE'; payload: DataProfile | null }
  | { type: 'SET_LOADING_PROFILE'; payload: boolean };

const initialState: QueryBuilderState = {
  catalog: [],
  tables: [],
  joins: [],
  filters: [],
  aggregations: [],
  selectedColumns: [],
  groupByColumns: [],
  orderByColumns: [],
  sqlQuery: '',
  queryResult: null,
  isExecuting: false,
  selectedTable: null,
  selectedColumn: null,
  dataProfile: null,
  isLoadingProfile: false,
};

function queryBuilderReducer(state: QueryBuilderState, action: QueryBuilderAction): QueryBuilderState {
  switch (action.type) {
    case 'SET_CATALOG':
      return { ...state, catalog: action.payload };
    
    case 'ADD_TABLE':
      return { 
        ...state, 
        tables: [...state.tables, action.payload]
      };
    
    case 'REMOVE_TABLE':
      return {
        ...state,
        tables: state.tables.filter(t => t.id !== action.payload),
        joins: state.joins.filter(j => j.sourceTable !== action.payload && j.targetTable !== action.payload),
        filters: state.filters.filter(f => f.table !== action.payload),
        aggregations: state.aggregations.filter(a => a.table !== action.payload),
        selectedColumns: state.selectedColumns.filter(c => c.table !== action.payload)
      };
    
    case 'UPDATE_TABLE_POSITION':
      return {
        ...state,
        tables: state.tables.map(t => 
          t.id === action.payload.id 
            ? { ...t, position: action.payload.position }
            : t
        )
      };
    
    case 'ADD_JOIN':
      return { ...state, joins: [...state.joins, action.payload] };
    
    case 'REMOVE_JOIN':
      return { ...state, joins: state.joins.filter(j => j.id !== action.payload) };
    
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, action.payload] };
    
    case 'REMOVE_FILTER':
      return { ...state, filters: state.filters.filter(f => f.id !== action.payload) };
    
    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: state.filters.map(f => f.id === action.payload.id ? action.payload : f)
      };
    
    case 'ADD_AGGREGATION':
      return { ...state, aggregations: [...state.aggregations, action.payload] };
    
    case 'UPDATE_AGGREGATION':
      return {
        ...state,
        aggregations: state.aggregations.map(a => a.id === action.payload.id ? action.payload : a)
      };
    
    case 'REMOVE_AGGREGATION':
      return { ...state, aggregations: state.aggregations.filter(a => a.id !== action.payload) };
    
    case 'ADD_SELECTED_COLUMN':
      return { ...state, selectedColumns: [...state.selectedColumns, action.payload] };
    
    case 'REMOVE_SELECTED_COLUMN':
      return { ...state, selectedColumns: state.selectedColumns.filter(c => c.id !== action.payload) };
    
    case 'UPDATE_SQL':
      return { ...state, sqlQuery: action.payload };
    
    case 'SET_QUERY_RESULT':
      return { ...state, queryResult: action.payload };
    
    case 'SET_EXECUTING':
      return { ...state, isExecuting: action.payload };
    
    case 'SELECT_TABLE':
      return { ...state, selectedTable: action.payload, selectedColumn: null };
    
    case 'SELECT_COLUMN':
      // When selecting a column, also set the parent table
      const columnId = action.payload;
      let parentTable = null;
      if (columnId) {
        // Extract table ID from column ID (e.g., "catalog.schema.table.column" -> "catalog.schema.table")
        const parts = columnId.split('.');
        if (parts.length >= 4) {
          parentTable = parts.slice(0, 3).join('.');
        }
      }
      return { ...state, selectedColumn: action.payload, selectedTable: parentTable };
    
    case 'SET_DATA_PROFILE':
      return { ...state, dataProfile: action.payload };
    
    case 'SET_LOADING_PROFILE':
      return { ...state, isLoadingProfile: action.payload };
    
    default:
      return state;
  }
}

interface QueryBuilderContextType {
  state: QueryBuilderState;
  dispatch: React.Dispatch<QueryBuilderAction>;
  executeQuery: (isPreview?: boolean) => Promise<void>;
  cancelQuery?: () => void;
  loadDataProfile: (table: string, column?: string) => Promise<void>;
}

const QueryBuilderContext = createContext<QueryBuilderContextType | undefined>(undefined);

export function QueryBuilderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(queryBuilderReducer, initialState);
  const abortRef = React.useRef<AbortController | null>(null);

  // Auto-generate SQL when query state changes
  useEffect(() => {
    const sql = generateSQL(state);
    dispatch({ type: 'UPDATE_SQL', payload: sql });
  }, [state.tables, state.joins, state.filters, state.aggregations, state.selectedColumns, state.groupByColumns, state.orderByColumns, state.limit]);

  // Conservative auto-execute with longer debounce to prevent warehouse overload
  useEffect(() => {
    if (!state.sqlQuery.trim()) return;
    if (state.tables.length === 0) return; // Don't execute empty queries
    
    const timeoutId = setTimeout(() => {
      // Only auto-execute simple single-table queries
      if (state.tables.length === 1 && state.joins.length === 0) {
        console.log('🔍 Auto-executing simple single-table query...');
        executeQuery(true); // Preview mode with LIMIT
      } else {
        console.log('⚠️ Complex query detected - manual execution required');
      }
    }, 3000); // 3 second debounce to reduce load

    return () => clearTimeout(timeoutId);
  }, [state.sqlQuery, state.tables.length, state.joins.length]);

  const executeQuery = useCallback(async (isPreview: boolean = true) => {
    if (!state.sqlQuery.trim()) return;

    dispatch({ type: 'SET_EXECUTING', payload: true });
    
    try {
      // Preflight join validation using available column types
      const normalizeType = (t?: string) => (t || '').toLowerCase().split('(')[0];
      const numeric = new Set(['tinyint','smallint','int','integer','bigint','float','double','real','decimal','numeric']);
      for (const join of state.joins) {
        const srcTbl = state.tables.find(t => t.id === join.sourceTable);
        const tgtTbl = state.tables.find(t => t.id === join.targetTable);
        const srcCol = srcTbl?.columns?.find(c => c.name === join.sourceColumn);
        const tgtCol = tgtTbl?.columns?.find(c => c.name === join.targetColumn);
        if (srcCol && tgtCol) {
          const a = normalizeType(srcCol.dataType);
          const b = normalizeType(tgtCol.dataType);
          const compatible = a === b || (numeric.has(a) && numeric.has(b));
          if (!compatible) {
            dispatch({ 
              type: 'SET_QUERY_RESULT', 
              payload: {
                columns: ['Error'],
                rows: [[`Invalid JOIN: ${join.sourceTable}.${join.sourceColumn} (${srcCol.dataType}) incompatible with ${join.targetTable}.${join.targetColumn} (${tgtCol.dataType})`]],
                executionTime: 0,
                rowCount: 0,
                error: 'Invalid JOIN'
              }
            });
            return;
          }
        }
      }

      let queryToExecute = state.sqlQuery;
      
      // For preview mode, add LIMIT if not already present to prevent timeouts
      let limitApplied = false;
      if (isPreview && !queryToExecute.toLowerCase().includes('limit')) {
        queryToExecute = `${queryToExecute}\nLIMIT 100`;
        limitApplied = true;
        console.log('🔍 Added LIMIT 100 for preview mode to prevent timeouts');
      }
      
      // Support cancellation via AbortController
      // Cancel any previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const result = await executeDatabricksQuery(queryToExecute, { signal: controller.signal });
      
      // Add metadata about limit being applied
      if (limitApplied && result && !result.error) {
        result.metadata = { 
          ...result.metadata, 
          isPreview: true, 
          limitApplied: 100,
          note: 'Showing first 100 rows only. Use "Run" in SQL Editor for full results.'
        };
      }
      
      dispatch({ type: 'SET_QUERY_RESULT', payload: result });
    } catch (error) {
      console.error('Query execution failed:', error);
      dispatch({ 
        type: 'SET_QUERY_RESULT', 
        payload: { 
          columns: [], 
          rows: [], 
          executionTime: 0, 
          rowCount: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    } finally {
      dispatch({ type: 'SET_EXECUTING', payload: false });
      abortRef.current = null;
    }
  }, [state.sqlQuery]);

  const cancelQuery = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const loadDataProfile = useCallback(async (table: string, column?: string) => {
    dispatch({ type: 'SET_LOADING_PROFILE', payload: true });
    
    try {
      // Parse table ID to get catalog, schema, table parts
      const parts = table.split('.');
      if (parts.length < 3) {
        throw new Error('Invalid table format. Expected: catalog.schema.table');
      }
      
      const [catalog, schema, tableName] = parts;
      
      let profile: DataProfile;
      
      if (column) {
        // Get column profile
        const columnParts = column.split('.');
        const columnName = columnParts[columnParts.length - 1]; // Get just the column name
        console.log(`Loading column profile for: ${catalog}.${schema}.${tableName}.${columnName}`);
        profile = await getColumnProfile(catalog, schema, tableName, columnName);
      } else {
        // Get table profile
        console.log(`Loading table profile for: ${catalog}.${schema}.${tableName}`);
        profile = await getTableProfile(catalog, schema, tableName);
      }
      
      dispatch({ type: 'SET_DATA_PROFILE', payload: profile });
    } catch (error) {
      console.error('Failed to load data profile:', error);
      
      // Fallback profile with error message
      const errorProfile: DataProfile = {
        totalRows: 0,
        nullCount: 0,
        uniqueCount: 0,
        dataType: column ? 'UNKNOWN' : 'TABLE',
        sampleValues: [`Error loading profile: ${error instanceof Error ? error.message : 'Unknown error'}`],
        distribution: { 'Error': 1 }
      };
      
      dispatch({ type: 'SET_DATA_PROFILE', payload: errorProfile });
    } finally {
      dispatch({ type: 'SET_LOADING_PROFILE', payload: false });
    }
  }, []);

  return (
    <QueryBuilderContext.Provider value={{ state, dispatch, executeQuery, cancelQuery, loadDataProfile }}>
      {children}
    </QueryBuilderContext.Provider>
  );
}

export function useQueryBuilder() {
  const context = useContext(QueryBuilderContext);
  if (context === undefined) {
    throw new Error('useQueryBuilder must be used within a QueryBuilderProvider');
  }
  return context;
}
