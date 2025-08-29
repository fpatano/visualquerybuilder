/**
 * SQL Transpiler - Main orchestrator for the enhanced SQL ↔ Visual transpilation system
 * 
 * This is the primary interface that provides high-level functions for bidirectional SQL ↔ Canvas conversion
 * using the new enhanced parser with best practices and improved performance
 */

// Enhanced parser exports
export { EnhancedSQLParser, parseSQL, generateSQL } from './enhanced-parser';
export type { 
  EnhancedParseResult, 
  ParseError, 
  ParseWarning, 
  ParseMetadata, 
  ParserOptions 
} from './enhanced-parser';

// AST parser exports
export { default as ASTParser } from './ast-parser';
export type { ASTParseContext, ASTParseResult } from './ast-parser';

// SQL generator exports
export { SQLGenerator, generateSQLWithMetadata } from './sql-generator';
export type { SQLGenerationOptions, SQLGenerationResult } from './sql-generator';

// Legacy exports for backward compatibility
export { RobustSQLParser, parseSQL as parseRobustSQL, generateSQL as generateRobustSQL } from './robust-parser';
export type { QueryState } from '../../types';

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
 * Main SQL Transpiler Class (Enhanced Version)
 * Orchestrates the entire SQL ↔ Visual conversion pipeline using EnhancedSQLParser
 */
export class SQLTranspiler {
  private parser: EnhancedSQLParser;
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
    this.parser = new EnhancedSQLParser({ 
      debugMode: this.debugMode,
      logLevel: this.debugMode ? 'debug' : 'warn'
    });
  }

  /**
   * Convert SQL string to Visual Canvas State
   */
  async sqlToCanvas(sql: string, existingCanvasState?: Partial<QueryState>): Promise<TranspilerResult<Partial<QueryState>>> {
    const startTime = Date.now();
    this.log('🔄 Starting enhanced SQL → Canvas transpilation');
    
    try {
      const result = this.parser.parseSQL(sql);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          errors: result.errors.map(e => e.message),
          warnings: result.warnings.map(w => w.message),
          debugInfo: this.debugMode ? { sql, duration: Date.now() - startTime } : undefined
        };
      }

      const duration = Date.now() - startTime;
      this.log(`✅ Enhanced SQL → Canvas transpilation complete in ${duration}ms`);

      return {
        success: true,
        data: result.data,
        errors: [],
        warnings: result.warnings.map(w => w.message),
        debugInfo: this.debugMode ? { 
          duration, 
          canvasState: result.data,
          metadata: result.metadata,
          tableCount: result.data.tables?.length || 0,
          joinCount: result.data.joins?.length || 0
        } : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ Enhanced SQL → Canvas transpilation failed in ${duration}ms:`, error);
      
      return {
        success: false,
        errors: [`Enhanced transpilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
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
    this.log('🔄 Starting enhanced Canvas → SQL transpilation');
    
    try {
      const result = this.parser.generateSQL(canvasState);
      
      if (!result.success || !result.sql) {
        return {
          success: false,
          errors: result.errors.map(e => e.message),
          warnings: [],
          debugInfo: this.debugMode ? { canvasState, duration: Date.now() - startTime } : undefined
        };
      }

      const duration = Date.now() - startTime;
      this.log(`✅ Enhanced Canvas → SQL transpilation complete in ${duration}ms`);

      return {
        success: true,
        data: result.sql,
        errors: [],
        warnings: [],
        debugInfo: this.debugMode ? { 
          duration, 
          sql: result.sql,
          tableCount: canvasState.tables.length,
          joinCount: canvasState.joins.length
        } : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ Enhanced Canvas → SQL transpilation failed in ${duration}ms:`, error);
      
      return {
        success: false,
        errors: [`Enhanced generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
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
    this.log('🔄 Starting enhanced round-trip validation');
    
    try {
      const result = await this.parser.validateRoundTrip(originalSQL);
      
      return {
        success: result.success,
        data: result.success ? {
          isEquivalent: result.isEquivalent,
          newSQL: result.newSQL || '',
          differences: result.differences
        } : undefined,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      };

    } catch (error) {
      this.log(`❌ Enhanced round-trip validation failed:`, error);
      
      return {
        success: false,
        errors: [`Enhanced round-trip validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
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
      cacheSize: number;
      cacheHitRate: number;
    };
    dialect: string;
    version: string;
  } {
    return this.parser.getCapabilities();
  }

  /**
   * Update transpiler configuration
   */
  updateOptions(newOptions: Partial<TranspilerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.debugMode = this.options.debugMode || false;
    
    // Update parser options
    this.parser.updateOptions({
      debugMode: this.debugMode,
      logLevel: this.debugMode ? 'debug' : 'warn'
    });
  }

  // Private helper methods

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[EnhancedSQLTranspiler]', ...args);
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
  
  console.warn('Enhanced SQL parsing failed:', result.errors);
  return null;
}

export function generateSQL(queryState: QueryState, options?: TranspilerOptions): string {
  const transpiler = new SQLTranspiler(options);
  const result = transpiler.canvasToSQL(queryState);
  
  if (result.success && result.data) {
    return result.data;
  }
  
  console.warn('Enhanced SQL generation failed:', result.errors);
  return '-- Enhanced SQL generation failed';
}

// Export everything for advanced usage
export * from './robust-parser';
export { SQLTranspiler as default };
