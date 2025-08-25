/**
 * SQL Transpiler - Main orchestrator for the robust SQL ↔ Visual transpilation system
 * 
 * This is the primary interface that replaces the old regex-based parsing system
 * Provides high-level functions for bidirectional SQL ↔ Canvas conversion
 */

import { RobustSQLParser, parseSQL as parseRobustSQL, generateSQL as generateRobustSQL } from './robust-parser';
import type { QueryState } from '../../types';

export interface TranspilerOptions {
  preserveUserPositions?: boolean;
  enableColumnFetching?: boolean;
  debugMode?: boolean;
}

export interface TranspilerResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  debugInfo?: any;
}

/**
 * Main SQL Transpiler Class
 * Orchestrates the entire SQL ↔ Visual conversion pipeline using RobustSQLParser
 */
export class SQLTranspiler {
  private parser: RobustSQLParser;
  private options: TranspilerOptions;
  private debugMode: boolean;

  constructor(options: TranspilerOptions = {}) {
    this.options = {
      preserveUserPositions: true,
      enableColumnFetching: true,
      debugMode: false,
      ...options
    };
    this.debugMode = this.options.debugMode || false;
    this.parser = new RobustSQLParser({ debugMode: this.debugMode });
  }

  /**
   * Convert SQL string to Visual Canvas State
   */
  async sqlToCanvas(sql: string, existingCanvasState?: Partial<QueryState>): Promise<TranspilerResult<Partial<QueryState>>> {
    const startTime = Date.now();
    this.log('🔄 Starting SQL → Canvas transpilation');
    
    try {
      const result = this.parser.parseSQL(sql);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          errors: result.errors,
          warnings: result.warnings,
          debugInfo: this.debugMode ? { sql, duration: Date.now() - startTime } : undefined
        };
      }

      const duration = Date.now() - startTime;
      this.log(`✅ SQL → Canvas transpilation complete in ${duration}ms`);

      return {
        success: true,
        data: result.data,
        errors: result.errors,
        warnings: result.warnings,
        debugInfo: this.debugMode ? { 
          duration, 
          canvasState: result.data,
          tableCount: result.data.tables?.length || 0,
          joinCount: result.data.joins?.length || 0
        } : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ SQL → Canvas transpilation failed in ${duration}ms:`, error);
      
      return {
        success: false,
        errors: [`Transpilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        debugInfo: this.debugMode ? { 
          duration, 
          error: error instanceof Error ? error.stack : error,
          sql 
        } : undefined
      };
    }
  }

  /**
   * Convert Visual Canvas State to SQL string
   */
  canvasToSQL(canvasState: QueryState): TranspilerResult<string> {
    const startTime = Date.now();
    this.log('🔄 Starting Canvas → SQL transpilation');
    
    try {
      const result = this.parser.generateSQL(canvasState);
      
      if (!result.success || !result.sql) {
        return {
          success: false,
          errors: result.errors,
          warnings: result.warnings,
          debugInfo: this.debugMode ? { canvasState, duration: Date.now() - startTime } : undefined
        };
      }

      const duration = Date.now() - startTime;
      this.log(`✅ Canvas → SQL transpilation complete in ${duration}ms`);

      return {
        success: true,
        data: result.sql,
        errors: result.errors,
        warnings: result.warnings,
        debugInfo: this.debugMode ? { 
          duration, 
          sql: result.sql,
          tableCount: canvasState.tables.length,
          joinCount: canvasState.joins.length
        } : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ Canvas → SQL transpilation failed in ${duration}ms:`, error);
      
      return {
        success: false,
        errors: [`Transpilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        debugInfo: this.debugMode ? { 
          duration, 
          error: error instanceof Error ? error.stack : error,
          canvasState 
        } : undefined
      };
    }
  }

  /**
   * Round-trip validation: SQL → Canvas → SQL
   * Ensures transpilation fidelity
   */
  async validateRoundTrip(originalSQL: string): Promise<TranspilerResult<{ isEquivalent: boolean; newSQL: string; differences: string[] }>> {
    this.log('🔄 Starting round-trip validation');
    
    try {
      const result = await this.parser.validateRoundTrip(originalSQL);
      
      return {
        success: result.success,
        data: result.success ? {
          isEquivalent: result.isEquivalent,
          newSQL: result.newSQL || '',
          differences: result.differences
        } : undefined,
        errors: result.errors,
        warnings: []
      };

    } catch (error) {
      this.log(`❌ Round-trip validation failed:`, error);
      
      return {
        success: false,
        errors: [`Round-trip validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Get transpiler capabilities and feature support
   */
  getCapabilities(): {
    supportedFeatures: string[];
    partialSupport: string[];
    notSupported: string[];
    performance: {
      maxRecommendedQueryLength: number;
      typicalParseTime: string;
      maxTables: number;
      maxJoins: number;
    };
  } {
    return {
      supportedFeatures: [
        'SELECT with columns, aliases, expressions',
        'FROM with table references and aliases',
        'All JOIN types (INNER, LEFT, RIGHT, FULL, CROSS)',
        'WHERE clauses with complex conditions',
        'GROUP BY and HAVING',
        'ORDER BY with multiple columns',
        'LIMIT and OFFSET',
        'Basic subqueries in WHERE',
        'Common Table Expressions (CTEs)',
        'Window functions (basic)',
        'CASE expressions',
        'Functions and aggregations'
      ],
      partialSupport: [
        'Complex nested subqueries',
        'UNION/INTERSECT/EXCEPT',
        'Advanced window functions',
        'Stored procedure calls'
      ],
      notSupported: [
        'DDL statements (CREATE, ALTER, DROP)',
        'DML statements (INSERT, UPDATE, DELETE)',
        'Stored procedure definitions',
        'Advanced Databricks-specific syntax'
      ],
      performance: {
        maxRecommendedQueryLength: 10000, // characters
        typicalParseTime: '< 100ms',
        maxTables: 20,
        maxJoins: 15
      }
    };
  }

  /**
   * Update transpiler configuration
   */
  updateOptions(newOptions: Partial<TranspilerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.debugMode = this.options.debugMode || false;
  }

  // Private helper methods

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[SQLTranspiler]', ...args);
    }
  }
}

// Export convenience functions for backward compatibility
export async function transpileSQL(sql: string, options?: TranspilerOptions): Promise<Partial<QueryState> | null> {
  const transpiler = new SQLTranspiler(options);
  const result = await transpiler.sqlToCanvas(sql);
  
  if (result.success && result.data) {
    return result.data;
  }
  
  console.warn('SQL parsing failed:', result.errors);
  return null;
}

export function generateSQL(queryState: QueryState, options?: TranspilerOptions): string {
  const transpiler = new SQLTranspiler(options);
  const result = transpiler.canvasToSQL(queryState);
  
  if (result.success && result.data) {
    return result.data;
  }
  
  console.warn('SQL generation failed:', result.errors);
  return '-- SQL generation failed';
}

// Export everything for advanced usage
export * from './robust-parser';
export { SQLTranspiler as default };
