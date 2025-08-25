import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import axios from 'axios';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment validation
function validateEnv() {
  const REQUIRED = ['NODE_ENV'];
  const DATABRICKS_REQUIRED = ['DATABRICKS_HOST', 'DATABRICKS_TOKEN'];
  
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  
  // Check Databricks env if not explicitly skipped
  if (process.env.FEATURE_ALLOW_NO_DBRX !== '1') {
    const missingDatabricks = DATABRICKS_REQUIRED.filter(k => !process.env[k]);
    if (missingDatabricks.length) {
      console.warn(`Warning: Missing Databricks env vars: ${missingDatabricks.join(', ')}. Set FEATURE_ALLOW_NO_DBRX=1 to skip.`);
    }
  }
}

// Validate environment on startup
validateEnv();

const app = express();
const PORT = process.env.PORT || process.env.DATABRICKS_APP_PORT || 3000;
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
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Monaco editor needs unsafe-eval
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Request logging
app.use(logger);

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
    // Check Databricks connectivity if configured
    if (process.env.DATABRICKS_HOST && process.env.DATABRICKS_TOKEN) {
      const client = axios.create({
        baseURL: `${process.env.DATABRICKS_HOST}/api`,
        headers: { Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 5000,
      });
      
      // Simple connectivity check
      await client.get('/2.0/clusters/list');
    }
    
    return res.json({ ready: true, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('Readiness check failed:', e.message);
    return res.status(503).json({ 
      ready: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Databricks whoami endpoint for smoke testing
router.get('/api/whoami', async (req, res) => {
  try {
    if (!process.env.DATABRICKS_HOST || !process.env.DATABRICKS_TOKEN) {
      if (process.env.FEATURE_ALLOW_NO_DBRX === '1') {
        return res.status(200).json({ ok: true, skipped: true, message: 'Databricks client not configured' });
      }
      return res.status(500).json({ ok: false, error: 'DATABRICKS_HOST and DATABRICKS_TOKEN are required' });
    }
    
    const client = axios.create({
      baseURL: `${process.env.DATABRICKS_HOST}/api`,
      headers: { Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 15000,
    });
    
    const response = await client.get('/2.0/preview/scim/v2/Me');
    res.json({ ok: true, me: response.data });
  } catch (e) {
    console.error('Databricks whoami failed:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// API endpoint to get environment configuration for client
router.get('/api/config', (req, res) => {
  res.json({
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID,
    host: process.env.DATABRICKS_HOST,
    basePath: APP_BASE_PATH
  });
});

// Warehouse status endpoint for better error handling
router.get('/api/warehouse/status', async (req, res) => {
  try {
    if (!process.env.DATABRICKS_HOST || !process.env.DATABRICKS_WAREHOUSE_ID) {
      return res.status(400).json({ 
        error: 'Warehouse not configured',
        message: 'DATABRICKS_HOST and DATABRICKS_WAREHOUSE_ID are required'
      });
    }

    const client = axios.create({
      baseURL: `${process.env.DATABRICKS_HOST}/api`,
      headers: { Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}` },
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
    const client = axios.create({
      baseURL: `${process.env.DATABRICKS_HOST}/api`,
      headers: { Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 15000,
    });
    
    const response = await client.post('/2.0/sql/statements', {
      statement: 'SELECT 1 as test, current_timestamp() as now',
      warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
      wait_timeout: '10s',
      disposition: 'EXTERNAL_LINKS'
    });

    if (response.data.status?.state === 'SUCCEEDED') {
      res.json({
        success: true,
        message: 'SQL warehouse is ready and responsive',
        result: response.data.result
      });
    } else {
      res.json({
        success: false,
        message: `Query state: ${response.data.status?.state || 'UNKNOWN'}`,
        status: response.data.status
      });
    }
  } catch (error) {
    const errorData = error.response?.data;
    if (errorData?.error_code === 'DEADLINE_EXCEEDED') {
      res.json({
        success: false,
        message: '⏳ Warehouse is still warming up - complex queries may timeout',
        error: 'DEADLINE_EXCEEDED'
      });
    } else {
      res.json({
        success: false,
        message: `SQL test failed: ${errorData?.error_code || error.message}`,
        error: errorData?.error_code || 'UNKNOWN'
      });
    }
  }
});

// Direct SQL endpoint to bypass proxy issues
router.post('/api/databricks/2.0/sql/statements', async (req, res) => {
  // Normalize and validate incoming payload
  const startTime = Date.now();
  const incoming = req.body || {};

  // Clamp wait_timeout to Databricks allowed range (0 or 5s..50s); default 30s
  const clampWaitTimeout = (val) => {
    if (!val) return '30s';
    // expect format like '30s'
    const m = String(val).match(/^(\d+)s$/);
    if (!m) return '30s';
    const n = parseInt(m[1], 10);
    if (n === 0) return '0s';
    const clamped = Math.max(5, Math.min(50, n));
    return `${clamped}s`;
  };

  const payload = {
    statement: incoming.statement,
    warehouse_id: incoming.warehouse_id || process.env.DATABRICKS_WAREHOUSE_ID,
    wait_timeout: clampWaitTimeout(incoming.wait_timeout),
    disposition: incoming.disposition || 'EXTERNAL_LINKS'
  };

  // Basic validation
  if (!payload.statement || !payload.warehouse_id) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'statement and warehouse_id are required'
    });
  }

  // Support cancellation if client disconnects
  const controller = new AbortController();
  req.on('aborted', () => controller.abort());

  try {
    console.log('[DIRECT] SQL statement request:', payload.statement.substring(0, 120) + (payload.statement.length > 120 ? '…' : ''));

    const response = await axios.post(
      `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000, // 2 minutes
        signal: controller.signal
      }
    );

    const elapsedMs = Date.now() - startTime;
    const dbReqId = response?.headers?.['x-request-id'] || response?.data?.status?.request_id;
    console.log('[DIRECT] SQL response status:', response.status, 'elapsedMs:', elapsedMs, 'requestId:', dbReqId || 'n/a');
    // If result is not immediately available, poll the statement endpoint until ready
    let data = response.data || {};
    const statementId = data?.statement_id || data?.status?.statement_id || data?.statement?.statement_id;
    const fetchStatement = async (id) => {
      const pollRes = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements/${id}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          params: { wait_timeout: '30s' },
          timeout: 120000
        }
      );
      return pollRes.data;
    };

    if (!data.result && statementId) {
      console.log('[DIRECT] Polling for statement result:', statementId);
      const maxAttempts = 4; // up to ~2 minutes combined with server timeouts
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const polled = await fetchStatement(statementId);
        if (polled?.result) { data = polled; break; }
        const stateVal = polled?.status?.state;
        if (stateVal === 'FAILED' || stateVal === 'CANCELED') {
          data = polled; break;
        }
      }
    }

    // If result uses EXTERNAL_LINKS, fetch chunks server-side and attach data_array
    const result = data.result || {};
    if (!result.data_array && result.external_links) {
      try {
        // Recursively collect any http(s) URLs from the external_links object
        const collectUrls = (node) => {
          const urls = [];
          const visit = (v) => {
            if (!v) return;
            if (typeof v === 'string') {
              if (/^https?:\/\//.test(v)) urls.push(v);
            } else if (Array.isArray(v)) {
              v.forEach(visit);
            } else if (typeof v === 'object') {
              Object.values(v).forEach(visit);
            }
          };
        visit(node);
          return urls;
        };

        const chunkUrls = collectUrls(result.external_links);
        const chunkResponses = await Promise.all(
          chunkUrls.map((url) => axios.get(url, { timeout: 120000 }))
        );
        const combinedRows = [];
        for (const resp of chunkResponses) {
          // Normalize rows regardless of format
          let arr = resp.data?.data_array || resp.data?.data || [];
          if (Array.isArray(resp.data?.chunks)) {
            for (const ch of resp.data.chunks) {
              if (Array.isArray(ch?.data_array)) combinedRows.push(...ch.data_array);
            }
          }
          if (Array.isArray(arr)) combinedRows.push(...arr);
        }
        data.result = { ...result, data_array: combinedRows };
      } catch (e) {
        console.warn('[DIRECT] Failed to fetch external chunks:', e.message);
      }
    }
    // Return possibly-enriched response
    res.json(data);
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    const status = error.response?.status || 500;
    const data = error.response?.data;
    const dbReqId = error.response?.headers?.['x-request-id'] || data?.details?.find?.(d => d['@type']?.includes('RequestInfo'))?.request_id;
    if (error.name === 'AbortError') {
      console.warn('[DIRECT] SQL request aborted by client. elapsedMs:', elapsedMs);
      return res.status(499).json({ ok: false, code: 'CLIENT_ABORT', message: 'Request was cancelled by the client' });
    }
    console.error('[DIRECT] SQL error:', status, data || error.message, 'elapsedMs:', elapsedMs, 'requestId:', dbReqId || 'n/a');

    // Forward Databricks error body if present; otherwise send normalized error
    if (error.response?.data) {
      return res.status(status).json(error.response.data);
    }
    return res.status(500).json({ ok: false, code: 'REQUEST_FAILED', message: error.message });
  }
});

// API proxy for other Databricks calls (Unity Catalog, etc.)
router.use('/api/databricks', createProxyMiddleware({
  target: process.env.DATABRICKS_HOST || 'https://dbc-00000000-0000.cloud.databricks.com',
  changeOrigin: true,
  timeout: 120000, // 2 minutes for SQL queries
  proxyTimeout: 120000, // 2 minutes for proxy itself
  pathRewrite: {
    '^/api/databricks/2.0': '/api/2.0',
    '^/api/databricks': '/api/2.1'
  },
  headers: {
    'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[PROXY] Error for ${req.path}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error', message: err.message });
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
  
  if (process.env.DATABRICKS_HOST) {
    console.log(`Databricks host: ${process.env.DATABRICKS_HOST}`);
  } else {
    console.log('Databricks host: not configured');
  }
});