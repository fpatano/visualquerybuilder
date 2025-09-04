import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DBSQLClient } from '@databricks/sql';
import { getUserToken, getDatabricksHost, getDatabricksHttpPath, isDatabricksApps } from './src/utils/auth-utils.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate authentication environment on startup
import { validateAuthEnvironment, logAuthEnvironment } from './src/utils/auth-utils.js';

// Import local catalog services
// Bootstrap catalog approach - no additional services needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.DATABRICKS_APP_PORT || 8000);

// Trust proxy for Databricks deployment
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Bootstrap catalog approach - no local catalog services needed
console.log('🚀 Using bootstrap catalog approach');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to detect Databricks Apps requests
app.use((req, res, next) => {
  // Check if this is a Databricks Apps request
  req.isDatabricksApps = isDatabricksApps();
  
  // Log request details for debugging
  console.log(`🔍 ${req.method} ${req.path}`);
  console.log(`  - Databricks Apps: ${req.isDatabricksApps}`);
  console.log(`  - Headers: ${Object.keys(req.headers).filter(h => h.startsWith('x-forwarded-')).join(', ')}`);
  console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - DATABRICKS_SERVER_HOSTNAME: ${process.env.DATABRICKS_SERVER_HOSTNAME || 'not set'}`);
  console.log(`  - DATABRICKS_APP_PORT: ${process.env.DATABRICKS_APP_PORT || 'not set'}`);
  
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health endpoint - required for Databricks Apps
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    databricksApps: req.isDatabricksApps
  });
});

// Readiness endpoint - required for Databricks Apps
app.get('/ready', (req, res) => {
  res.json({ 
    ready: true, 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    databricksApps: req.isDatabricksApps
  });
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID,
    databricksHost: process.env.DATABRICKS_SERVER_HOSTNAME || process.env.DATABRICKS_HOST,
    workspaceId: process.env.DATABRICKS_WORKSPACE_ID,
    environment: req.isDatabricksApps ? 'databricks-apps' : 'local'
  });
});

// Warehouse status endpoint
app.post('/api/warehouse/status', async (req, res) => {
  try {
    if (!req.isDatabricksApps) {
      // Local development - use personal access token
      const localToken = process.env.DATABRICKS_TOKEN;
      if (!localToken) {
        return res.json({ status: 'UNKNOWN', message: 'DATABRICKS_TOKEN required for local development' });
      }
      
      const host = process.env.DATABRICKS_HOST;
      if (!host) {
        return res.json({ status: 'UNKNOWN', message: 'DATABRICKS_HOST required for local development' });
      }
      
      // Use Databricks REST API to check warehouse status
      const response = await fetch(`${host}/api/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`, {
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Warehouse status check failed: ${response.status}`);
      }

      const warehouse = await response.json();
      res.json({ 
        status: warehouse.state || 'UNKNOWN',
        message: `Warehouse ${warehouse.name} is ${warehouse.state}`,
        warehouse: warehouse
      });
      return;
    }

    // Databricks Apps - use forwarded user token
    const userToken = await getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks REST API to check warehouse status
    const response = await fetch(`${host}/api/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Warehouse status check failed: ${response.status}`);
    }

    const warehouse = await response.json();
    res.json({ 
      status: warehouse.state || 'UNKNOWN',
      message: `Warehouse ${warehouse.name} is ${warehouse.state}`,
      warehouse: warehouse
    });
  } catch (error) {
    console.error('Warehouse status check failed:', error);
    res.json({ 
      status: 'UNKNOWN', 
      message: 'Unable to determine warehouse status',
      error: error.message
    });
  }
});

