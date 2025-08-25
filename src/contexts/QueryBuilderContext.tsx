import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { QueryState, CatalogItem, QueryResult, DataProfile, ProfileMode, ProfileCacheEntry } from '../types';
import { generateSQL, parseSQL } from '../utils/sqlGenerator';
import { executeDatabricksQuery, getTableProfile, getColumnProfile, fetchColumns, fetchCatalogMetadata, fetchSchemas, fetchTables } from '../services/databricksApi';

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
  | { type: 'UPDATE_JOIN_TYPE'; payload: { id: string; joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' } }
  | { type: 'UPDATE_JOIN_COLUMNS'; payload: { id: string; sourceColumn: string; targetColumn: string } }
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
  | { type: 'SET_LOADING_PROFILE'; payload: boolean }
  | { type: 'UPDATE_TABLE_COLUMNS'; payload: { id: string; columns: any[] } }
  | { type: 'SET_FROM_PARSED_SQL'; payload: { tables: any[]; joins: any[]; selectedColumns: any[] } };

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
    
    case 'UPDATE_TABLE_COLUMNS':
      return {
        ...state,
        tables: state.tables.map(t => t.id === action.payload.id ? { ...t, columns: action.payload.columns } : t)
      };
    
    case 'ADD_JOIN':
      return { ...state, joins: [...state.joins, action.payload] };
    
    case 'REMOVE_JOIN':
      return { ...state, joins: state.joins.filter(j => j.id !== action.payload) };
    
    case 'UPDATE_JOIN_TYPE':
      return {
        ...state,
        joins: state.joins.map(j => j.id === action.payload.id ? { ...j, joinType: action.payload.joinType } : j)
      };

    case 'UPDATE_JOIN_COLUMNS':
      return {
        ...state,
        joins: state.joins.map(j => j.id === action.payload.id ? { ...j, sourceColumn: action.payload.sourceColumn, targetColumn: action.payload.targetColumn } : j)
      };
    
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
    
    case 'SET_FROM_PARSED_SQL':
      return {
        ...state,
        tables: action.payload.tables,
        joins: action.payload.joins,
        selectedColumns: action.payload.selectedColumns
      };
    
    default:
      return state;
  }
}

interface QueryBuilderContextType {
  state: QueryBuilderState;
  dispatch: React.Dispatch<QueryBuilderAction>;
  executeQuery: (isPreview?: boolean) => Promise<void>;
  cancelQuery?: () => void;
  loadDataProfile: (table: string, column?: string, mode?: ProfileMode) => Promise<void>;
  applySqlToCanvas: (sql: string) => Promise<void>;
}

const QueryBuilderContext = createContext<QueryBuilderContextType | undefined>(undefined);

