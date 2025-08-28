import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import axios from 'axios';
import { getUserToken, isDatabricksApps, getDatabricksHost, validateAuthEnvironment, logAuthEnvironment } from './src/utils/auth-utils.js';
import { createConnection, executeQuery, testConnection, getConnectionInfo } from './src/utils/db-connection.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment validation
function validateEnv() {
  const REQUIRED = ['NODE_ENV'];
  
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  
  // Log environment variables for debugging
  console.log('🔍 Environment Variables:');
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  - DATABRICKS_SERVER_HOSTNAME: ${process.env.DATABRICKS_SERVER_HOSTNAME || 'NOT SET'}`);
  console.log(`  - DATABRICKS_WAREHOUSE_ID: ${process.env.DATABRICKS_WAREHOUSE_ID || 'NOT SET'}`);
  console.log(`  - DATABRICKS_APP_PORT: ${process.env.DATABRICKS_APP_PORT || 'NOT SET'}`);
  console.log(`  - DATABRICKS_HTTP_PATH: ${process.env.DATABRICKS_HTTP_PATH || 'NOT SET'}`);
  
  // Validate authentication environment
  try {
    validateAuthEnvironment();
  } catch (error) {
    if (process.env.FEATURE_ALLOW_NO_DBRX !== '1') {
      console.error(`❌ Authentication environment validation failed: ${error.message}`);
      console.error('❌ This will cause API calls to fail. Check your app.yaml configuration.');
      throw error;
    }
    console.warn(`Warning: Authentication environment validation failed: ${error.message}. Set FEATURE_ALLOW_NO_DBRX=1 to skip.`);
  }
}

// Validate environment on startup
validateEnv();

const app = express();
const PORT = process.env.DATABRICKS_APP_PORT || process.env.PORT || 3000;
const APP_BASE_PATH = process.env.APP_BASE_PATH || '/';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Configure logging with redaction
const logger = pinoHttp({
  level: LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization', 
      'req.headers.cookie', 
      'headers.authorization', 
      'headers.cookie'
    ],
    remove: true
  }
});

// Trust proxy for Databricks deployment
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://r2cdn.perplexity.ai", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"], // Monaco editor needs unsafe-eval
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      workerSrc: ["'self'", "blob:"], // Allow Monaco Editor web workers
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Request logging
app.use(logger);

// Databricks Apps detection middleware
app.use((req, res, next) => {
  // Check for Databricks Apps headers
  const hasForwardedToken = !!req.header('x-forwarded-access-token');
  const hasForwardedEmail = !!req.header('x-forwarded-email');
  const hasDatabricksHeaders = hasForwardedToken || hasForwardedEmail;
  
  console.log('🔍 Request Headers Analysis:');
  console.log(`  - x-forwarded-access-token: ${hasForwardedToken ? '✅ present' : '❌ missing'}`);
  console.log(`  - x-forwarded-email: ${hasForwardedEmail ? '✅ present' : '❌ missing'}`);
  console.log(`  - Databricks Apps headers: ${hasDatabricksHeaders ? '✅ detected' : '❌ not detected'}`);
  
  // Set environment context for this request
  req.isDatabricksApps = hasDatabricksHeaders;
  
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS if needed
if (process.env.CORS_ORIGIN) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Create router for base path mounting
const router = express.Router();

// Health endpoint - required for Databricks Apps
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Readiness endpoint - required for Databricks Apps
router.get('/ready', async (req, res) => {
  if (process.env.FEATURE_SKIP_READINESS === '1') {
    return res.status(200).json({ ready: true, skipped: true });
  }
  
  try {
    // Test database connectivity using user authentication
    const connectionTest = await testConnection(req);
    
    if (connectionTest.success) {
      return res.json({ 
        ready: true, 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      return res.status(503).json({ 
        ready: false, 
        error: connectionTest.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('Readiness check failed:', e.message);
    return res.status(503).json({ 
      ready: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

// User authentication info endpoint
router.get('/api/whoami', async (req, res) => {
  try {
    // Get user token (this will throw if not available)
    const userToken = getUserToken(req);
    
    // Get connection info for debugging
    const connectionInfo = getConnectionInfo();
    
    res.json({ 
      ok: true, 
      authenticated: true,
      environment: connectionInfo.environment,
      host: connectionInfo.host,
      warehouseId: connectionInfo.warehouseId,
      tokenSource: isDatabricksApps() ? 'x-forwarded-access-token' : 'DATABRICKS_TOKEN env var'
    });
  } catch (e) {
    console.error('Authentication check failed:', e.message);
    res.status(401).json({ 
      ok: false, 
      authenticated: false,
      error: e.message 
    });
  }
});

// API endpoint to get environment configuration for client
router.get('/api/config', (req, res) => {
  res.json({
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID,
    host: getDatabricksHost(),
    basePath: APP_BASE_PATH,
    environment: isDatabricksApps() ? 'Databricks Apps' : 'Local Development'
  });
});

// Debug endpoint to show all environment variables (for troubleshooting)
router.get('/api/debug/env', (req, res) => {
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABRICKS_SERVER_HOSTNAME: process.env.DATABRICKS_SERVER_HOSTNAME,
    DATABRICKS_WAREHOUSE_ID: process.env.DATABRICKS_WAREHOUSE_ID,
    DATABRICKS_APP_PORT: process.env.DATABRICKS_APP_PORT,
    APP_BASE_PATH: process.env.APP_BASE_PATH,
    DATABRICKS_HOST: process.env.DATABRICKS_HOST,
    isDatabricksApps: isDatabricksApps(),
    requestHeaders: req.headers,
    requestIsDatabricksApps: req.isDatabricksApps,
    timestamp: new Date().toISOString()
  };
  
  console.log('🔍 Environment Debug Info:', envInfo);
  res.json(envInfo);
});

// Simple test endpoint
router.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isDatabricksApps: isDatabricksApps(),
    requestHeaders: Object.keys(req.headers),
    requestIsDatabricksApps: req.isDatabricksApps,
    databricksHost: getDatabricksHost(),
    serverHostname: process.env.DATABRICKS_SERVER_HOSTNAME,
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID
  });
});

// New endpoint to demonstrate user-specific database operations
router.post('/api/query', async (req, res) => {
  try {
    const { sql } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        error: 'SQL query is required',
        message: 'Please provide a SQL query in the request body'
      });
    }

    console.log(`🔍 User query request: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);

    // Execute query using user authentication
    const result = await executeQuery(req, sql);
    
    res.json({
      success: true,
      data: result.rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime
    });
  } catch (error) {
    console.error('❌ Query execution failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      message: error.message
    });
  }
});

