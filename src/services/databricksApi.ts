import axios from 'axios';
import { CatalogItem, QueryResult, DataProfile, ProfileMode } from '../types';

const API_BASE = '/api/databricks';

// Configure axios defaults - increased for large query processing
axios.defaults.timeout = 120000; // 2 minutes for complex queries

// Get warehouse ID from server config (no fallbacks)
let warehouseId: string | null = null;

async function getWarehouseId(): Promise<string> {
  if (!warehouseId) {
    const response = await axios.get('/api/config');
    warehouseId = response.data?.warehouseId || null;
  }
  if (!warehouseId) {
    throw new Error('DATABRICKS_WAREHOUSE_ID is not configured. Please set it in your environment.');
  }
  return warehouseId;
}

// Check and start warehouse if needed
async function ensureWarehouseRunning(): Promise<boolean> {
  try {
    const warehouse_id = await getWarehouseId();
    const statusResponse = await axios.get(`/api/databricks/2.0/sql/warehouses/${warehouse_id}`);
    
    const state = statusResponse.data.state;
    console.log(`🏭 Warehouse state: ${state}`);
    
    if (state === 'STOPPED') {
      console.log('🚀 Starting warehouse...');
      await axios.post(`/api/databricks/2.0/sql/warehouses/${warehouse_id}/start`);
      
      // Wait a moment for startup to begin
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return false; // Not immediately ready
    }
    
    return state === 'RUNNING';
  } catch (error) {
    console.warn('Failed to check warehouse status:', error);
    return false;
  }
}

export async function fetchCatalogMetadata(): Promise<CatalogItem[]> {
  try {
    console.log('Fetching catalogs from Databricks Unity Catalog...');
    
    // Only fetch catalogs initially - load schemas/tables lazily
    const catalogsResponse = await axios.get(`${API_BASE}/unity-catalog/catalogs`);
    console.log('Catalogs response:', catalogsResponse.data);
    
    const catalogs: CatalogItem[] = (catalogsResponse.data.catalogs || [])
      .filter((catalog: any) => catalog.name !== 'system') // Skip system catalog for performance
      .map((catalog: any) => ({
        id: catalog.name,
        name: catalog.name,
        type: 'catalog' as const,
        children: [], // Will be loaded lazily
        comment: catalog.comment,
        isLoaded: false // Track if children are loaded
      }));
    
    console.log('Successfully fetched catalog list:', catalogs.map(c => c.name));
    return catalogs;
    
  } catch (error) {
    console.error('Failed to fetch catalog metadata:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;
      throw new Error(`Unity Catalog list failed (${status}): ${msg}`);
    }
    throw error;
  }
}

export async function fetchSchemas(catalogName: string): Promise<CatalogItem[]> {
  try {
    console.log(`Fetching schemas for catalog: ${catalogName}`);
    const schemasResponse = await axios.get(`${API_BASE}/unity-catalog/schemas`, {
      params: { catalog_name: catalogName }
    });
    
    const schemas: CatalogItem[] = (schemasResponse.data.schemas || [])
      .filter((schema: any) => schema.name !== 'information_schema') // Skip information_schema for performance
      .map((schema: any) => ({
        id: `${catalogName}.${schema.name}`,
        name: schema.name,
        type: 'schema' as const,
        parent: catalogName,
        children: [], // Will be loaded lazily
        comment: schema.comment,
        isLoaded: false
      }));
    
    return schemas;
  } catch (error) {
    console.error(`Failed to fetch schemas for catalog ${catalogName}:`, error);
    return [];
  }
}

export async function fetchTables(catalogName: string, schemaName: string): Promise<CatalogItem[]> {
  try {
    console.log(`Fetching tables for schema: ${catalogName}.${schemaName}`);
    const tablesResponse = await axios.get(`${API_BASE}/unity-catalog/tables`, {
      params: { 
        catalog_name: catalogName,
        schema_name: schemaName 
      }
    });
    
    const tables: CatalogItem[] = (tablesResponse.data.tables || []).map((table: any) => ({
      id: `${catalogName}.${schemaName}.${table.name}`,
      name: table.name,
      type: 'table' as const,
      parent: `${catalogName}.${schemaName}`,
      children: [], // Will be loaded lazily
      comment: table.comment,
      isLoaded: false
    }));
    
    return tables;
  } catch (error) {
    console.error(`Failed to fetch tables for schema ${catalogName}.${schemaName}:`, error);
    return [];
  }
}