export function QueryBuilderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(queryBuilderReducer, initialState);
  const abortRef = React.useRef<AbortController | null>(null);

  // Track if we're currently applying SQL to prevent auto-regeneration loops
  const [isApplyingSql, setIsApplyingSql] = React.useState(false);

  // Auto-generate SQL when query state changes (but not during SQL import)
  useEffect(() => {
    if (isApplyingSql) {
      console.log('🚫 Skipping auto-generation during SQL import');
      return; // Skip auto-generation during import
    }
    
    // Auto-generate if we have any tables
    const hasTables = state.tables.length > 0;
    if (!hasTables) return;
    
    console.log('🔧 Auto-generating SQL from canvas state');
    
    try {
      const sql = generateSQL(state);
      dispatch({ type: 'UPDATE_SQL', payload: sql });
    } catch (error) {
      console.error('SQL generation failed:', error);
      // Do not crash the app; surface a helpful placeholder
      dispatch({ type: 'UPDATE_SQL', payload: '-- SQL generation error: please review joins/filters' });
    }
  }, [state.tables, state.joins, state.filters, state.aggregations, state.selectedColumns, state.groupByColumns, state.orderByColumns, state.limit, isApplyingSql]);

  // Apply raw SQL to canvas (used for import or explicit sync)
  // Cache for table resolution to avoid repeated lookups
  const tableResolutionCache = React.useRef<Map<string, {catalog: string, schema: string, name: string} | null>>(new Map());
  
  // Helper function to search for tables across all catalogs and schemas
  const findTableInCatalog = useCallback(async (searchTableName: string): Promise<{catalog: string, schema: string, name: string} | null> => {
    const lowerTableName = searchTableName.toLowerCase();
    
    try {
      // Check cache first
      if (tableResolutionCache.current.has(lowerTableName)) {
        const cached = tableResolutionCache.current.get(lowerTableName);
        console.log(`📦 Using cached result for table "${searchTableName}":`, cached);
        return cached;
      }
      
      console.log(`🔍 Searching for table "${searchTableName}" across all catalogs...`);
      
      // Get all catalogs
      const catalogs = await fetchCatalogMetadata();
      
      // Prioritize common catalogs (samples first, as it has TPC-H test data)
      const prioritizedCatalogs = [
        ...catalogs.filter(c => c.name === 'samples'),
        ...catalogs.filter(c => c.name !== 'samples' && c.name !== 'system')
      ];
      
      // Search each catalog for the table
      for (const catalog of prioritizedCatalogs) {
        try {
          const schemas = await fetchSchemas(catalog.name);
          
          // Prioritize common schemas (like tpch for samples)
          const prioritizedSchemas = [
            ...schemas.filter(s => s.name === 'tpch'),
            ...schemas.filter(s => s.name !== 'tpch' && s.name !== 'information_schema')
          ];
          
          for (const schema of prioritizedSchemas) {
            try {
              const tables = await fetchTables(catalog.name, schema.name);
              const foundTable = tables.find(t => 
                t.name.toLowerCase() === searchTableName.toLowerCase()
              );
              
              if (foundTable) {
                console.log(`✅ Found table: ${catalog.name}.${schema.name}.${searchTableName}`);
                const result = {
                  catalog: catalog.name,
                  schema: schema.name,
                  name: searchTableName
                };
                tableResolutionCache.current.set(lowerTableName, result);
                return result;
              }
            } catch (error) {
              // Skip schema if we can't access it (but don't spam logs for common failures)
              if (!error.message?.includes('404')) {
                console.warn(`⚠️ Could not search schema ${catalog.name}.${schema.name}:`, error);
              }
            }
          }
        } catch (error) {
          // Skip catalog if we can't access it
          console.warn(`⚠️ Could not search catalog ${catalog.name}:`, error);
        }
      }
      
      console.log(`❌ Table "${searchTableName}" not found in any catalog`);
      tableResolutionCache.current.set(lowerTableName, null);
      return null;
    } catch (error) {
      console.error(`❌ Error searching for table "${searchTableName}":`, error);
      tableResolutionCache.current.set(lowerTableName, null);
      return null;
    }
  }, []);

  const applySqlToCanvas = useCallback(async (sql: string) => {
    setIsApplyingSql(true); // Prevent auto-regeneration during import
    
    try {
      console.log('🔄 Starting SQL to canvas sync for:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
      
      const parsed = parseSQL(sql);
      console.log('📊 Parsing result:', parsed);
      
      if (!parsed) {
        console.error('❌ SQL parsing returned null/undefined');
        throw new Error('SQL parsing failed - the query syntax may not be supported');
      }
      
      if (!parsed.tables || parsed.tables.length === 0) {
        console.warn('⚠️ No tables found in parsed SQL');
        throw new Error('No tables found in the SQL query. Make sure your query includes a FROM clause with table references.');
      }
      
      console.log('🔄 Applying SQL to canvas:', parsed.tables.map(t => `${t.catalog || 'default'}.${t.schema || 'default'}.${t.name}`));
      
      const existingPositions = new Map(state.tables.map(t => [t.name, t.position]));
      
      // Smart layout: arrange tables to show joins clearly
      const layoutTables = (tables: any[], joins: any[]) => {
        const positioned = new Map<string, { x: number; y: number }>();
        const TABLE_WIDTH = 280;
        const TABLE_HEIGHT = 200;
        
        // Dynamic spacing based on table count and complexity
        const calculateSpacing = (tableCount: number, joinCount: number) => {
          const baseHorizontal = 350;
          const baseVertical = 250;
          
          // For more tables, increase spacing to prevent crowding
          const horizontalMultiplier = Math.max(1.0, 1.0 + (tableCount - 3) * 0.1);
          const verticalMultiplier = Math.max(1.0, 1.0 + (tableCount - 3) * 0.08);
          
          // For complex join patterns, add extra spacing
          const joinComplexity = joinCount / Math.max(1, tableCount - 1);
          const complexityBonus = joinComplexity > 0.8 ? 1.2 : 1.0;
          
          return {
            horizontal: Math.round(baseHorizontal * horizontalMultiplier * complexityBonus),
            vertical: Math.round(baseVertical * verticalMultiplier * complexityBonus)
          };
        };
        
        const spacing = calculateSpacing(tables.length, joins.length);
        const HORIZONTAL_SPACING = spacing.horizontal;
        const VERTICAL_SPACING = spacing.vertical;
        
        console.log(`📐 Dynamic spacing: H=${HORIZONTAL_SPACING}, V=${VERTICAL_SPACING} for ${tables.length} tables, ${joins.length} joins`);
        
        if (tables.length === 0) return positioned;
        
        // If no joins, arrange in an optimized grid
        if (joins.length === 0) {
          const cols = Math.ceil(Math.sqrt(tables.length));
          const rows = Math.ceil(tables.length / cols);
          
          // Center the grid on canvas
          const totalWidth = (cols - 1) * HORIZONTAL_SPACING;
          const totalHeight = (rows - 1) * VERTICAL_SPACING;
          const startX = Math.max(100, (1200 - totalWidth) / 2);
          const startY = Math.max(100, (800 - totalHeight) / 2);
          
          tables.forEach((table, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            positioned.set(table.id || table.alias || table.name, {
              x: startX + col * HORIZONTAL_SPACING,
              y: startY + row * VERTICAL_SPACING
            });
          });
          return positioned;
        }
        
        // Build a graph of table connections from joins
        const connections = new Map<string, Set<string>>();
        tables.forEach(t => {
          // Use table ID (SQL alias) as the key, fallback to name
          const alias = t.id || t.alias || t.name;
          if (!connections.has(alias)) connections.set(alias, new Set());
        });
        
        joins.forEach(j => {
          connections.get(j.leftAlias)?.add(j.rightAlias);
          connections.get(j.rightAlias)?.add(j.leftAlias);
        });
        
        // Find the best starting table (most connected or first in join chain)
        let startTable = tables[0];
        if (joins.length > 0) {
          // Try to find a table that's at the beginning of a join chain
          const joinSources = new Set(joins.map(j => j.leftAlias));
          const joinTargets = new Set(joins.map(j => j.rightAlias));
          
          // Look for tables that are sources but not targets (start of chain)
          const chainStarters = tables.filter(t => {
            const alias = t.id || t.alias || t.name;
            return joinSources.has(alias) && !joinTargets.has(alias);
          });
          
          if (chainStarters.length > 0) {
            startTable = chainStarters[0];
          } else {
            // Fallback to most connected table
            startTable = tables.reduce((max, table) => {
              const alias = table.id || table.alias || table.name;
              const connectionCount = connections.get(alias)?.size || 0;
              const maxCount = connections.get(max.id || max.alias || max.name)?.size || 0;
              return connectionCount > maxCount ? table : max;
            });
          }
        }
        
        const startAlias = startTable.id || startTable.alias || startTable.name;
        
        // Position start table in center-left
        const startX = 300;
        const startY = 400;
        positioned.set(startAlias, { x: startX, y: startY });
        
        // Enhanced breadth-first layout with smart positioning
        const queue: Array<{ alias: string; level: number; parentX: number; parentY: number; angle?: number }> = [
          { alias: startAlias, level: 0, parentX: startX, parentY: startY }
        ];
        const visited = new Set<string>([startAlias]);
        
        // Calculate canvas center and available space
        const canvasWidth = 1400;
        const canvasHeight = 900;
        
        // Detect if this is a linear chain pattern (common for star schema or sequential joins)
        const isLinearChain = joins.every(j => {
          const sourceConnections = connections.get(j.leftAlias)?.size || 0;
          const targetConnections = connections.get(j.rightAlias)?.size || 0;
          return sourceConnections <= 2 && targetConnections <= 2;
        });
        
        console.log(`🔄 Layout pattern detected: ${isLinearChain ? 'Linear Chain' : 'Complex Network'}`);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          const connectedTables = Array.from(connections.get(current.alias) || []);
          const unvisitedConnected = connectedTables.filter(alias => !visited.has(alias));
          
          if (unvisitedConnected.length === 0) continue;
          
          unvisitedConnected.forEach((connectedAlias, index) => {
            visited.add(connectedAlias);
            
            let x: number, y: number;
            const level = current.level + 1;
            
            if (isLinearChain && level <= 4) {
              // Linear chain: position horizontally for clarity with guaranteed spacing
              x = current.parentX + HORIZONTAL_SPACING;
              
              // For linear chains, ensure each table gets a unique Y position
              // This prevents overlaps when multiple tables are at the same level
              if (unvisitedConnected.length === 1) {
                // Single table: keep it aligned with parent
                y = current.parentY;
              } else {
                // Multiple tables: spread them vertically with guaranteed spacing
                const verticalOffset = (index - (unvisitedConnected.length - 1) / 2) * (VERTICAL_SPACING * 0.6);
                y = current.parentY + verticalOffset;
              }
            } else {
              // Complex network: use radial spread
              const totalTables = unvisitedConnected.length;
              const baseAngle = current.angle || 0;
              const angleSpread = Math.min(Math.PI * 1.2, totalTables * 0.9);
              const startAngle = baseAngle - angleSpread / 2;
              const angle = totalTables === 1 ? baseAngle : startAngle + (index * angleSpread) / Math.max(1, totalTables - 1);
              
              const radius = HORIZONTAL_SPACING * (1.0 + level * 0.3);
              x = current.parentX + radius * Math.cos(angle);
              y = current.parentY + radius * Math.sin(angle);
            }
            
            // Keep within canvas bounds with padding
            x = Math.max(150, Math.min(canvasWidth - 350, x));
            y = Math.max(150, Math.min(canvasHeight - 250, y));
            
            // Immediate collision detection and resolution for this table
            let finalX = x;
            let finalY = y;
            
            // Check against all already positioned tables
            positioned.forEach((existingPos, existingAlias) => {
              const dx = finalX - existingPos.x;
              const dy = finalY - existingPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minRequiredDistance = 300; // Minimum distance between table centers
              
              if (distance < minRequiredDistance && distance > 0) {
                // Push this table away from the existing one
                const pushFactor = (minRequiredDistance - distance) / distance;
                
                // Push in the direction that maintains the intended layout
                if (isLinearChain) {
                  // For linear chains, prefer horizontal separation
                  finalX += dx > 0 ? pushFactor * 50 : -pushFactor * 50;
                } else {
                  // For complex layouts, use both directions
                  finalX += dx * pushFactor * 0.3;
                  finalY += dy * pushFactor * 0.3;
                }
              }
            });
            
            // Keep final position within bounds
            finalX = Math.max(150, Math.min(canvasWidth - 350, finalX));
            finalY = Math.max(150, Math.min(canvasHeight - 250, finalY));
            
            positioned.set(connectedAlias, { x: finalX, y: finalY });
            
            console.log(`📍 Positioned ${connectedAlias}: (${finalX}, ${finalY}) - Level ${level}, Linear: ${isLinearChain}`);
            
            queue.push({ 
              alias: connectedAlias, 
              level, 
              parentX: finalX, 
              parentY: finalY,
              angle: isLinearChain ? 0 : Math.atan2(finalY - current.parentY, finalX - current.parentX)
            });
          });
        }
        
        // Position any remaining unconnected tables in a separate area
        const unconnectedTables = tables.filter(t => {
          const alias = t.id || t.alias || t.name;
          return !positioned.has(alias);
        });
        
        if (unconnectedTables.length > 0) {
          const startX = 1200; // Far right area
          const startY = 100;
          
          unconnectedTables.forEach((table, index) => {
            const cols = Math.ceil(Math.sqrt(unconnectedTables.length));
            const row = Math.floor(index / cols);
            const col = index % cols;
            positioned.set(table.id || table.alias || table.name, {
              x: startX + col * HORIZONTAL_SPACING,
              y: startY + row * VERTICAL_SPACING
            });
          });
        }
        
        // Advanced collision avoidance with smart repositioning
        const finalPositions = new Map<string, { x: number; y: number }>();
        const minDistance = Math.max(320, HORIZONTAL_SPACING * 0.85); // Dynamic minimum distance
        const maxIterations = 3; // Limit iterations to prevent infinite loops
        
        // Sort by level/importance to prioritize important tables
        const sortedPositions = Array.from(positioned.entries()).sort(([aliasA, posA], [aliasB, posB]) => {
          // Prioritize start table and early join chain members
          const isStartA = aliasA === startAlias;
          const isStartB = aliasB === startAlias;
          if (isStartA && !isStartB) return -1;
          if (!isStartA && isStartB) return 1;
          
          // Then by distance from start (closer = more important)
          const distA = Math.sqrt(Math.pow(posA.x - startX, 2) + Math.pow(posA.y - startY, 2));
          const distB = Math.sqrt(Math.pow(posB.x - startX, 2) + Math.pow(posB.y - startY, 2));
          return distA - distB;
        });
        
        sortedPositions.forEach(([alias, pos]) => {
          let finalX = pos.x;
          let finalY = pos.y;
          
          // Iteratively resolve conflicts
          for (let iteration = 0; iteration < maxIterations; iteration++) {
            let hasConflict = false;
            
            finalPositions.forEach((existingPos) => {
              const dx = finalX - existingPos.x;
              const dy = finalY - existingPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < minDistance && distance > 0) {
                hasConflict = true;
                // Smarter push: consider table relationships
                const pushFactor = (minDistance - distance) / distance * 0.6;
                
                // Push in the direction that maintains layout structure
                if (Math.abs(dx) > Math.abs(dy)) {
                  // Horizontal separation
                  finalX += dx > 0 ? pushFactor * Math.abs(dx) : -pushFactor * Math.abs(dx);
                } else {
                  // Vertical separation
                  finalY += dy > 0 ? pushFactor * Math.abs(dy) : -pushFactor * Math.abs(dy);
                }
              }
            });
            
            if (!hasConflict) break; // No more conflicts
          }
          
          // Keep within reasonable canvas bounds
          finalX = Math.max(100, Math.min(canvasWidth - 300, finalX));
          finalY = Math.max(100, Math.min(canvasHeight - 200, finalY));
          
          finalPositions.set(alias, { x: finalX, y: finalY });
        });
        
        return finalPositions;
      };
      
      const smartPositions = layoutTables(parsed.tables, parsed.joins);
      
      // Debug: Log the smart positions to see what keys are being generated
      console.log('🔍 Smart positions generated:', Array.from(smartPositions.entries()));
      console.log('🔍 Parsed tables:', parsed.tables.map(t => ({ id: t.id, name: t.name })));
      
      // Helper to generate clean aliases
      const generateCleanAlias = (tableName: string, existingAliases: Set<string>) => {
        // If it's already a clean name (no timestamps), use it
        if (!/table_\d+/.test(tableName)) {
          let alias = tableName;
          let counter = 1;
          while (existingAliases.has(alias)) {
            alias = `${tableName}${counter}`;
            counter++;
          }
          return alias;
        }
        
        // For imported SQL with ugly aliases, generate clean ones
        let baseAlias = 'table';
        let counter = 1;
        let alias = baseAlias;
        while (existingAliases.has(alias)) {
          alias = `${baseAlias}${counter}`;
          counter++;
        }
        return alias;
      };

      const existingAliases = new Set<string>();
      
      // First, try to fetch columns for all tables before adding them to canvas
      const tablesWithColumns = await Promise.all(
        (parsed.tables || []).map(async (t, index) => {
          // Keep the original alias from SQL to maintain join references
          const originalAlias = t.id || t.name;
          console.log(`📝 Preserving original alias: ${originalAlias} for table ${t.name}`);
          
          // Use the table ID (SQL alias) as the key for positioning
          const position = existingPositions.get(t.name) || smartPositions.get(t.id) || { x: 120, y: 120 };
          console.log(`📍 Position for table ${t.name} (ID: ${t.id}):`, position);
          
          let actualTable = { catalog: t.catalog, schema: t.schema, name: t.name };
          
          try {
            console.log(`📥 Fetching columns for ${t.catalog}.${t.schema}.${t.name}`);
            const cols = await fetchColumns(t.catalog, t.schema, t.name);
            const columns = cols.map(c => ({ 
              name: c.name, 
              dataType: c.dataType || 'STRING', 
              nullable: c.nullable !== false, 
              comment: c.comment 
            }));
            console.log(`✅ Got ${columns.length} columns for ${t.name}`);
            
            return {
              id: originalAlias,
              name: actualTable.name,
              schema: actualTable.schema,
              catalog: actualTable.catalog,
              columns,
              position
            };
          } catch (error) {
            console.warn(`⚠️ Failed to fetch columns for ${t.catalog}.${t.schema}.${t.name}:`, error);
            
            // If the table doesn't exist, try to find it in the catalog
            console.log(`🔍 Attempting to resolve table "${t.name}" in available catalogs...`);
            const resolvedTable = await findTableInCatalog(t.name);
            
            if (resolvedTable) {
              console.log(`✅ Resolved ${t.name} to ${resolvedTable.catalog}.${resolvedTable.schema}.${resolvedTable.name}`);
              actualTable = resolvedTable;
              
              // Add a subtle notification to inform user about table resolution
              console.info(`🔄 Auto-resolved table "${t.catalog}.${t.schema}.${t.name}" to "${resolvedTable.catalog}.${resolvedTable.schema}.${resolvedTable.name}"`);
              
              
              try {
                const cols = await fetchColumns(resolvedTable.catalog, resolvedTable.schema, resolvedTable.name);
                const columns = cols.map(c => ({ 
                  name: c.name, 
                  dataType: c.dataType || 'STRING', 
                  nullable: c.nullable !== false, 
                  comment: c.comment 
                }));
                console.log(`✅ Got ${columns.length} columns for resolved table ${resolvedTable.name}`);
                
                return {
                  id: originalAlias,
                  name: actualTable.name,
                  schema: actualTable.schema,
                  catalog: actualTable.catalog,
                  columns,
                  position
                };
              } catch (resolveError) {
                console.warn(`⚠️ Even resolved table failed to load columns:`, resolveError);
              }
            }
            
            // Still create the table but with error message
            return {
              id: originalAlias,
              name: actualTable.name,
              schema: actualTable.schema,
              catalog: actualTable.catalog,
              columns: [{ 
                name: '(table not found)', 
                dataType: 'ERROR', 
                nullable: true, 
                comment: `Table ${t.catalog}.${t.schema}.${t.name} does not exist. Check catalog and schema names.` 
              }],
              position
            };
          }
        })
      );
      
      // Since we're preserving original aliases, joins should work as-is
      const joins = (parsed.joins || []).map(j => {
        // Check if join is already in final format (from legacy parser)
        if (j.sourceTable && j.targetTable && j.sourceColumn && j.targetColumn) {
          console.log('✅ Using existing join:', j.id);
          return j;
        }
        
        // Raw parsed joins should now work directly since we kept original aliases
        console.log('🔗 Using join as-is with preserved aliases:', j);
        return {
          id: j.id,
          sourceTable: j.sourceTable,
          targetTable: j.targetTable,
          sourceColumn: j.sourceColumn,
          targetColumn: j.targetColumn,
          joinType: j.joinType
        };
      });
      
      const selectedColumns = (parsed.selectedColumns || []).map(s => {
        return { 
          id: s.id, 
          table: s.table, 
          column: s.column, 
          alias: s.alias 
        };
      });

      // Mark tables as imported to prevent auto-regeneration
      const importedTables = tablesWithColumns.map(t => ({ ...t, isImported: true }));
      
      console.log('🎯 Dispatching to state:');
      console.log('📊 Tables with positions:', importedTables.map(t => ({ 
        id: t.id, 
        name: t.name, 
        position: t.position,
        catalog: t.catalog,
        schema: t.schema
      })));
      console.log('🔗 Joins:', joins.map(j => ({ id: j.id, sourceTable: j.sourceTable, targetTable: j.targetTable, sourceColumn: j.sourceColumn, targetColumn: j.targetColumn })));
      console.log('📝 Selected columns:', selectedColumns.length);
      
      dispatch({ type: 'SET_FROM_PARSED_SQL', payload: { tables: importedTables, joins, selectedColumns } });
      
      // Keep the original SQL instead of auto-generating new SQL
      // The SQL editor already has the correct imported SQL
      console.log('✅ Applied SQL to canvas, preserving original SQL');
      
          } catch (error) {
        console.error('❌ Failed to apply SQL to canvas:', error);
        
        // Show user-friendly error message with helpful suggestions
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        let helpText = `Failed to sync SQL to canvas:\n\n${errorMessage}\n\nPlease check that your SQL query:\n- Has a valid FROM clause with table names\n- Uses supported SQL syntax\n- References tables that exist in your catalog`;
        
        // If the error is about missing tables, suggest using the catalog browser
        if (errorMessage.includes('does not exist') || errorMessage.includes('not found')) {
          helpText += `\n\nTip: Use the Catalog Explorer on the left to browse available tables, or try these common samples:\n- samples.tpch.customer\n- samples.tpch.orders\n- samples.tpch.lineitem`;
        }
        
        alert(helpText);
        
      } finally {
      // Re-enable auto-generation after a longer delay to ensure import is complete
      setTimeout(() => {
        console.log('🔓 Re-enabling auto-generation after import');
        setIsApplyingSql(false);
      }, 2000); // Longer delay to ensure no interference
    }
  }, [state.tables]);

  // Smart auto-execute with debounce and preview LIMIT for all queries (joins included)
  useEffect(() => {
    if (!state.sqlQuery.trim()) return;
    if (state.tables.length === 0) return; // no tables -> skip
    
    const timeoutId = setTimeout(() => {
      executeQuery(true); // Preview mode adds LIMIT to protect the warehouse
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [state.sqlQuery, state.tables.length]);

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
      if (isPreview) {
        // Replace existing LIMIT with a safer preview limit, or append one
        const hasLimit = /\blimit\s+\d+\b/i.test(queryToExecute);
        if (hasLimit) {
          queryToExecute = queryToExecute.replace(/\blimit\s+\d+\b/gi, 'LIMIT 100');
        } else {
        queryToExecute = `${queryToExecute}\nLIMIT 100`;
        }
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

  // Simple SWR-style in-memory cache
  const cacheRef = React.useRef<Map<string, ProfileCacheEntry>>(new Map());
  const inflightRef = React.useRef<Map<string, Promise<DataProfile>>>(new Map());

  const makeKey = (tableId: string, columnId?: string, mode: ProfileMode = 'fast') => `${tableId}::${columnId || ''}::${mode}`;

  const getTtl = (mode: ProfileMode) => (mode === 'fast' ? 10 * 60 * 1000 : mode === 'standard' ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000);

  const loadDataProfile = useCallback(async (table: string, column?: string, mode: ProfileMode = 'fast') => {
    dispatch({ type: 'SET_LOADING_PROFILE', payload: true });
    
    try {
      // Parse table ID to get catalog, schema, table parts
      const parts = table.split('.');
      if (parts.length < 3) {
        throw new Error('Invalid table format. Expected: catalog.schema.table');
      }
      
      const [catalog, schema, tableName] = parts;
      
      let profile: DataProfile;
      
      // SWR: return cached immediately if fresh, then refresh in background
      const key = makeKey(`${catalog}.${schema}.${tableName}`, column ? `${catalog}.${schema}.${tableName}.${column}` : undefined, mode);
      const cached = cacheRef.current.get(key);
      const now = Date.now();
      const ttl = getTtl(mode);
      if (cached && cached.updatedAt && (now - cached.updatedAt) < cached.ttlMs && cached.data) {
        dispatch({ type: 'SET_DATA_PROFILE', payload: cached.data });
        dispatch({ type: 'SET_LOADING_PROFILE', payload: false });
        // Fire background refresh but don't await
        setTimeout(() => loadDataProfile(table, column, mode), 0);
        return;
      }

      // Deduplicate in-flight
      if (inflightRef.current.has(key)) {
        await inflightRef.current.get(key);
        const refreshed = cacheRef.current.get(key)?.data || null;
        dispatch({ type: 'SET_DATA_PROFILE', payload: refreshed });
        return;
      }
      
      const p = (async () => {
      if (column) {
        // Get column profile
        const columnParts = column.split('.');
        const columnName = columnParts[columnParts.length - 1]; // Get just the column name
        console.log(`Loading column profile for: ${catalog}.${schema}.${tableName}.${columnName}`);
        profile = await getColumnProfile(catalog, schema, tableName, columnName);
      } else {
        // Get table profile
        console.log(`Loading table profile for: ${catalog}.${schema}.${tableName}`);
          profile = await getTableProfile(catalog, schema, tableName, mode);
        }
        return profile;
      })();

      inflightRef.current.set(key, p);
      profile = await p;
      inflightRef.current.delete(key);
      
      cacheRef.current.set(key, {
        key,
        mode,
        data: profile,
        status: 'fresh',
        updatedAt: Date.now(),
        ttlMs: ttl
      });
      
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
    <QueryBuilderContext.Provider value={{ state, dispatch, executeQuery, cancelQuery, loadDataProfile, applySqlToCanvas }}>
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