// Warehouse status endpoint for better error handling
router.get('/api/warehouse/status', async (req, res) => {
  try {
    // Get user token for authentication
    const userToken = getUserToken(req);
    const host = getDatabricksHost();
    
    const client = axios.create({
      baseURL: `${host}/api`,
      headers: { Authorization: `Bearer ${userToken}` },
      timeout: 10000,
    });
    
    const response = await client.get(`/2.0/sql/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`);
    const { state, health } = response.data;
    
    res.json({
      state: state,
      health: health?.status || 'UNKNOWN',
      ready: state === 'RUNNING' && health?.status === 'HEALTHY',
      message: state === 'STOPPED' ? 'Warehouse is stopped - queries will fail until started' :
               state === 'STARTING' ? 'Warehouse is starting up - queries may timeout temporarily' :
               state === 'RUNNING' ? 'Warehouse is ready for queries' : 
               `Warehouse state: ${state}`
    });
  } catch (error) {
    console.error('Failed to check warehouse status:', error.message);
    res.status(500).json({ 
      error: 'Failed to check warehouse status',
      message: error.message,
      ready: false
    });
  }
});

// Quick SQL test endpoint to verify warehouse readiness
router.post('/api/warehouse/test', async (req, res) => {
  try {
    // Test database connectivity using user authentication
    const connectionTest = await testConnection(req);
    
    if (connectionTest.success) {
      res.json({
        success: true,
        message: 'SQL warehouse is ready and responsive',
        result: connectionTest.result
      });
    } else {
      res.json({
        success: false,
        message: 'SQL test failed',
        error: connectionTest.error
      });
    }
  } catch (error) {
    console.error('Warehouse test failed:', error.message);
    res.json({
      success: false,
      message: `SQL test failed: ${error.message}`,
      error: 'CONNECTION_FAILED'
    });
  }
});