export async function fetchColumns(catalogName: string, schemaName: string, tableName: string): Promise<CatalogItem[]> {
  try {
    console.log(`Fetching columns for table: ${catalogName}.${schemaName}.${tableName}`);
    const columnsResponse = await axios.get(`${API_BASE}/unity-catalog/tables/${catalogName}.${schemaName}.${tableName}`);
    
    const columns: CatalogItem[] = (columnsResponse.data.columns || []).map((col: any) => ({
      id: `${catalogName}.${schemaName}.${tableName}.${col.name}`,
      name: col.name,
      type: 'column' as const,
      parent: `${catalogName}.${schemaName}.${tableName}`,
      dataType: col.type_name || col.data_type || 'STRING',
      nullable: col.nullable !== false,
      comment: col.comment,
      children: []
    }));
    
    return columns;
  } catch (error) {
    console.error(`Failed to fetch columns for table ${catalogName}.${schemaName}.${tableName}:`, error);
    return [];
  }
}

export async function executeDatabricksQuery(sql: string, opts?: { signal?: AbortSignal }): Promise<QueryResult> {
  try {
    console.log('Executing SQL query:', sql);
    
    const startTime = Date.now();
    
    // Check warehouse status and start if needed
    const isRunning = await ensureWarehouseRunning();
    if (!isRunning) {
      return {
        columns: ['Status'],
        rows: [['⏳ SQL Warehouse is starting up. Please wait a moment and try again.']],
        executionTime: 0,
        rowCount: 1,
        error: 'Warehouse starting up'
      };
    }
    
    // Execute SQL via Databricks SQL Warehouse (API 2.0)
    const warehouse_id = await getWarehouseId();
    const response = await axios.post(`/api/databricks/2.0/sql/statements`, {
      statement: sql,
      warehouse_id,
      wait_timeout: '30s', // allowed 5-50s; 30s is a balanced default
      disposition: 'INLINE'
    }, { signal: opts?.signal });

    const executionTime = Date.now() - startTime;
    const requestId = (response.headers as any)?.['x-request-id'] || response.data?.status?.request_id;

    // Transform Databricks response to our format (server assembles EXTERNAL_LINKS)
    const result = response.data?.result;
    if (!result) {
      // Try direct poll via backend passthrough (server polls if needed)
      const retry = await axios.post(`/api/databricks/2.0/sql/statements`, {
        statement: sql,
        warehouse_id,
        wait_timeout: '30s',
        disposition: 'EXTERNAL_LINKS'
      }, { signal: opts?.signal });
      if (!retry.data?.result) throw new Error('No result returned from query');
      const r2 = retry.data.result;
      const columnsFromManifest2: string[] = r2.manifest?.schema?.columns?.map((c: any) => c.name) || [];
      const rows2: any[][] = Array.isArray(r2.data_array) ? r2.data_array : [];
      const executionTime2 = Date.now() - startTime;
      const requestId2 = (retry.headers as any)?.['x-request-id'] || retry.data?.status?.request_id;
      return {
        columns: columnsFromManifest2,
        rows: rows2,
        executionTime: executionTime2,
        rowCount: typeof r2.row_count === 'number' ? r2.row_count : rows2.length,
        metadata: { requestId: requestId2 }
      };
    }

    // Columns come from the manifest schema
    const columnsFromManifest: string[] = result.manifest?.schema?.columns?.map((c: any) => c.name) || [];

    // Expect server to provide data_array even when EXTERNAL_LINKS are used
    const rows: any[][] = Array.isArray(result.data_array) ? result.data_array : [];

    const resultObj: QueryResult = {
      columns: columnsFromManifest,
      rows,
      executionTime,
      rowCount: typeof result.row_count === 'number' ? result.row_count : rows.length,
      metadata: { requestId }
    };
    return resultObj;
    
  } catch (error) {
    console.error('Query execution failed:', error);
    
    // Log more details for debugging
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      if ((error as any).code === 'ERR_CANCELED') {
        return {
          columns: ['Status'],
          rows: [['🛑 Query cancelled']],
          executionTime: 0,
          rowCount: 0,
          error: 'Cancelled by user'
        };
      }
      
      // Handle specific Databricks errors
      if (errorData?.error_code === 'DEADLINE_EXCEEDED' || error.code === 'ECONNABORTED') {
        console.warn('Query timed out - warehouse may be starting up or query is too complex');
        return {
          columns: ['Status'],
          rows: [['⏳ Query timed out. Try simplifying the query or wait for warehouse to fully start.']],
          executionTime: 0,
          rowCount: 1,
          error: 'Query timeout - try a simpler query or wait for warehouse startup'
        };
      }
      
      if (errorData?.error_code === 'RESOURCE_DOES_NOT_EXIST') {
        return {
          columns: ['Error'],
          rows: [['❌ SQL Warehouse not found. Please check your warehouse configuration.']],
          executionTime: 0,
          rowCount: 1,
          error: 'Warehouse not found'
        };
      }
      
      if (errorData?.error_code) {
        return {
          columns: ['Error'],
          rows: [[`❌ Databricks Error: ${errorData.error_code} - ${errorData.message || 'Unknown error'}`]],
          executionTime: 0,
          rowCount: 1,
          error: errorData.error_code
        };
      }
      
      // Do not return mock data; surface actual error for clarity
    }
    
    // Generic error fallback
    let errorMessage = 'Unknown error';
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.response?.statusText || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      columns: ['Error'],
      rows: [[`❌ Query failed: ${errorMessage}`]],
      executionTime: 0,
      rowCount: 1,
      error: errorMessage
    };
  }
}

