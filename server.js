import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DBSQLClient } from '@databricks/sql';
import { getUserToken, getDatabricksHost, getDatabricksHttpPath, isDatabricksApps } from './src/utils/auth-utils.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.DATABRICKS_APP_PORT || 8000);

// Trust proxy for Databricks deployment
app.set('trust proxy', 1);
app.disable('x-powered-by');

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

    const userToken = getUserToken(req);
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

// Unity Catalog API endpoints with real Databricks implementation
app.get('/api/unity-catalog/catalogs', async (req, res) => {
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
      
      // Use Databricks REST API to get catalogs
      const response = await fetch(`${host}/api/2.1/unity-catalog/catalogs`, {
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch catalogs: ${response.status}`);
      }

      const data = await response.json();
      res.json({ catalogs: data.catalogs || [] });
      return;
    }

    const userToken = getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks REST API to get catalogs
    const response = await fetch(`${host}/api/2.1/unity-catalog/catalogs`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch catalogs: ${response.status}`);
    }

    const data = await response.json();
    res.json({ catalogs: data.catalogs || [] });
  } catch (error) {
    console.error('Failed to fetch catalogs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch catalogs',
      message: error.message 
    });
  }
});

app.get('/api/unity-catalog/schemas', async (req, res) => {
  try {
    const { catalog_name } = req.query;
    
    if (!catalog_name) {
      return res.status(400).json({ error: 'catalog_name parameter is required' });
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
      
      // Use Databricks REST API to get schemas
      const response = await fetch(`${host}/api/2.1/unity-catalog/schemas?catalog_name=${catalog_name}`, {
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schemas: ${response.status}`);
      }

      const data = await response.json();
      res.json({ schemas: data.schemas || [] });
      return;
    }

    // Databricks Apps - use forwarded user token
    const userToken = getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks REST API to get schemas
    const response = await fetch(`${host}/api/2.1/unity-catalog/schemas?catalog_name=${catalog_name}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schemas: ${response.status}`);
    }

    const data = await response.json();
    res.json({ schemas: data.schemas || [] });
  } catch (error) {
    console.error('Failed to fetch schemas:', error);
    res.status(500).json({ 
      error: 'Failed to fetch schemas',
      message: error.message 
    });
  }
});

app.get('/api/unity-catalog/tables', async (req, res) => {
  try {
    const { catalog_name, schema_name } = req.query;
    
    if (!catalog_name || !schema_name) {
      return res.status(400).json({ error: 'Both catalog_name and schema_name parameters are required' });
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
      
      // Use Databricks REST API to get tables
      const response = await fetch(`${host}/api/2.1/unity-catalog/tables?catalog_name=${catalog_name}&schema_name=${schema_name}`, {
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tables: ${response.status}`);
      }

      const data = await response.json();
      res.json({ tables: data.tables || [] });
      return;
    }

    const userToken = getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks REST API to get tables
    const response = await fetch(`${host}/api/2.1/unity-catalog/tables?catalog_name=${catalog_name}&schema_name=${schema_name}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.status}`);
    }

    const data = await response.json();
    res.json({ tables: data.tables || [] });
  } catch (error) {
    console.error('Failed to fetch tables:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tables',
      message: error.message 
    });
  }
});

app.get('/api/unity-catalog/columns', async (req, res) => {
  try {
    const { catalog_name, schema_name, table_name } = req.query;
    
    if (!catalog_name || !schema_name || !table_name) {
      return res.status(400).json({ error: 'catalog_name, schema_name, and table_name parameters are required' });
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
      
      // Use Databricks REST API to get table metadata
      const response = await fetch(`${host}/api/2.1/unity-catalog/tables/${catalog_name}.${schema_name}.${table_name}`, {
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch table metadata: ${response.status}`);
      }

      const table = await response.json();
      console.log(`📊 Table metadata for ${catalog_name}.${schema_name}.${table_name}:`, JSON.stringify(table, null, 2));
      
      // Extract columns from the table schema
      let columns = [];
      
      // Try different possible locations for column information
      if (table.schema && table.schema.fields) {
        // Standard schema format
        columns = table.schema.fields.map(field => ({
          name: field.name,
          type_text: field.type,
          comment: field.metadata?.comment || field.comment || ''
        }));
      } else if (table.columns) {
        // Direct columns array
        columns = table.columns.map(col => ({
          name: col.name,
          type_text: col.type || col.type_text,
          comment: col.comment || ''
        }));
      } else if (table.storage_properties && table.storage_properties.columns) {
        // Storage properties columns
        columns = table.storage_properties.columns.map(col => ({
          name: col.name,
          type_text: col.type || col.type_text,
          comment: col.comment || ''
        }));
      } else if (table.data_schema && table.data_schema.fields) {
        // Data schema format
        columns = table.data_schema.fields.map(field => ({
          name: field.name,
          type_text: field.type,
          comment: field.metadata?.comment || field.comment || ''
        }));
      }
      
      console.log(`📋 Extracted ${columns.length} columns from table metadata`);
      
      res.json({ columns: columns });
      return;
    }

    const userToken = getUserToken(req);
    const host = getDatabricksHost();
    
    // Use Databricks REST API to get columns
    const response = await fetch(`${host}/api/2.1/unity-catalog/tables/${catalog_name}.${schema_name}.${table_name}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch table metadata: ${response.status}`);
    }

    const table = await response.json();
    console.log(`📊 Table metadata for ${catalog_name}.${schema_name}.${table_name}:`, JSON.stringify(table, null, 2));
    
    // Extract columns from the table schema
    let columns = [];
    
    // Try different possible locations for column information
    if (table.schema && table.schema.fields) {
      // Standard schema format
      columns = table.schema.fields.map(field => ({
        name: field.name,
        type_text: field.type,
        comment: field.metadata?.comment || field.comment || ''
      }));
    } else if (table.columns) {
      // Direct columns array
      columns = table.columns.map(col => ({
        name: col.name,
        type_text: col.type || col.type_text,
        comment: col.comment || ''
      }));
    } else if (table.storage_properties && table.storage_properties.columns) {
      // Storage properties columns
      columns = table.storage_properties.columns.map(col => ({
        name: col.name,
        type_text: col.type || col.type_text,
        comment: col.comment || ''
      }));
    } else if (table.data_schema && table.data_schema.fields) {
      // Data schema format
      columns = table.data_schema.fields.map(field => ({
        name: field.name,
        type_text: field.type,
        comment: field.metadata?.comment || field.comment || ''
      }));
    }
    
    console.log(`📋 Extracted ${columns.length} columns from table metadata`);
    
    res.json({ columns: columns });
  } catch (error) {
    console.error('Failed to fetch columns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch columns',
      message: error.message 
    });
  }
});

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

    const userToken = getUserToken(req);
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

    const userToken = getUserToken(req);
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