// Direct SQL endpoint using user authentication
router.post('/api/databricks/2.0/sql/statements', async (req, res) => {
  try {
    const incoming = req.body || {};
    
    if (!incoming.statement) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_REQUEST',
        message: 'statement is required'
      });
    }

    console.log('[DIRECT] SQL statement request:', incoming.statement.substring(0, 120) + (incoming.statement.length > 120 ? '…' : ''));

    // Execute query using user authentication
    const result = await executeQuery(req, incoming.statement);
    
    res.json({
      ok: true,
      status: { state: 'SUCCEEDED' },
      result: {
        data_array: result.rows,
        row_count: result.rowCount
      }
    });
  } catch (error) {
    console.error('[DIRECT] SQL error:', error.message);
    res.status(500).json({ 
      ok: false, 
      code: 'REQUEST_FAILED', 
      message: error.message 
    });
  }
});

// API proxy for other Databricks calls (Unity Catalog, etc.)
router.use('/api/databricks', createProxyMiddleware({
  target: `https://${getDatabricksHost() || process.env.DATABRICKS_SERVER_HOSTNAME}`,
  changeOrigin: true,
  secure: true,
  timeout: 120000, // 2 minutes for SQL queries
  proxyTimeout: 120000, // 2 minutes for proxy itself
  pathRewrite: {
    '^/api/databricks/2.0': '/api/2.0',
    '^/api/databricks/2.1': '/api/2.1',
    '^/api/databricks/unity-catalog': '/api/2.1/unity-catalog',
    '^/api/databricks': '/api/2.1'
  },
  onProxyReq: (proxyReq, req, res) => {
    try {
      const targetHost = getDatabricksHost() || process.env.DATABRICKS_SERVER_HOSTNAME;
      // Build full target URL for easier debug output
      const resolvedTarget = `https://${targetHost}`;

      // Read user token forwarded by Databricks Apps
      const forwardedToken = req.header('x-forwarded-access-token');
      const authHeaderPresent = !!forwardedToken;

      // REQUIRED: We must have the forwarded token for every upstream request when running as an App
      if (!authHeaderPresent) {
        console.error(`[PROXY] Missing x-forwarded-access-token for request ${req.method} ${req.path}`);
        if (!res.headersSent) {
          return res.status(401).json({
            ok: false,
            error: 'FORWARDED_TOKEN_MISSING',
            message: 'Databricks Apps did not forward a user access token. Ensure the app is installed and the \"sql\" scope is enabled.'
          });
        }
        return;
      }

      // Inject Authorization header for Databricks API
      proxyReq.setHeader('Authorization', `Bearer ${forwardedToken}`);

      // Verification logging (one line per upstream call)
      console.log(`[PROXY VERIFY] → ${resolvedTarget}  |  Auth header present: ${authHeaderPresent}`);

      // Forward possible organisation header for completeness
      const orgId = req.header('x-databricks-org-id');
      if (orgId) {
        proxyReq.setHeader('x-databricks-org-id', orgId);
      }
    } catch (error) {
      console.error(`[PROXY] Authentication failed for ${req.path}:`, error.message);
      
      // Return a proper error response instead of letting the proxy crash
      if (!res.headersSent) {
        res.status(401).json({ 
          error: 'Authentication failed', 
          message: error.message,
          details: {
            hasForwardedToken: !!req.header('x-forwarded-access-token'),
            requestHeaders: Object.keys(req.headers),
            environment: process.env.NODE_ENV
          }
        });
      }
      return;
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.path}`);
    if (proxyRes.statusCode >= 400) {
      console.error(`[PROXY] Error response ${proxyRes.statusCode} for ${req.path}`);
    }
  },
  onError: (err, req, res) => {
    console.error(`[PROXY] Error for ${req.path}:`, err.message);
    console.error(`[PROXY] Error stack:`, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Proxy error', 
        message: err.message,
        details: {
          isDatabricksApps: isDatabricksApps(),
          requestHeaders: Object.keys(req.headers),
          environment: process.env.NODE_ENV
        }
      });
    }
  }
}));

// Serve static files from the dist directory with base path consideration
if (APP_BASE_PATH === '/') {
  router.use(express.static(path.join(__dirname, 'dist')));
} else {
  router.use(express.static(path.join(__dirname, 'dist')));
}

// Handle client-side routing - must be last
router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Mount router on base path
app.use(APP_BASE_PATH, router);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Visual SQL Query Builder running on port ${PORT}`);
  console.log(`Base path: ${APP_BASE_PATH}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Log level: ${LOG_LEVEL}`);
  
  // Log authentication environment info
  try {
    logAuthEnvironment();
  } catch (error) {
    console.log('⚠️  Authentication environment not fully configured:', error.message);
  }
});