export async function getTableProfile(catalog: string, schema: string, table: string, mode: ProfileMode = 'fast'): Promise<DataProfile> {
  try {
    console.log(`📊 Simplified table profiling: ${catalog}.${schema}.${table}`);
    
    const tableRef = `${catalog}.${schema}.${table}`;
    
    // Progressive profiling depending on mode
    console.log(`⚡ Profiling mode: ${mode}`);
    
    // Only do the absolutely essential metadata query that should work instantly
    let columnCount = 0;
    let dataTypes: { [key: string]: number } = {};
    
    // Minimal metrics only: just row count
    try {
      const catalogColumns = await axios.get(`${API_BASE}/unity-catalog/tables/${catalog}.${schema}.${table}`);
      const columns = catalogColumns.data.columns || [];
      columnCount = columns.length;
    } catch {}
    let totalRows = 0;
    try {
      const countResult = await executeDatabricksQuery(`SELECT COUNT(*) AS cnt FROM ${catalog}.${schema}.${table}`);
      const v = Number(countResult.rows?.[0]?.[0]);
      if (!Number.isNaN(v)) totalRows = v;
    } catch (e) {
      console.warn('COUNT(*) failed; showing 0 until run succeeds');
    }

    const distribution = undefined;
    
    return {
      totalRows,
      nullCount: 0,
      uniqueCount: 0,
      dataType: 'TABLE',
      sampleValues: [],
      distribution,
      metadata: {
        columnCount: columnCount,
        nullableColumns: 0,
        tableSize: 'Unknown',
        lastUpdated: 'Unknown',
        profilingMethod: 'Minimal: COUNT(*)',
        isApproximate: false,
        performanceNote: 'Minimal profiling enabled',
        mode: 'fast',
        updatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('❌ Table profiling failed:', error);
    
    return {
      totalRows: 0,
      nullCount: 0,
      uniqueCount: 0,
      dataType: 'TABLE',
      sampleValues: [],
      distribution: { 'error': 1 },
      metadata: {
        columnCount: 0,
        nullableColumns: 0,
        tableSize: 'Unknown',
        lastUpdated: 'Unknown',
        profilingMethod: 'Failed',
        isApproximate: true,
        performanceNote: 'Failed to access table metadata - check permissions'
      }
    };
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Enterprise function: Execute optimized table preview queries
export async function getTablePreview(catalog: string, schema: string, table: string, method: 'limit' | 'sample' = 'limit'): Promise<QueryResult> {
  const tableRef = `${catalog}.${schema}.${table}`;
  
  let query: string;
  if (method === 'sample') {
    // For large tables: random sampling
    query = `SELECT * FROM ${tableRef} TABLESAMPLE (10 ROWS)`;
  } else {
    // Standard approach: first 10 rows
    query = `SELECT * FROM ${tableRef} LIMIT 10`;
  }
  
  console.log(`🔍 Table preview (${method}): ${tableRef}`);
  return executeDatabricksQuery(query);
}

export async function getColumnProfile(catalog: string, schema: string, table: string, column: string): Promise<DataProfile> {
  try {
    console.log(`🎯 Enterprise column profiling: ${catalog}.${schema}.${table}.${column}`);
    
    const tableRef = `${catalog}.${schema}.${table}`;
    const columnRef = `\`${column}\``;  // Escape column name
    
    // Minimal stats: total rows and null count and approximate distinct
    const essentialStatsQuery = `
      SELECT 
        COUNT(*) AS total_rows,
        SUM(CASE WHEN ${columnRef} IS NULL THEN 1 ELSE 0 END) AS null_count,
        APPROX_COUNT_DISTINCT(${columnRef}) AS approx_unique
      FROM ${tableRef}
    `;
    const statsResult = await executeDatabricksQuery(essentialStatsQuery);
    const [totalRows, nullCount, approxUnique] = statsResult.rows[0] || [0, 0, 0];
    
    // STEP 2: Get column data type from metadata (instant)
    const columnInfoQuery = `
      SELECT data_type 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE table_catalog = '${catalog}' 
        AND table_schema = '${schema}' 
        AND table_name = '${table}'
        AND column_name = '${column}'
    `;
    
    let dataType = 'UNKNOWN';
    try {
      const columnInfoResult = await executeDatabricksQuery(columnInfoQuery);
      dataType = columnInfoResult.rows[0]?.[0] || 'UNKNOWN';
    } catch (e) {
      console.warn('Failed to get column data type:', e);
    }
    
    // STEP 3: Type-specific profiling based on data type
    const numericTypes = ['tinyint','smallint','int','integer','bigint','float','double','real','decimal','numeric'];
    const isNumeric = numericTypes.some(type => dataType.toLowerCase().includes(type));
    const isString = dataType.toLowerCase().includes('string') || dataType.toLowerCase().includes('varchar');
    const isDate = dataType.toLowerCase().includes('date') || dataType.toLowerCase().includes('timestamp');
    
    let min: any = null;
    let max: any = null; 
    let avg: any = null;
    let stddev: any = null;
    let percentiles: any = undefined;
    let distribution: { [key: string]: number } | undefined;
    
    // NUMERIC COLUMNS: min, max, avg, sum
    if (isNumeric) {
      try {
        console.log('📊 Computing numeric stats: min/max/avg/sum');
        const numericStatsQuery = `
          SELECT 
            MIN(${columnRef}) AS min_val, 
            MAX(${columnRef}) AS max_val, 
            AVG(${columnRef}) AS avg_val,
            SUM(${columnRef}) AS sum_val
          FROM ${tableRef}
        `;
        const numericResult = await executeDatabricksQuery(numericStatsQuery);
        const row = numericResult.rows[0] || [];
        min = row[0] ?? null; max = row[1] ?? null; avg = row[2] ?? null; const sum = row[3] ?? null;
        // repurpose stddev for now to show sum in minimal mode UI, or add as separate field in metadata
        percentiles = undefined;
        stddev = undefined;
        // attach sum to metadata for display
        if (!statsResult.metadata) statsResult.metadata = {} as any;
        (statsResult.metadata as any).sum = sum;
      } catch (e) {
        console.warn('Failed to compute numeric stats:', e);
      }
    }
    
    // STRING COLUMNS: length and approx distinct
    let lengthAvg: number | undefined = undefined;
    if (isString) {
      try {
        const lengthQuery = `SELECT AVG(length(${columnRef})) AS len_avg FROM ${tableRef}`;
        const lenRes = await executeDatabricksQuery(lengthQuery);
        lengthAvg = Number(lenRes.rows?.[0]?.[0]) || undefined;
      } catch (e) {
        console.warn('Failed to compute average length:', e);
      }
    }
    
    
    return {
      totalRows: Number(totalRows) || 0,
      nullCount: Number(nullCount) || 0,
      uniqueCount: Number(approxUnique) || 0,
      dataType: dataType || 'UNKNOWN',
      sampleValues: [], // Sample data moved to query results pane
      distribution,
      min,
      max,
      mean: avg,
      metadata: {
        isApproximate: true,
        profilingMethod: 'Minimal: null count, distinct, numeric summary or string length',
        performanceNote: 'Minimal profiling enabled'
      }
    };
    
  } catch (error) {
    console.error('Failed to get column profile:', error);
    
    // Fallback profile
    return {
      totalRows: 0,
      nullCount: 0,
      uniqueCount: 0,
      dataType: 'UNKNOWN',
      sampleValues: ['Unable to profile column - check permissions'],
      distribution: { 'error': 1 }
    };
  }
}
