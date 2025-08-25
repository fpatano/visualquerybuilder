/**
 * Simple, Working SQL Parser
 * 
 * Focuses on the specific SQL patterns used in your example
 * Much more reliable than the complex AST approach
 */

import type { QueryState, TableNode, JoinRelation, SelectColumn } from '../../types';

export interface SimpleParsedSQL {
  tables: TableNode[];
  joins: JoinRelation[];
  selectedColumns: SelectColumn[];
  selectClause: string;
  fromClause: string;
  whereClause?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Simple SQL Parser that handles your specific use case
 */
export class SimpleSQLParser {
  parse(sql: string): SimpleParsedSQL {
    const result: SimpleParsedSQL = {
      tables: [],
      joins: [],
      selectedColumns: [],
      selectClause: '',
      fromClause: '',
      errors: [],
      warnings: []
    };

    try {
      console.log('🔍 Parsing SQL with Simple Parser:', sql.substring(0, 100));

      // Clean and normalize SQL
      const cleanSQL = this.cleanSQL(sql);
      
      // Extract main clauses
      const clauses = this.extractClauses(cleanSQL);
      
      // Parse each clause
      result.selectClause = clauses.select;
      result.fromClause = clauses.from;
      result.whereClause = clauses.where;
      
      // Parse tables and joins from FROM clause
      this.parseFromClause(clauses.from, result);
      
      // Parse SELECT columns
      this.parseSelectClause(clauses.select, result);
      
      console.log('✅ Simple parsing complete:', {
        tables: result.tables.length,
        joins: result.joins.length,
        columns: result.selectedColumns.length
      });

    } catch (error) {
      result.errors.push(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Simple parser failed:', error);
    }

    return result;
  }

  private cleanSQL(sql: string): string {
    return sql
      .replace(/--[^\n]*/g, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractClauses(sql: string): { select: string; from: string; where?: string; groupBy?: string; orderBy?: string } {
    const clauses: any = {};
    
    // Split by major keywords (case insensitive)
    const parts = sql.split(/\b(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT)\b/i);
    
    let currentClause = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (/^(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT)$/i.test(part)) {
        currentClause = part.toLowerCase().replace(/\s+/g, '');
      } else if (currentClause && part) {
        clauses[currentClause] = (clauses[currentClause] || '') + part;
      }
    }

    return clauses;
  }

  private parseFromClause(fromClause: string, result: SimpleParsedSQL): void {
    if (!fromClause) return;

    // Pattern for your specific SQL: catalog.schema.table AS alias
    const tablePattern = /(\w+)\.(\w+)\.(\w+)\s+AS\s+(\w+)/gi;
    
    // Find main table (first one)
    const mainTableMatch = tablePattern.exec(fromClause);
    if (mainTableMatch) {
      const [, catalog, schema, tableName, alias] = mainTableMatch;
      result.tables.push({
        id: alias,
        name: tableName,
        schema,
        catalog,
        columns: [],
        position: { x: 200, y: 200 }
      });
    }

    // Reset regex for join parsing
    tablePattern.lastIndex = 0;

    // Find joins: INNER JOIN catalog.schema.table AS alias ON condition
    const joinPattern = /(INNER|LEFT|RIGHT|FULL)\s+JOIN\s+(\w+)\.(\w+)\.(\w+)\s+AS\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
    
    let joinMatch;
    let joinIndex = 0;
    while ((joinMatch = joinPattern.exec(fromClause)) !== null) {
      const [, joinType, catalog, schema, tableName, alias, leftTable, leftColumn, rightTable, rightColumn] = joinMatch;
      
      // Add joined table
      result.tables.push({
        id: alias,
        name: tableName,
        schema,
        catalog,
        columns: [],
        position: { x: 550 + (joinIndex * 300), y: 200 }
      });

      // Add join relationship
      result.joins.push({
        id: `${leftTable}.${leftColumn}__${rightTable}.${rightColumn}`,
        sourceTable: leftTable,
        targetTable: rightTable,
        sourceColumn: leftColumn,
        targetColumn: rightColumn,
        joinType: joinType.toUpperCase() as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
      });

      joinIndex++;
    }
  }

  private parseSelectClause(selectClause: string, result: SimpleParsedSQL): void {
    if (!selectClause) return;

    // Handle different SELECT patterns
    if (selectClause.includes('*')) {
      // Pattern: table.* or just *
      const wildcardPattern = /(\w+)\.\*/g;
      let match;
      while ((match = wildcardPattern.exec(selectClause)) !== null) {
        const [, tableName] = match;
        // For wildcard, we'll let the UI handle column expansion
        result.selectedColumns.push({
          id: `${tableName}.*`,
          table: tableName,
          column: '*'
        });
      }
      
      if (!selectClause.includes('.')) {
        // Just * - select all from first table
        if (result.tables.length > 0) {
          result.selectedColumns.push({
            id: `${result.tables[0].id}.*`,
            table: result.tables[0].id,
            column: '*'
          });
        }
      }
    } else {
      // Pattern: table.column, table.column AS alias, etc.
      const columnPattern = /(\w+)\.(\w+)(?:\s+AS\s+(\w+))?/gi;
      let match;
      while ((match = columnPattern.exec(selectClause)) !== null) {
        const [, tableName, columnName, alias] = match;
        result.selectedColumns.push({
          id: `${tableName}.${columnName}`,
          table: tableName,
          column: columnName,
          alias
        });
      }
    }
  }
}

/**
 * Simple parsing function that works reliably
 */
export function parseSQLSimple(sql: string): Partial<QueryState> {
  const parser = new SimpleSQLParser();
  const result = parser.parse(sql);
  
  if (result.errors.length > 0) {
    console.warn('Simple parser encountered errors:', result.errors);
  }
  
  return {
    tables: result.tables,
    joins: result.joins,
    selectedColumns: result.selectedColumns,
    filters: [],
    aggregations: [],
    groupByColumns: [],
    orderByColumns: []
  };
}
