import express from 'express';

const app = express();
const PORT = Number(process.env.PORT || process.env.DATABRICKS_APP_PORT || 8000);

// Trust proxy for Databricks deployment
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Visual SQL Query Builder is running',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Start server - bind to platform port correctly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Visual SQL Query Builder running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Databricks Host: ${process.env.DATABRICKS_SERVER_HOSTNAME || 'Not set'}`);
  console.log(`Warehouse ID: ${process.env.DATABRICKS_WAREHOUSE_ID || 'Not set'}`);
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
