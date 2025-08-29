import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health endpoint - required for Databricks Apps
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Readiness endpoint - required for Databricks Apps
app.get('/ready', (req, res) => {
  res.json({ 
    ready: true, 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    app: 'Visual SQL Query Builder',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    port: PORT,
    databricksHost: process.env.DATABRICKS_SERVER_HOSTNAME,
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID
  });
});

// API endpoints
app.get('/api/warehouse/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Warehouse connection test endpoint',
    timestamp: new Date().toISOString()
  });
});

// Unity Catalog API endpoints
app.get('/api/unity-catalog/catalogs', (req, res) => {
  // Mock response for now - you'll need to implement actual Databricks API calls
  res.json({
    catalogs: [
      { name: 'default', comment: 'Default catalog' },
      { name: 'hive_metastore', comment: 'Hive metastore catalog' }
    ]
  });
});

app.get('/api/unity-catalog/schemas', (req, res) => {
  const { catalog_name } = req.query;
  res.json({
    schemas: [
      { name: 'default', comment: 'Default schema' },
      { name: 'information_schema', comment: 'Information schema' }
    ]
  });
});

app.get('/api/unity-catalog/tables', (req, res) => {
  const { catalog_name, schema_name } = req.query;
  res.json({
    tables: [
      { name: 'sample_table', comment: 'Sample table' }
    ]
  });
});

app.get('/api/unity-catalog/columns', (req, res) => {
  const { catalog_name, schema_name, table_name } = req.query;
  res.json({
    columns: [
      { name: 'id', type_text: 'INT', comment: 'Primary key' },
      { name: 'name', type_text: 'STRING', comment: 'Name field' }
    ]
  });
});

// Serve the React app for all other routes (SPA routing) - Updated for Databricks Apps deployment
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