// Auto-start warehouse endpoint
app.post('/api/warehouse/start', async (req, res) => {
  try {
    if (!req.isDatabricksApps) {
      // Local development - use personal access token
      const localToken = process.env.DATABRICKS_TOKEN;
      if (!localToken) {
        return res.status(500).json({ error: 'DATABRICKS_TOKEN required for local development' });
      }
      
      const host = process.env.DATABRICKS_HOST;
      if (!host) {
        return res.status(500).json({ error: 'DATABRICKS_HOST required for local development' });
      }
      
      // Start the warehouse
      const response = await fetch(`${host}/api/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to start warehouse: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      res.json({ 
        success: true,
        message: 'Warehouse start command sent successfully',
        status: 'STARTING'
      });
      return;
    }

    // Databricks Apps - use forwarded user token
    const userToken = await getUserToken(req);
    const host = getDatabricksHost();
    
    // Start the warehouse
    const response = await fetch(`${host}/api/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to start warehouse: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    res.json({ 
      success: true,
      message: 'Warehouse start command sent successfully',
      status: 'STARTING'
    });
  } catch (error) {
    console.error('Failed to start warehouse:', error);
    res.status(500).json({ 
      error: 'Failed to start warehouse',
      message: error.message 
    });
  }
});

// Wait for warehouse to be ready endpoint
app.post('/api/warehouse/wait-ready', async (req, res) => {
  try {
    const { timeout = 300 } = req.body; // Default 5 minutes timeout
    const startTime = Date.now();
    
    if (!req.isDatabricksApps) {
      // Local development - use personal access token
      const localToken = process.env.DATABRICKS_TOKEN;
      if (!localToken) {
        return res.status(500).json({ error: 'DATABRICKS_TOKEN required for local development' });
      }
      
      const host = process.env.DATABRICKS_HOST;
      if (!host) {
        return res.status(500).json({ error: 'DATABRICKS_HOST required for local development' });
      }
      
      // Poll warehouse status until ready
      while (Date.now() - startTime < timeout * 1000) {
        const response = await fetch(`${host}/api/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`, {
          headers: {
            'Authorization': `Bearer ${localToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Warehouse status check failed: ${response.status}`);
        }

        const warehouse = await response.json();
        
        if (warehouse.state === 'RUNNING') {
          return res.json({ 
            success: true,
            status: 'RUNNING',
            message: `Warehouse ${warehouse.name} is ready`,
            warehouse: warehouse,
            waitTime: Date.now() - startTime
          });
        }
        
        if (warehouse.state === 'STOPPED' || warehouse.state === 'FAILED') {
          throw new Error(`Warehouse failed to start: ${warehouse.state}`);
        }
        
        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      throw new Error(`Warehouse did not become ready within ${timeout} seconds`);
    }

    // Databricks Apps - use forwarded user token
    const userToken = await getUserToken(req);
    const host = getDatabricksHost();
    
    // Poll warehouse status until ready
    while (Date.now() - startTime < timeout * 1000) {
      const response = await fetch(`${host}/api/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Warehouse status check failed: ${response.status}`);
      }

      const warehouse = await response.json();
      
      if (warehouse.state === 'RUNNING') {
        return res.json({ 
          success: true,
          status: 'RUNNING',
          message: `Warehouse ${warehouse.name} is ready`,
          warehouse: warehouse,
          waitTime: Date.now() - startTime
        });
      }
      
      if (warehouse.state === 'STOPPED' || warehouse.state === 'FAILED') {
        throw new Error(`Warehouse failed to start: ${warehouse.state}`);
      }
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`Warehouse did not become ready within ${timeout} seconds`);
  } catch (error) {
    console.error('Failed to wait for warehouse:', error);
    res.status(500).json({ 
      error: 'Failed to wait for warehouse',
      message: error.message 
    });
  }
});

// OLD UC API endpoints removed - using bootstrap approach instead

// OLD UC API endpoints removed - using bootstrap approach instead

// NEW: Bootstrap endpoint to replace all UC API calls
app.get('/api/catalog/bootstrap', async (req, res) => {
  try {
    console.log('🚀 Bootstrapping complete catalog metadata...');
    
    // Execute simplified catalog query using warehouse API
    const catalogQuery = `
      SELECT 
        catalog_name,
        schema_name,
        table_name,
        column_name,
        data_type,
        is_nullable,
        ordinal_position
      FROM system.information_schema.columns
      WHERE catalog_name NOT IN ('system', 'information_schema')
        AND schema_name NOT IN ('information_schema')
      ORDER BY catalog_name, schema_name, table_name, ordinal_position
    `;
    
    // Execute via warehouse API (not UC API)
    const warehouse_id = process.env.DATABRICKS_WAREHOUSE_ID;
    if (!warehouse_id) {
      throw new Error('DATABRICKS_WAREHOUSE_ID not configured');
    }
    
    // Use existing SQL execution infrastructure
    const token = req.isDatabricksApps ? await getUserToken(req) : process.env.DATABRICKS_TOKEN;
    const response = await fetch(`${getDatabricksHost()}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statement: catalogQuery,
        warehouse_id,
        wait_timeout: '50s', // Maximum allowed timeout for bootstrap
        disposition: 'INLINE'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Bootstrap query failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Bootstrap query executed successfully');
    console.log('🔍 Result structure:', JSON.stringify(result.result, null, 2));
    
    // Transform nested result to flat catalog structure for frontend compatibility
    const catalog = transformBootstrapResult(result.result);
    
    res.json({ 
      catalog,
      metadata: {
        totalCatalogs: catalog.length,
        totalSchemas: catalog.reduce((sum, cat) => sum + cat.children.length, 0),
        totalTables: catalog.reduce((sum, cat) => 
          sum + cat.children.reduce((s, sch) => s + sch.children.length, 0), 0),
        loadedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Catalog bootstrap failed:', error);
    res.status(500).json({ 
      error: 'Failed to bootstrap catalog',
      message: error.message 
    });
  }
});

// Helper function to transform flat bootstrap result to hierarchical catalog structure
function transformBootstrapResult(result) {
  if (!result || !result.data_array) {
    console.log('🔍 No result or data_array found:', result);
    return [];
  }
  
  console.log('🔍 Processing data_array with', result.data_array.length, 'rows');
  const catalogMap = new Map();
  
  // Process the flat result structure
  result.data_array.forEach((row, index) => {
    const [catalogName, schemaName, tableName, columnName, dataType, isNullable, ordinalPosition] = row;
    
    // Create or get catalog
    if (!catalogMap.has(catalogName)) {
      catalogMap.set(catalogName, {
        id: catalogName,
        name: catalogName,
        type: 'catalog',
        children: []
      });
    }
    
    const catalogObj = catalogMap.get(catalogName);
    
    // Create or get schema
    let schemaObj = catalogObj.children.find(s => s.name === schemaName);
    if (!schemaObj) {
      schemaObj = {
        id: `${catalogName}.${schemaName}`,
        name: schemaName,
        type: 'schema',
        parent: catalogName,
        children: []
      };
      catalogObj.children.push(schemaObj);
    }
    
    // Create or get table
    let tableObj = schemaObj.children.find(t => t.name === tableName);
    if (!tableObj) {
      tableObj = {
        id: `${catalogName}.${schemaName}.${tableName}`,
        name: tableName,
        type: 'table',
        parent: `${catalogName}.${schemaName}`,
        children: []
      };
      schemaObj.children.push(tableObj);
    }
    
    // Add column if it doesn't exist
    const columnExists = tableObj.children.find(c => c.name === columnName);
    if (!columnExists) {
      tableObj.children.push({
        id: `${catalogName}.${schemaName}.${tableName}.${columnName}`,
        name: columnName,
        type: 'column',
        parent: `${catalogName}.${schemaName}.${tableName}`,
        dataType: dataType,
        nullable: isNullable === 'YES',
        ordinalPosition: parseInt(ordinalPosition)
      });
    }
  });
  
  return Array.from(catalogMap.values());
}

// Databricks SQL API 2.0 endpoints
app.post('/api/databricks/2.0/sql/statements', async (req, res) => {
  try {
    const { statement, warehouse_id, wait_timeout, disposition } = req.body;
    
    if (!statement || !warehouse_id) {
      return res.status(400).json({ error: 'statement and warehouse_id are required' });
    }

    if (!req.isDatabricksApps) {
      // Local development - use personal access token
      const localToken = process.env.DATABRICKS_TOKEN;
      if (!localToken) {
        return res.status(500).json({ error: 'DATABRICKS_TOKEN required for local development' });
      }
      
      const host = process.env.DATABRICKS_HOST;
      if (!host) {
        return res.status(500).json({ error: 'DATABRICKS_HOST required for local development' });
      }
      
      // Use Databricks SQL API 2.0 to execute statement
      const response = await fetch(`${host}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statement,
          warehouse_id,
          wait_timeout: wait_timeout || '30s',
          disposition: disposition || 'INLINE'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`SQL execution failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      res.json(result);
      return;
    }

    const userToken = await getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks SQL API 2.0 to execute statement
    const response = await fetch(`${host}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statement,
        warehouse_id,
        wait_timeout: wait_timeout || '30s',
        disposition: disposition || 'INLINE'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`SQL execution failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('SQL execution failed:', error);
    res.status(500).json({ 
      error: 'SQL execution failed',
      message: error.message 
    });
  }
});

app.get('/api/databricks/2.0/sql/statements/:statementId', async (req, res) => {
  try {
    const { statementId } = req.params;
    
    if (!req.isDatabricksApps) {
      // Local development - use personal access token
      const localToken = process.env.DATABRICKS_TOKEN;
      if (!localToken) {
        return res.status(500).json({ error: 'DATABRICKS_TOKEN required for local development' });
      }
      
      const host = process.env.DATABRICKS_HOST;
      if (!host) {
        return res.status(500).json({ error: 'DATABRICKS_HOST required for local development' });
      }
      
      // Use Databricks SQL API 2.0 to get statement status
      const response = await fetch(`${host}/api/2.0/sql/statements/${statementId}`, {
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Statement status check failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      res.json(result);
      return;
    }

    const userToken = await getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks SQL API 2.0 to get statement status
    const response = await fetch(`${host}/api/2.0/sql/statements/${statementId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Statement status check failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Statement status check failed:', error);
    res.status(500).json({ 
      error: 'Statement status check failed',
      message: error.message 
    });
  }
});

// Serve the React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server - bind to platform port correctly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Visual SQL Query Builder running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Databricks Host: ${process.env.DATABRICKS_SERVER_HOSTNAME || 'Not set'}`);
  console.log(`Warehouse ID: ${process.env.DATABRICKS_WAREHOUSE_ID || 'Not set'}`);
  console.log(`Static files served from: ${path.join(__dirname, 'dist')}`);
  console.log(`Databricks Apps Environment: ${isDatabricksApps() ? 'Yes' : 'No'}`);
  
  // Validate and log authentication environment
  try {
    validateAuthEnvironment();
    logAuthEnvironment();
  } catch (error) {
    console.error('❌ Authentication environment validation failed:', error.message);
    console.error('Please check your environment configuration');
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
