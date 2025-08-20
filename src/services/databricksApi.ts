import axios from 'axios';
import { CatalogItem, QueryResult, DataProfile } from '../types';

const API_BASE = '/api/databricks';

// Configure axios defaults - increased for large query processing
axios.defaults.timeout = 120000; // 2 minutes for complex queries

// Get warehouse ID from server config
let warehouseId: string | null = null;

async function getWarehouseId(): Promise<string> {
  if (!warehouseId) {
    try {
      const response = await axios.get('/api/config');
      warehouseId = response.data.warehouseId;
    } catch (error) {
      console.warn('Failed to get warehouse ID from config, using default');
      warehouseId = 'a274378bae39d2e1'; // fallback
    }
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
      console.error('API Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        throw new Error('Databricks authentication failed. Please check your token.');
      }
      if (error.response?.status === 403) {
        throw new Error('Access denied. Please check your Unity Catalog permissions.');
      }
    }
    
    return [];
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
      wait_timeout: '30s', // Maximum allowed by Databricks (5-50s range)
      disposition: 'EXTERNAL_LINKS'
    }, { signal: opts?.signal });

    const executionTime = Date.now() - startTime;
    const requestId = (response.headers as any)?.['x-request-id'] || response.data?.status?.request_id;
    
    // Transform Databricks response to our format
    const result = response.data.result;
    if (!result) {
      throw new Error('No result returned from query');
    }

    const resultObj: QueryResult = {
      columns: result.data_array?.[0] || [],
      rows: result.data_array?.slice(1) || [],
      executionTime,
      rowCount: result.row_count || 0,
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
      
      // Handle HTTP errors
      if (error.response?.status === 404 || error.response?.status === 500) {
        console.warn('Falling back to mock data for development');
        return {
          columns: ['Note'],
          rows: [['🔧 SQL execution not available - configure DATABRICKS_WAREHOUSE_ID']],
          executionTime: 100,
          rowCount: 1,
          error: 'SQL warehouse not configured'
        };
      }
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

export async function getTableProfile(catalog: string, schema: string, table: string): Promise<DataProfile> {
  try {
    console.log(`📊 Simplified table profiling: ${catalog}.${schema}.${table}`);
    
    const tableRef = `${catalog}.${schema}.${table}`;
    
    // SIMPLIFIED APPROACH: Just get metadata, skip complex queries for now
    console.log('⚡ Using metadata-only profiling due to warehouse warm-up');
    
    // Only do the absolutely essential metadata query that should work instantly
    let columnCount = 0;
    let dataTypes: { [key: string]: number } = {};
    
    // PRIMARY: Try Unity Catalog first - it's always fast and reliable
    try {
      console.log('📋 Using Unity Catalog API for reliable profiling');
      const catalogColumns = await axios.get(`${API_BASE}/unity-catalog/tables/${catalog}.${schema}.${table}`);
      const columns = catalogColumns.data.columns || [];
      columnCount = columns.length;
      
      // Create data type distribution from Unity Catalog schema
      const typeDistribution: { [key: string]: number } = {};
      columns.forEach((col: any) => {
        const dataType = col.type_name?.toLowerCase() || 'unknown';
        const baseType = dataType.split('(')[0]; // Remove precision/scale info
        typeDistribution[baseType] = (typeDistribution[baseType] || 0) + 1;
      });
      
      dataTypes = typeDistribution;
      console.log(`✅ Unity Catalog: Found ${columnCount} columns with types:`, Object.keys(dataTypes).join(', '));
      
    } catch (unityError) {
      console.warn('Unity Catalog failed, trying INFORMATION_SCHEMA as fallback');
      
      // FALLBACK: Only try SQL if Unity Catalog fails
      try {
        const columnMetadata = await executeDatabricksQuery(`
          SELECT COUNT(*) as column_count
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${table}'
            AND TABLE_SCHEMA = '${schema}'
            AND TABLE_CATALOG = '${catalog}'
        `);
        
        // Check if the query actually succeeded (no error property)
        if (columnMetadata && !columnMetadata.error && columnMetadata.rows.length > 0) {
          columnCount = Number(columnMetadata.rows[0][0]) || 0;
          dataTypes = { 'information_schema': columnCount };
          console.log(`✅ INFORMATION_SCHEMA fallback: Found ${columnCount} columns`);
        } else {
          // Query returned but had errors or no results
          console.warn('INFORMATION_SCHEMA query failed or returned no results:', columnMetadata?.error);
          throw new Error('SQL query failed');
        }
      } catch (sqlError) {
        console.warn('Both Unity Catalog and INFORMATION_SCHEMA failed, using minimal profile');
        columnCount = 0;
        dataTypes = { 'unavailable': 1 };
      }
    }
    
    console.log(`📈 Simplified table profile: 0 rows (not computed), ${columnCount} columns`);
    
    // Return simplified profile - no expensive row counting for now
    const distribution = Object.keys(dataTypes).length > 0 ? dataTypes : { 'metadata_only': 1 };
    
    return {
      totalRows: 0, // Skip expensive row counting during warehouse warmup
      nullCount: 0,
      uniqueCount: 0,
      dataType: 'TABLE',
      sampleValues: [],
      distribution,
      metadata: {
        columnCount: columnCount,
        nullableColumns: 0,
        tableSize: 'Not computed (warehouse warming up)',
        lastUpdated: 'Unknown',
        profilingMethod: columnCount > 0 ? 'Unity Catalog API (fast)' : 'Minimal profile',
        isApproximate: false,
        performanceNote: columnCount > 0 ? '⚡ Fast profiling via Unity Catalog metadata' : '⚠️ Limited data available'
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
    
    // STEP 1: Essential stats in one optimized query (recommended approach)
    const essentialStatsQuery = `
      SELECT 
        COUNT(*) AS total_rows,
        SUM(CASE WHEN ${columnRef} IS NULL THEN 1 ELSE 0 END) AS null_count,
        100.0 * SUM(CASE WHEN ${columnRef} IS NULL THEN 1 ELSE 0 END) / COUNT(*) AS null_pct,
        APPROX_COUNT_DISTINCT(${columnRef}) AS approx_unique
      FROM ${tableRef}
    `;
    
    console.log('🔥 Computing null% and approximate uniqueness');
    const statsResult = await executeDatabricksQuery(essentialStatsQuery);
    const [totalRows, nullCount, nullPct, approxUnique] = statsResult.rows[0] || [0, 0, 0, 0];
    
    console.log(`🔍 Column stats raw result:`, {
      query: essentialStatsQuery,
      result: statsResult.rows[0],
      totalRows, nullCount, nullPct, approxUnique
    });
    
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
    const numericTypes = ['int', 'bigint', 'float', 'double', 'decimal', 'numeric'];
    const isNumeric = numericTypes.some(type => dataType.toLowerCase().includes(type));
    const isString = dataType.toLowerCase().includes('string') || dataType.toLowerCase().includes('varchar');
    const isDate = dataType.toLowerCase().includes('date') || dataType.toLowerCase().includes('timestamp');
    
    let min: any = null;
    let max: any = null; 
    let avg: any = null;
    let distribution: { [key: string]: number } | undefined;
    
    // NUMERIC COLUMNS: Get min, max, average (enterprise requirement)
    if (isNumeric) {
      try {
        console.log('📊 Computing numeric stats: min/max/avg');
        const numericStatsQuery = `
          SELECT 
            MIN(${columnRef}) AS min_val, 
            MAX(${columnRef}) AS max_val, 
            AVG(${columnRef}) AS avg_val 
          FROM ${tableRef}
        `;
        const numericResult = await executeDatabricksQuery(numericStatsQuery);
        [min, max, avg] = numericResult.rows[0] || [null, null, null];
      } catch (e) {
        console.warn('Failed to compute numeric stats:', e);
      }
    }
    
    // CATEGORICAL/DATE COLUMNS: Top-N frequency (enterprise requirement)
    if (isString || isDate) {
      try {
        console.log('📈 Computing top-10 frequency distribution');
        const topValuesQuery = `
          SELECT ${columnRef} AS value, COUNT(*) AS freq 
          FROM ${tableRef} 
          WHERE ${columnRef} IS NOT NULL 
          GROUP BY ${columnRef} 
          ORDER BY freq DESC 
          LIMIT 10
        `;
        const topResult = await executeDatabricksQuery(topValuesQuery);
        distribution = {};
        topResult.rows.forEach(([value, freq]) => {
          distribution![String(value)] = Number(freq);
        });
      } catch (e) {
        console.warn('Failed to compute frequency distribution:', e);
      }
    }
    
    
    console.log(`🎯 Column profile complete: ${nullPct?.toFixed(1) || 0}% null, ~${approxUnique || 0} unique values`);
    
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
        nullPercentage: Number(nullPct) || 0,
        isApproximate: true, // APPROX_COUNT_DISTINCT is approximate
        profilingMethod: 'Enterprise: null%/unique/min/max/avg/top-N',
        performanceNote: 'Optimized for large tables. Uniqueness is approximate. Sample data in query results.'
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
