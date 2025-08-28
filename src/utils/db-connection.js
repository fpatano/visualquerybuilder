/**
 * Database connection utilities for Visual SQL Query Builder
 * Uses @databricks/sql client with proper authentication
 */

import { DBSQLClient } from '@databricks/sql';
import { getUserToken, getDatabricksHost, getDatabricksHttpPath } from './auth-utils.js';

/**
 * Create a new Databricks SQL connection using user-specific authentication
 */
export async function createConnection(req) {
  try {
    const userToken = getUserToken(req);
    const host = getDatabricksHost();
    const path = getDatabricksHttpPath();
    
    console.log(`🔌 Creating connection to ${host}${path}`);
    
    const client = new DBSQLClient();
    
    const connection = await client.connect({
      authType: 'access-token',
      host: host,
      path: path,
      token: userToken,
      // Additional connection options for better reliability
      socketTimeout: 30000, // 30 seconds
      keepAlive: true,
      keepAliveInitialDelay: 10000, // 10 seconds
    });
    
    console.log('✅ Database connection established successfully');
    return connection;
  } catch (error) {
    console.error('❌ Failed to create database connection:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Execute a SQL query using user-specific authentication
 */
export async function executeQuery(req, sql, options = {}) {
  const connection = await createConnection(req);
  
  try {
    console.log(`🔍 Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    
    const cursor = await connection.cursor(sql);
    const rows = [];
    
    // Fetch all rows
    for await (const row of cursor) {
      rows.push(row);
    }
    
    await cursor.close();
    console.log(`✅ Query executed successfully, returned ${rows.length} rows`);
    
    return {
      success: true,
      rows: rows,
      rowCount: rows.length,
      executionTime: Date.now() // You can enhance this with actual timing
    };
  } catch (error) {
    console.error('❌ Query execution failed:', error.message);
    throw new Error(`Query execution failed: ${error.message}`);
  } finally {
    await connection.close();
  }
}

/**
 * Test database connectivity
 */
export async function testConnection(req) {
  try {
    const result = await executeQuery(req, 'SELECT 1 as test, current_timestamp() as now');
    return {
      success: true,
      message: 'Database connection test successful',
      result: result.rows
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database connection test failed',
      error: error.message
    };
  }
}

/**
 * Get connection info for debugging (without sensitive data)
 */
export function getConnectionInfo() {
  return {
    host: getDatabricksHost(),
    path: getDatabricksHttpPath(),
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID,
    environment: process.env.DATABRICKS_SERVER_HOSTNAME ? 'Databricks Apps' : 'Local Development'
  };
}
